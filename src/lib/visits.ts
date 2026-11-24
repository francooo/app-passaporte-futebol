import "server-only";
import { and, asc, count, desc, eq, inArray, max, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import sharp from "sharp";
import type { FanStats, MeProfile, TeamRef, VisitDetail, VisitList, VisitPhoto, VisitResultState, VisitSummary } from "@shared/api-types";
import { PHOTO_LIMITS, type predictionSchema, type resultSchema, type visitSchema } from "@shared/schemas";
import { predictionError, scoreError, SPORTS, type Sport } from "@shared/sports";
import type { z } from "zod";
import { db } from "@/db";
import { moderationLog, stadiums, teams, users, visitPhotos, visits } from "@/db/schema";
import { hitRateLimit, toApiUser } from "@/lib/auth-core";
import { commonsThumb } from "@/lib/catalog/rules";
import { USER_AGENT } from "@/lib/catalog/wikidata";
import { apiFootballEnabled } from "@/lib/matches/api-football";
import { getMatch } from "@/lib/matches/queries";
import { resolvePendingResultsQuickly } from "@/lib/results/resolve";
import { expectedEndAt, isFinalStatus, needsManualResult, predictionOutcome, toScore, type ResultProvider } from "@/lib/results/rules";
import { computeStats, type StatVisit } from "@/lib/stats";

/**
 * Registros do torcedor (visitas e partidas), fotos, estatísticas e perfil.
 * Usado pelas rotas /api/* (web e mobile) e pelos Server Components do web.
 */

type VisitData = z.output<typeof visitSchema>;

export class VisitError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 413,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

const homeTeam = alias(teams, "home_team");
const awayTeam = alias(teams, "away_team");

const photoUrl = (id: string, thumb = false) => `/api/media/${id}${thumb ? "?tamanho=thumb" : ""}`;

type TeamCols = { id: string | null; name: string | null; shortName: string | null; crestUrl: string | null };
const teamRef = (t: TeamCols | null): TeamRef | null =>
  t?.id && t.name ? { id: t.id, name: t.shortName ?? t.name, crestUrl: t.crestUrl } : null;

const dateString = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const summaryColumns = {
  id: visits.id,
  kind: visits.kind,
  sport: visits.sport,
  date: visits.date,
  homeScore: visits.homeScore,
  awayScore: visits.awayScore,
  predictedHomeScore: visits.predictedHomeScore,
  predictedAwayScore: visits.predictedAwayScore,
  resultStatus: visits.resultStatus,
  resultSource: visits.resultSource,
  kickoffAt: visits.kickoffAt,
  externalFixtureId: visits.externalFixtureId,
  competition: visits.competition,
  note: visits.note,
  matchId: visits.matchId,
  createdAt: visits.createdAt,
  stadium: {
    id: stadiums.id,
    name: stadiums.name,
    city: stadiums.city,
    state: stadiums.state,
    country: stadiums.country,
    photoUrl: stadiums.photoUrl,
    lat: stadiums.lat,
    lng: stadiums.lng,
    capacity: sql<number | null>`coalesce(${stadiums.capacityOverride}, ${stadiums.capacity})`,
  },
  home: { id: homeTeam.id, name: homeTeam.name, shortName: homeTeam.shortName, crestUrl: homeTeam.crestUrl },
  away: { id: awayTeam.id, name: awayTeam.name, shortName: awayTeam.shortName, crestUrl: awayTeam.crestUrl },
};

function baseQuery() {
  return db
    .select(summaryColumns)
    .from(visits)
    .innerJoin(stadiums, eq(stadiums.id, visits.stadiumId))
    .leftJoin(homeTeam, eq(homeTeam.id, visits.homeTeamId))
    .leftJoin(awayTeam, eq(awayTeam.id, visits.awayTeamId));
}

type Row = Awaited<ReturnType<typeof baseQuery>>[number];

/** Situação do resultado para as telas: pendente (com o fim previsto) ou final. */
function resultState(r: Row): VisitResultState | null {
  if (r.kind !== "match") return null;
  const pending = r.resultStatus === "pending";
  // Busca automática: partida importada, ou futebol manual com a API-Football ligada
  const automatic = Boolean(r.matchId || r.externalFixtureId || (r.sport === "futebol" && apiFootballEnabled()));
  return {
    status: pending ? "pending" : "final",
    source: (r.resultSource as VisitResultState["source"]) ?? null,
    expectedEndAt: r.kickoffAt ? expectedEndAt(r.kickoffAt, r.sport).toISOString() : null,
    needsManual: pending && (!automatic || needsManualResult(r.kickoffAt, undefined, r.sport)),
  };
}

function toSummary(r: Row): VisitSummary {
  const prediction = toScore(r.predictedHomeScore, r.predictedAwayScore);
  return {
    id: r.id,
    kind: r.kind,
    sport: r.sport,
    date: dateString(r.date),
    stadium: {
      id: r.stadium.id,
      name: r.stadium.name,
      city: r.stadium.city || null,
      state: r.stadium.state,
      country: r.stadium.country,
      thumbUrl: commonsThumb(r.stadium.photoUrl, 330),
    },
    home: teamRef(r.home),
    away: teamRef(r.away),
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    competition: r.competition,
    prediction,
    result: resultState(r),
    predictionOutcome: predictionOutcome(prediction, toScore(r.homeScore, r.awayScore)),
  };
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export type VisitFilters = { kind?: "visit" | "match" | null; year?: number | null; competition?: string | null; sport?: Sport | null };

export async function listVisits(userId: string, filters: VisitFilters = {}): Promise<VisitList> {
  // Jogos que já terminaram: busca o resultado antes de mostrar (com tempo limitado)
  await resolvePendingResultsQuickly(userId);
  const where = and(
    eq(visits.userId, userId),
    filters.kind ? eq(visits.kind, filters.kind) : undefined,
    filters.year ? sql`extract(year from ${visits.date}) = ${filters.year}` : undefined,
    filters.competition ? eq(visits.competition, filters.competition) : undefined,
    filters.sport ? eq(visits.sport, filters.sport) : undefined,
  );

  const [rows, [totals], years, comps, sports] = await Promise.all([
    baseQuery().where(where).orderBy(sql`${visits.date} desc nulls last`, desc(visits.createdAt)),
    db
      .select({ stamps: count(), stadiums: sql<number>`count(distinct ${visits.stadiumId})::int` })
      .from(visits)
      .where(eq(visits.userId, userId)),
    db
      .selectDistinct({ year: sql<number>`extract(year from ${visits.date})::int` })
      .from(visits)
      .where(and(eq(visits.userId, userId), sql`${visits.date} is not null`)),
    db
      .selectDistinct({ name: visits.competition })
      .from(visits)
      // Competições do esporte escolhido (o filtro de competição segue o de esporte)
      .where(and(eq(visits.userId, userId), sql`${visits.competition} is not null`, filters.sport ? eq(visits.sport, filters.sport) : undefined)),
    db.selectDistinct({ sport: visits.sport }).from(visits).where(eq(visits.userId, userId)),
  ]);

  return {
    items: rows.map(toSummary),
    totals: { stamps: totals.stamps, stadiums: totals.stadiums },
    years: years.map((y) => y.year).sort((a, b) => b - a),
    competitions: comps.map((c) => c.name!).sort((a, b) => a.localeCompare(b, "pt-BR")),
    sports: SPORTS.filter((sport) => sports.some((r) => r.sport === sport)),
  };
}

export async function getVisit(userId: string, id: string): Promise<VisitDetail | null> {
  await resolvePendingResultsQuickly(userId);
  const [row] = await baseQuery()
    .where(and(eq(visits.id, id), eq(visits.userId, userId)))
    .limit(1);
  if (!row) return null;
  const photos = await db
    .select({ id: visitPhotos.id })
    .from(visitPhotos)
    .where(eq(visitPhotos.visitId, id))
    .orderBy(asc(visitPhotos.position));
  return {
    ...toSummary(row),
    note: row.note,
    matchId: row.matchId,
    photos: photos.map((p): VisitPhoto => ({ id: p.id, thumbUrl: photoUrl(p.id, true), url: photoUrl(p.id) })),
  };
}

// ── Escrita ──────────────────────────────────────────────────────────────────

/** Time existente (importado/aprovado ou criado pelo usuário) pelo nome, ou cria um "pending" para moderação. */
async function findOrCreateTeam(name: string, userId: string, country: string, sport: Sport) {
  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        or(
          sql`lower(unaccent(${teams.name})) = lower(unaccent(${name}))`,
          sql`lower(unaccent(coalesce(${teams.shortName}, ''))) = lower(unaccent(${name}))`,
        ),
        or(eq(teams.status, "approved"), eq(teams.createdBy, userId)),
        // "Minas" do vôlei e "Minas" do basquete são times diferentes
        eq(teams.sport, sport),
      ),
    )
    .orderBy(sql`${teams.provider} is null`)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(teams)
    .values({ name, country, sport, kind: "club", status: "pending", createdBy: userId })
    .returning({ id: teams.id });
  await db.insert(moderationLog).values({ kind: "team", targetId: created.id, action: "created", actorId: userId, data: { name, country, sport } });
  return created.id;
}

async function resolveTeam(id: string | null | undefined, name: string | null | undefined, userId: string, country: string, sport: Sport) {
  if (id) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.sport, sport), or(eq(teams.status, "approved"), eq(teams.createdBy, userId))))
      .limit(1);
    if (team) return team.id;
  }
  return name ? findOrCreateTeam(name, userId, country, sport) : null;
}

/** Converte o formulário validado nas colunas do registro (resolve partida, times e estádio). */
async function toColumns(userId: string, input: VisitData) {
  const [stadium] = await db
    .select({ id: stadiums.id, country: stadiums.country })
    .from(stadiums)
    // Aprovado, ou cadastrado pelo próprio usuário (em moderação)
    .where(and(eq(stadiums.id, input.stadiumId), or(eq(stadiums.status, "approved"), and(eq(stadiums.status, "pending"), eq(stadiums.createdBy, userId)))))
    .limit(1);
  if (!stadium) throw new VisitError(400, "Local não encontrado.", "stadiumId");

  const base = {
    stadiumId: stadium.id,
    kind: input.kind,
    sport: input.sport,
    note: input.note ?? null,
    date: input.date ? new Date(`${input.date}T00:00:00Z`) : null,
  };
  const noResult = {
    homeScore: null,
    awayScore: null,
    predictedHomeScore: null,
    predictedAwayScore: null,
    resultStatus: null,
    resultSource: null,
    kickoffAt: null,
    externalFixtureId: null,
    resultCheckedAt: null,
  };
  if (input.kind === "visit") {
    return { ...base, ...noResult, matchId: null, homeTeamId: null, awayTeamId: null, competition: null };
  }
  const prediction = { predictedHomeScore: input.predictedHomeScore ?? null, predictedAwayScore: input.predictedAwayScore ?? null };
  const dayOf = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);

  if (input.matchId) {
    const match = await getMatch(input.matchId);
    if (!match) throw new VisitError(400, "Partida não encontrada.", "matchId");
    const provider = match.provider as ResultProvider;
    const finished = isFinalStatus(provider, match.status) && match.homeScore != null && match.awayScore != null;
    return {
      ...base,
      ...noResult,
      // O esporte vem da partida importada
      sport: match.sport,
      // Sem data informada, vale a data da partida
      date: base.date ?? dayOf(match.utcDate),
      matchId: match.id,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      competition: match.competitionName,
      kickoffAt: match.utcDate,
      // Já encerrada: placar oficial. Ainda não: palpite e resultado depois do jogo.
      ...(finished
        ? { homeScore: match.homeScore, awayScore: match.awayScore, resultStatus: "final", resultSource: provider }
        : { ...prediction, resultStatus: "pending" }),
    };
  }

  const homeTeamId = await resolveTeam(input.homeTeamId, input.homeTeamName, userId, stadium.country, input.sport);
  const awayTeamId = await resolveTeam(input.awayTeamId, input.awayTeamName, userId, stadium.country, input.sport);
  if (homeTeamId && homeTeamId === awayTeamId) throw new VisitError(400, "Mandante e visitante precisam ser diferentes.", "awayTeamName");
  const common = { ...base, ...noResult, matchId: null, homeTeamId, awayTeamId, competition: input.competition ?? null };
  if (input.resultPending) {
    const kickoffAt = input.kickoffAt ? new Date(input.kickoffAt) : new Date();
    return { ...common, ...prediction, date: base.date ?? dayOf(kickoffAt), kickoffAt, resultStatus: "pending" };
  }
  return {
    ...common,
    homeScore: input.homeScore ?? null,
    awayScore: input.awayScore ?? null,
    resultStatus: "final",
    resultSource: "manual",
  };
}

export async function createVisit(userId: string, input: VisitData) {
  const [row] = await db
    .insert(visits)
    .values({ userId, ...(await toColumns(userId, input)) })
    .returning({ id: visits.id });
  return row.id;
}

export async function updateVisit(userId: string, id: string, input: VisitData) {
  const columns = await toColumns(userId, input);
  const [row] = await db
    .update(visits)
    .set(columns)
    .where(and(eq(visits.id, id), eq(visits.userId, userId)))
    .returning({ id: visits.id });
  if (!row) throw new VisitError(404, "Registro não encontrado.");
}

/** Resultado informado à mão: vale sobre a busca automática (que não troca mais). */
export async function setResult(userId: string, id: string, input: z.output<typeof resultSchema>) {
  const sport = await visitSport(userId, id);
  const error = scoreError(sport, input.homeScore, input.awayScore);
  if (error) throw new VisitError(400, error, "homeScore");
  const [row] = await db
    .update(visits)
    .set({ homeScore: input.homeScore, awayScore: input.awayScore, resultStatus: "final", resultSource: "manual" })
    .where(and(eq(visits.id, id), eq(visits.userId, userId), eq(visits.kind, "match")))
    .returning({ id: visits.id });
  if (!row) throw new VisitError(404, "Registro não encontrado.");
}

/** Esporte do carimbo de partida (404 se não for do usuário). */
async function visitSport(userId: string, id: string): Promise<Sport> {
  const [row] = await db
    .select({ sport: visits.sport })
    .from(visits)
    .where(and(eq(visits.id, id), eq(visits.userId, userId), eq(visits.kind, "match")))
    .limit(1);
  if (!row) throw new VisitError(404, "Registro não encontrado.");
  return row.sport;
}

/** Palpite: só enquanto o resultado não sai. */
export async function setPrediction(userId: string, id: string, input: z.output<typeof predictionSchema>) {
  const [current] = await db
    .select({ status: visits.resultStatus, sport: visits.sport })
    .from(visits)
    .where(and(eq(visits.id, id), eq(visits.userId, userId), eq(visits.kind, "match")))
    .limit(1);
  if (!current) throw new VisitError(404, "Registro não encontrado.");
  if (current.status !== "pending") throw new VisitError(400, "O resultado já saiu: o palpite não pode mais mudar.");
  const error = predictionError(current.sport, input.predictedHomeScore, input.predictedAwayScore);
  if (error) throw new VisitError(400, error, "predictedHomeScore");
  await db
    .update(visits)
    .set({ predictedHomeScore: input.predictedHomeScore, predictedAwayScore: input.predictedAwayScore })
    .where(eq(visits.id, id));
}

export async function deleteVisit(userId: string, id: string) {
  const [row] = await db
    .delete(visits)
    .where(and(eq(visits.id, id), eq(visits.userId, userId)))
    .returning({ id: visits.id });
  if (!row) throw new VisitError(404, "Registro não encontrado.");
}

// ── Fotos (guardadas no Neon) ────────────────────────────────────────────────

/** Recebe a foto (já reduzida pelo cliente), gera WebP ~1600 px e miniatura ~400 px e grava. */
export async function addPhoto(userId: string, visitId: string, file: File): Promise<VisitPhoto> {
  const [owned] = await db
    .select({ id: visits.id })
    .from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.userId, userId)))
    .limit(1);
  if (!owned) throw new VisitError(404, "Registro não encontrado.");

  if (!(PHOTO_LIMITS.types as readonly string[]).includes(file.type)) {
    throw new VisitError(400, "Envie fotos JPG, PNG ou WebP.");
  }
  if (file.size > PHOTO_LIMITS.maxUploadBytes) {
    throw new VisitError(413, "Foto muito grande. Tente outra imagem.");
  }

  const [stats] = await db
    .select({ total: count(), last: max(visitPhotos.position) })
    .from(visitPhotos)
    .where(eq(visitPhotos.visitId, visitId));
  if (stats.total >= PHOTO_LIMITS.maxPerVisit) {
    throw new VisitError(400, `Cada registro aceita até ${PHOTO_LIMITS.maxPerVisit} fotos.`);
  }

  let data: Buffer;
  let thumb: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // limitInputPixels evita imagens gigantes; rotate() aplica a orientação EXIF e descarta os metadados (GPS)
    const image = sharp(input, { limitInputPixels: 60_000_000 }).rotate();
    data = await image.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    thumb = await image.clone().resize({ width: 400, height: 400, fit: "cover" }).webp({ quality: 70 }).toBuffer();
  } catch {
    throw new VisitError(400, "Não foi possível ler esta imagem.");
  }

  const [row] = await db
    .insert(visitPhotos)
    .values({ visitId, data, thumb, mime: "image/webp", bytes: data.length, position: (stats.last ?? -1) + 1 })
    .returning({ id: visitPhotos.id });
  return { id: row.id, thumbUrl: photoUrl(row.id, true), url: photoUrl(row.id) };
}

export async function deletePhoto(userId: string, photoId: string) {
  const owned = db
    .select({ id: visits.id })
    .from(visits)
    .where(eq(visits.userId, userId));
  const [row] = await db
    .delete(visitPhotos)
    .where(and(eq(visitPhotos.id, photoId), inArray(visitPhotos.visitId, owned)))
    .returning({ id: visitPhotos.id });
  if (!row) throw new VisitError(404, "Foto não encontrada.");
}

/** Bytes da foto, só para o dono do registro. */
export async function getPhoto(userId: string, photoId: string, size: "thumb" | "full") {
  const [row] = await db
    .select({ data: size === "thumb" ? visitPhotos.thumb : visitPhotos.data, mime: visitPhotos.mime })
    .from(visitPhotos)
    .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
    .where(and(eq(visitPhotos.id, photoId), eq(visits.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ── Estatísticas ─────────────────────────────────────────────────────────────

export async function statsForUser(userId: string, teamId?: string | null): Promise<FanStats> {
  const [user] = await db
    .select({ homeCity: users.homeCity, homeLat: users.homeLat, homeLng: users.homeLng, favoriteTeamId: users.favoriteTeamId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const rows = await baseQuery().where(eq(visits.userId, userId));
  const statVisits: StatVisit[] = rows.map((r) => ({
    kind: r.kind,
    sport: r.sport,
    date: dateString(r.date),
    stadium: {
      id: r.stadium.id,
      name: r.stadium.name,
      city: r.stadium.city || null,
      country: r.stadium.country,
      lat: r.stadium.lat,
      lng: r.stadium.lng,
      capacity: r.stadium.capacity,
      thumbUrl: commonsThumb(r.stadium.photoUrl, 330),
    },
    home: teamRef(r.home),
    away: teamRef(r.away),
    homeScore: r.homeScore,
    awayScore: r.awayScore,
  }));
  const home =
    user?.homeCity && user.homeLat != null && user.homeLng != null
      ? { city: user.homeCity, lat: user.homeLat, lng: user.homeLng }
      : null;
  const outcomes = rows.map((r) => predictionOutcome(toScore(r.predictedHomeScore, r.predictedAwayScore), toScore(r.homeScore, r.awayScore)));
  return {
    ...computeStats(statVisits, { home, teamId: teamId ?? user?.favoriteTeamId ?? null }),
    homeCity: user?.homeCity ?? null,
    predictions: {
      judged: outcomes.filter(Boolean).length,
      exact: outcomes.filter((o) => o === "exact").length,
      winner: outcomes.filter((o) => o === "winner").length,
    },
  };
}

// ── Perfil ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<MeProfile | null> {
  const [row] = await db
    .select({ user: users, team: { id: teams.id, name: teams.name, shortName: teams.shortName, crestUrl: teams.crestUrl } })
    .from(users)
    .leftJoin(teams, eq(teams.id, users.favoriteTeamId))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return { ...toApiUser(row.user), homeCity: row.user.homeCity, favoriteTeam: teamRef(row.team) };
}

type NominatimPlace = {
  lat: string;
  lon: string;
  name?: string;
  address?: Partial<Record<"city" | "town" | "village" | "municipality" | "state" | "country", string>>;
};

/** Cidade → coordenadas (OpenStreetMap/Nominatim, 1 requisição/s; consultada só ao salvar o perfil). */
export async function geocodeCity(query: string) {
  if (!(await hitRateLimit("nominatim:global", 1, 1))) {
    await new Promise((r) => setTimeout(r, 1100));
  }
  const params = new URLSearchParams({ format: "jsonv2", q: query, limit: "1", addressdetails: "1", "accept-language": "pt-BR" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!res?.ok) throw new VisitError(400, "Não foi possível localizar a cidade agora. Tente de novo.", "homeCity");
  const [place] = (await res.json()) as NominatimPlace[];
  if (!place) throw new VisitError(400, "Cidade não encontrada. Tente \"Cidade, Estado\".", "homeCity");
  const a = place.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? place.name ?? query;
  return { city: [city, a.state, a.country].filter(Boolean).join(", "), lat: Number(place.lat), lng: Number(place.lon) };
}

export async function updateProfile(userId: string, input: { homeCity?: string | null; favoriteTeamId?: string | null }) {
  const changes: Partial<typeof users.$inferInsert> = {};
  if (input.homeCity !== undefined) {
    if (input.homeCity) {
      const place = await geocodeCity(input.homeCity);
      Object.assign(changes, { homeCity: place.city, homeLat: place.lat, homeLng: place.lng });
    } else {
      Object.assign(changes, { homeCity: null, homeLat: null, homeLng: null });
    }
  }
  if (input.favoriteTeamId !== undefined) {
    if (input.favoriteTeamId) {
      // Mesma regra de resolveTeam: time aprovado ou criado pelo próprio usuário.
      const [team] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.id, input.favoriteTeamId), or(eq(teams.status, "approved"), eq(teams.createdBy, userId))))
        .limit(1);
      if (!team) throw new VisitError(400, "Time não encontrado.", "favoriteTeamId");
    }
    changes.favoriteTeamId = input.favoriteTeamId ?? null;
  }
  if (Object.keys(changes).length) await db.update(users).set(changes).where(eq(users.id, userId));
  return getProfile(userId);
}

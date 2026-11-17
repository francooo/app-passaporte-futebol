import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { competitions, matches, stadiums, teams } from "@/db/schema";
import { footballData, FootballDataError, type FdTeam } from "./football-data";
import { areaToIso3, findTeamStadium, type CatalogStadium } from "./link";

const PROVIDER = "football-data";

let catalogCache: CatalogStadium[] | null = null;

/** Estádios do catálogo com clubes ou capacidade (candidatos para ligar às partidas). */
async function catalogStadiums() {
  if (catalogCache) return catalogCache;
  const rows = await db
    .select({ id: stadiums.id, name: stadiums.name, country: stadiums.country, capacity: stadiums.capacity, clubs: stadiums.clubs })
    .from(stadiums)
    .where(and(eq(stadiums.status, "approved"), isNotNull(stadiums.capacity)));
  catalogCache = rows.map((r) => ({ ...r, clubs: r.clubs ?? [] }));
  return catalogCache;
}

/** Upsert do time do provedor; devolve o id interno e o estádio ligado. */
async function upsertTeam(t: FdTeam, fallbackCountry: string | null, linked: Map<string, { id: string; stadiumId: string | null }>) {
  const key = String(t.id);
  const cached = linked.get(key);
  if (cached) return cached;

  const country = areaToIso3(t.area?.code) ?? fallbackCountry ?? "WLD";
  const values = {
    name: t.name,
    shortName: t.shortName,
    crestUrl: t.crest,
    venueName: t.venue ?? null,
    country,
    kind: "club" as const,
    status: "approved" as const,
  };
  const [row] = await db
    .insert(teams)
    .values({ ...values, provider: PROVIDER, providerId: key })
    .onConflictDoUpdate({
      target: [teams.provider, teams.providerId],
      // Não apaga o estádio já informado se esta resposta não o trouxer (partidas não trazem venue)
      set: { ...values, venueName: sql`coalesce(${values.venueName}, ${teams.venueName})` },
    })
    .returning({ id: teams.id, venueName: teams.venueName, name: teams.name, shortName: teams.shortName, country: teams.country });

  const stadiumId = findTeamStadium(
    { name: row.name, shortName: row.shortName, venue: row.venueName, country: row.country },
    await catalogStadiums(),
  );
  const result = { id: row.id, stadiumId };
  linked.set(key, result);
  return result;
}

/**
 * Importa uma competição: dados, times (com escudo e estádio) e partidas encerradas
 * da temporada atual e da anterior. Partidas: upsert pelo id do provedor.
 */
export async function syncCompetition(code: string) {
  try {
    const comp = await footballData.competition(code);
    const country = areaToIso3(comp.area?.code);
    await db
      .insert(competitions)
      .values({ code, name: comp.name, country, emblemUrl: comp.emblem })
      .onConflictDoUpdate({ target: competitions.code, set: { name: comp.name, country, emblemUrl: comp.emblem } });

    const currentYear = comp.currentSeason ? Number(comp.currentSeason.startDate.slice(0, 4)) : new Date().getUTCFullYear();
    const linked = new Map<string, { id: string; stadiumId: string | null }>();
    let imported = 0;
    const seasons: number[] = [];

    for (const season of [currentYear, currentYear - 1]) {
      let teamList: FdTeam[];
      try {
        teamList = await footballData.teams(code, season);
      } catch (error) {
        // Temporadas antigas podem não estar liberadas no plano gratuito
        if (error instanceof FootballDataError && (error.status === 403 || error.status === 404)) continue;
        throw error;
      }
      for (const t of teamList) await upsertTeam(t, country, linked);

      const list = await footballData.finishedMatches(code, season);
      for (const m of list) {
        const home = await upsertTeam(m.homeTeam, country, linked);
        const away = await upsertTeam(m.awayTeam, country, linked);
        const values = {
          competitionCode: code,
          utcDate: new Date(m.utcDate),
          status: m.status,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          // Partida no estádio do mandante (o provedor raramente informa o local do jogo)
          stadiumId: home.stadiumId,
        };
        await db
          .insert(matches)
          .values({ ...values, provider: PROVIDER, providerId: String(m.id) })
          .onConflictDoUpdate({ target: [matches.provider, matches.providerId], set: values });
        imported++;
      }
      seasons.push(season);
    }

    await db.update(competitions).set({ lastSyncedAt: new Date(), syncError: null }).where(eq(competitions.code, code));
    return { code, name: comp.name, seasons, matches: imported, teams: linked.size };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .insert(competitions)
      .values({ code, name: code, lastSyncedAt: new Date(), syncError: message.slice(0, 300) })
      .onConflictDoUpdate({ target: competitions.code, set: { lastSyncedAt: new Date(), syncError: message.slice(0, 300) } });
    throw error;
  }
}

/** Competições a atualizar: nunca sincronizadas primeiro, depois as mais antigas. */
export async function competitionsDueForSync(all: readonly string[], limit: number) {
  const known = await db
    .select({ code: competitions.code, at: competitions.lastSyncedAt })
    .from(competitions)
    .orderBy(asc(competitions.lastSyncedAt));
  const synced = new Map(known.map((k) => [k.code, k.at?.getTime() ?? 0]));
  return [...all].sort((a, b) => (synced.get(a) ?? -1) - (synced.get(b) ?? -1)).slice(0, limit);
}

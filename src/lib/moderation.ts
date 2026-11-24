import "server-only";
import { and, asc, count, eq, ne, or, sql } from "drizzle-orm";
import type { ModerationQueue, PendingTeam, PendingVenue } from "@shared/api-types";
import type { moderationTeamSchema, moderationVenueSchema } from "@shared/schemas";
import type { z } from "zod";
import { db } from "@/db";
import { countries, matches, moderationLog, stadiums, teams, users, visits } from "@/db/schema";
import { hasUsefulData } from "@/lib/catalog/filters";
import { VisitError } from "@/lib/visits";
import { nameTokens, rankDuplicates } from "./moderation-rules";

/**
 * Moderação dos cadastros feitos por usuários (locais e times "pending"): aprovar (com correções),
 * mesclar com um cadastro aprovado (os carimbos passam para ele) ou recusar (some para os outros;
 * o autor continua vendo e os carimbos dele continuam funcionando).
 * Usado por /api/moderation/* (web e app) com withModerator.
 */

type VenueAction = z.output<typeof moderationVenueSchema>;
type TeamAction = z.output<typeof moderationTeamSchema>;

export async function moderationQueue(): Promise<ModerationQueue> {
  const [venueRows, teamRows] = await Promise.all([
    db
      .select({
        id: stadiums.id,
        name: stadiums.name,
        city: stadiums.city,
        state: stadiums.state,
        country: stadiums.country,
        sports: stadiums.sports,
        venueType: stadiums.venueType,
        lat: stadiums.lat,
        lng: stadiums.lng,
        createdAt: stadiums.createdAt,
        author: users.name,
        uses: sql<number>`(select count(*)::int from ${visits} v where v.stadium_id = ${stadiums.id})`,
      })
      .from(stadiums)
      .leftJoin(users, eq(users.id, stadiums.createdBy))
      .where(eq(stadiums.status, "pending"))
      .orderBy(asc(stadiums.createdAt)),
    db
      .select({
        id: teams.id,
        name: teams.name,
        shortName: teams.shortName,
        sport: teams.sport,
        crestUrl: teams.crestUrl,
        createdAt: teams.createdAt,
        author: users.name,
        uses: sql<number>`(select count(*)::int from ${visits} v where v.home_team_id = ${teams.id} or v.away_team_id = ${teams.id})`,
      })
      .from(teams)
      .leftJoin(users, eq(users.id, teams.createdBy))
      .where(eq(teams.status, "pending"))
      .orderBy(asc(teams.createdAt)),
  ]);

  const venues: PendingVenue[] = await Promise.all(
    venueRows.map(async (v) => {
      // Aprovados da mesma cidade (sem acentos)
      const sameCity = await db
        .select({ id: stadiums.id, name: stadiums.name, city: stadiums.city })
        .from(stadiums)
        .where(and(eq(stadiums.status, "approved"), sql`lower(unaccent(${stadiums.city})) = lower(unaccent(${v.city}))`))
        .limit(300);
      return { ...v, createdAt: v.createdAt.toISOString(), duplicates: rankDuplicates(v.name, sameCity) };
    }),
  );

  const teamList: PendingTeam[] = await Promise.all(
    teamRows.map(async (t) => {
      const tokens = nameTokens(t.name).slice(0, 3);
      const candidates = tokens.length
        ? await db
            .select({ id: teams.id, name: teams.name, crestUrl: teams.crestUrl })
            .from(teams)
            .where(
              and(
                eq(teams.status, "approved"),
                eq(teams.sport, t.sport),
                or(...tokens.map((tok) => sql`unaccent(${teams.name}) ilike ${`%${tok}%`}`)),
              ),
            )
            .limit(50)
        : [];
      return { ...t, createdAt: t.createdAt.toISOString(), duplicates: rankDuplicates(t.name, candidates) };
    }),
  );

  return { venues, teams: teamList };
}

export async function pendingCount() {
  const [[v], [t]] = await Promise.all([
    db.select({ n: count() }).from(stadiums).where(eq(stadiums.status, "pending")),
    db.select({ n: count() }).from(teams).where(eq(teams.status, "pending")),
  ]);
  return v.n + t.n;
}

async function pendingVenue(id: string) {
  const [row] = await db.select().from(stadiums).where(and(eq(stadiums.id, id), eq(stadiums.status, "pending"))).limit(1);
  if (!row) throw new VisitError(404, "Local não encontrado ou já moderado.");
  return row;
}

async function pendingTeam(id: string) {
  const [row] = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.status, "pending"))).limit(1);
  if (!row) throw new VisitError(404, "Time não encontrado ou já moderado.");
  return row;
}

const log = (kind: "stadium" | "team", targetId: string, action: string, actorId: string, data: Record<string, unknown> = {}) =>
  db.insert(moderationLog).values({ kind, targetId, action, actorId, data });

/** Contagem do país (só locais aprovados com capacidade ou localização), igual ao sync do catálogo. */
async function refreshCountryCount(iso3: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(stadiums)
    .where(and(eq(stadiums.country, iso3), eq(stadiums.status, "approved"), hasUsefulData));
  await db.update(countries).set({ stadiumCount: total }).where(eq(countries.iso3, iso3));
}

export async function moderateVenue(actorId: string, id: string, input: VenueAction) {
  const venue = await pendingVenue(id);

  if (input.action === "approve") {
    const edits = input.edits ?? {};
    await db
      .update(stadiums)
      .set({ ...edits, status: "approved" })
      .where(eq(stadiums.id, id));
    await log("stadium", id, "approved", actorId, { edits });
    await refreshCountryCount(venue.country);
    const lat = edits.lat !== undefined ? edits.lat : venue.lat;
    return { warning: lat == null && venue.capacity == null ? "Aprovado sem localização: o local não aparece nas listas até ganhar uma." : null };
  }

  if (input.action === "reject") {
    await db.update(stadiums).set({ status: "rejected" }).where(eq(stadiums.id, id));
    await log("stadium", id, "rejected", actorId);
    return { warning: null };
  }

  const [target] = await db
    .select({ id: stadiums.id, sports: stadiums.sports })
    .from(stadiums)
    .where(and(eq(stadiums.id, input.targetId), eq(stadiums.status, "approved"), ne(stadiums.id, id)))
    .limit(1);
  if (!target) throw new VisitError(400, "Escolha um local aprovado para mesclar.", "targetId");
  const sports = [...new Set([...target.sports, ...venue.sports])];
  // Uma transação: carimbos, partidas e times passam para o local certo; o duplicado sai
  await db.batch([
    db.update(visits).set({ stadiumId: target.id }).where(eq(visits.stadiumId, id)),
    db.update(matches).set({ stadiumId: target.id }).where(eq(matches.stadiumId, id)),
    db.update(teams).set({ homeStadiumId: target.id }).where(eq(teams.homeStadiumId, id)),
    db.update(stadiums).set({ sports }).where(eq(stadiums.id, target.id)),
    db.delete(stadiums).where(eq(stadiums.id, id)),
    db.insert(moderationLog).values({ kind: "stadium", targetId: id, action: "merged", actorId, data: { into: target.id, name: venue.name } }),
  ]);
  return { warning: null };
}

export async function moderateTeam(actorId: string, id: string, input: TeamAction) {
  const team = await pendingTeam(id);

  if (input.action === "approve") {
    const edits = input.edits ?? {};
    await db
      .update(teams)
      .set({ ...edits, status: "approved" })
      .where(eq(teams.id, id));
    await log("team", id, "approved", actorId, { edits });
    return { warning: null };
  }

  if (input.action === "reject") {
    await db.update(teams).set({ status: "rejected" }).where(eq(teams.id, id));
    await log("team", id, "rejected", actorId);
    return { warning: null };
  }

  const [target] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, input.targetId), eq(teams.status, "approved"), eq(teams.sport, team.sport), ne(teams.id, id)))
    .limit(1);
  if (!target) throw new VisitError(400, "Escolha um time aprovado do mesmo esporte para mesclar.", "targetId");
  await db.batch([
    db.update(visits).set({ homeTeamId: target.id }).where(eq(visits.homeTeamId, id)),
    db.update(visits).set({ awayTeamId: target.id }).where(eq(visits.awayTeamId, id)),
    db.update(users).set({ favoriteTeamId: target.id }).where(eq(users.favoriteTeamId, id)),
    db.update(matches).set({ homeTeamId: target.id }).where(eq(matches.homeTeamId, id)),
    db.update(matches).set({ awayTeamId: target.id }).where(eq(matches.awayTeamId, id)),
    db.delete(teams).where(eq(teams.id, id)),
    db.insert(moderationLog).values({ kind: "team", targetId: id, action: "merged", actorId, data: { into: target.id, name: team.name } }),
  ]);
  return { warning: null };
}

/** Alvos para "Mesclar com outro…": aprovados pelo nome (locais em qualquer cidade; times do mesmo esporte). */
export async function mergeTargets(kind: "venue" | "team", pendingId: string, q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = (col: unknown) => sql`unaccent(${col}) ilike unaccent(${`%${term}%`})`;
  if (kind === "venue") {
    return db
      .select({ id: stadiums.id, name: stadiums.name, city: stadiums.city })
      .from(stadiums)
      .where(and(eq(stadiums.status, "approved"), or(like(stadiums.name), like(stadiums.city))))
      .orderBy(asc(stadiums.name))
      .limit(15);
  }
  const team = await pendingTeam(pendingId);
  return db
    .select({ id: teams.id, name: teams.name, crestUrl: teams.crestUrl })
    .from(teams)
    .where(and(eq(teams.status, "approved"), eq(teams.sport, team.sport), or(like(teams.name), like(teams.shortName))))
    .orderBy(asc(teams.name))
    .limit(15);
}


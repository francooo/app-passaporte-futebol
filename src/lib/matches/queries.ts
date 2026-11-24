import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { CompetitionOption, MatchResult, TeamRef, UpcomingMatch } from "@shared/api-types";
import type { Sport } from "@shared/sports";
import { db } from "@/db";
import { competitions, matches, teams } from "@/db/schema";
import { groupByStadium, UPCOMING_DAYS, UPCOMING_PER_STADIUM, UPCOMING_STATUSES } from "./upcoming";
import { OPEN_MATCH_STATUSES } from "@/lib/results/rules";

/** Jogos ainda não encerrados que entram em "Encontre a partida": começaram há até 6 h ou começam em até 24 h. */
const OPEN_WINDOW_BEFORE_MS = 6 * 60 * 60 * 1000;
const OPEN_WINDOW_AFTER_MS = 24 * 60 * 60 * 1000;

const home = alias(teams, "home_team");
const away = alias(teams, "away_team");

/** ILIKE sem acentos (extensão unaccent: "sao paulo" encontra "São Paulo"). */
export const likeUnaccent = (column: SQL, term: string) =>
  sql`unaccent(${column}) ilike unaccent(${`%${term}%`})`;

const teamMatches = (t: { name: AnyPgColumn; shortName: AnyPgColumn }, term: string) =>
  or(likeUnaccent(sql`${t.name}`, term), likeUnaccent(sql`coalesce(${t.shortName}, '')`, term));

/**
 * Busca de partidas para "Encontre a partida": encerradas e, para o carimbo com palpite, as de hoje/ao vivo.
 * q: "Flamengo x Botafogo" (os dois times, em qualquer ordem) ou um só nome; data: ±3 dias.
 */
export async function searchMatches({
  q,
  competition,
  date,
  stadiumId,
  sport,
  limit = 20,
}: {
  q?: string | null;
  competition?: string | null;
  date?: string | null;
  stadiumId?: string | null;
  sport?: Sport | null;
  limit?: number;
}): Promise<MatchResult[]> {
  const terms = (q ?? "")
    .split(/\s+(?:x|vs\.?|versus|×)\s+|\s*[×]\s*/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 2);

  const now = Date.now();
  const conditions: Array<SQL | undefined> = [
    or(
      eq(matches.status, "FINISHED"),
      and(
        inArray(matches.status, [...OPEN_MATCH_STATUSES]),
        gte(matches.utcDate, new Date(now - OPEN_WINDOW_BEFORE_MS)),
        lte(matches.utcDate, new Date(now + OPEN_WINDOW_AFTER_MS)),
      ),
    ),
  ];
  if (terms.length === 1) conditions.push(or(teamMatches(home, terms[0]), teamMatches(away, terms[0])));
  if (terms.length === 2) {
    const [a, b] = terms;
    conditions.push(
      or(and(teamMatches(home, a), teamMatches(away, b)), and(teamMatches(home, b), teamMatches(away, a))),
    );
  }
  if (competition) conditions.push(eq(matches.competitionCode, competition));
  if (stadiumId) conditions.push(eq(matches.stadiumId, stadiumId));
  if (sport) conditions.push(eq(matches.sport, sport));
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const day = new Date(`${date}T12:00:00Z`).getTime();
    conditions.push(gte(matches.utcDate, new Date(day - 3 * 86_400_000)), lte(matches.utcDate, new Date(day + 3 * 86_400_000)));
  }

  const rows = await db
    .select({
      id: matches.id,
      sport: matches.sport,
      utcDate: matches.utcDate,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      stadiumId: matches.stadiumId,
      competition: { code: competitions.code, name: competitions.name },
      home: { id: home.id, name: home.shortName, fullName: home.name, crestUrl: home.crestUrl },
      away: { id: away.id, name: away.shortName, fullName: away.name, crestUrl: away.crestUrl },
    })
    .from(matches)
    .innerJoin(competitions, eq(competitions.code, matches.competitionCode))
    .innerJoin(home, eq(home.id, matches.homeTeamId))
    .innerJoin(away, eq(away.id, matches.awayTeamId))
    .where(and(...conditions))
    .orderBy(desc(matches.utcDate))
    .limit(limit);

  const team = (t: { id: string; name: string | null; fullName: string; crestUrl: string | null }): TeamRef => ({
    id: t.id,
    name: t.name ?? t.fullName,
    crestUrl: t.crestUrl,
  });
  return rows.map((r) => ({
    id: r.id,
    sport: r.sport,
    utcDate: r.utcDate.toISOString(),
    status: r.status,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    stadiumId: r.stadiumId,
    competition: r.competition,
    home: team(r.home),
    away: team(r.away),
  }));
}

export async function getMatch(id: string) {
  const [row] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  if (!row) return null;
  const [comp] = await db.select({ name: competitions.name }).from(competitions).where(eq(competitions.code, row.competitionCode)).limit(1);
  return { ...row, competitionName: comp?.name ?? row.competitionCode };
}

export async function listCompetitions(sport?: Sport | null): Promise<CompetitionOption[]> {
  return db
    .select({ code: competitions.code, name: competitions.name, emblemUrl: competitions.emblemUrl, sport: competitions.sport })
    .from(competitions)
    .where(
      and(
        sql`${competitions.lastSyncedAt} is not null and ${competitions.syncError} is null`,
        sport ? eq(competitions.sport, sport) : undefined,
      ),
    )
    .orderBy(asc(competitions.name));
}

/** Times para o preenchimento manual: importados (aprovados) + os criados pelo próprio usuário. */
export async function searchTeams(term: string, userId: string | null, limit = 10, sport?: Sport | null): Promise<TeamRef[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const rows = await db
    .select({ id: teams.id, name: teams.name, shortName: teams.shortName, crestUrl: teams.crestUrl })
    .from(teams)
    .where(
      and(
        or(likeUnaccent(sql`${teams.name}`, q), likeUnaccent(sql`coalesce(${teams.shortName}, '')`, q)),
        or(eq(teams.status, "approved"), userId ? eq(teams.createdBy, userId) : undefined),
        sport ? eq(teams.sport, sport) : undefined,
      ),
    )
    .orderBy(sql`${teams.provider} is null`, asc(teams.name))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, name: r.shortName ?? r.name, crestUrl: r.crestUrl }));
}

/**
 * Partidas agendadas nos estádios informados, por data: por padrão os próximos 14 dias e até 3 por estádio
 * (estádios perto); o mapa e a busca pedem 30 dias e 1 jogo (ver NEXT_MATCH_DAYS).
 */
export async function upcomingByStadium(
  stadiumIds: string[],
  { days = UPCOMING_DAYS, perStadium = UPCOMING_PER_STADIUM, now = new Date() } = {},
): Promise<Map<string, UpcomingMatch[]>> {
  if (!stadiumIds.length) return new Map();
  const rows = await db
    .select({
      id: matches.id,
      sport: matches.sport,
      utcDate: matches.utcDate,
      stadiumId: matches.stadiumId,
      competition: { code: competitions.code, name: competitions.name },
      home: { id: home.id, name: home.shortName, fullName: home.name, crestUrl: home.crestUrl },
      away: { id: away.id, name: away.shortName, fullName: away.name, crestUrl: away.crestUrl },
    })
    .from(matches)
    .innerJoin(competitions, eq(competitions.code, matches.competitionCode))
    .innerJoin(home, eq(home.id, matches.homeTeamId))
    .innerJoin(away, eq(away.id, matches.awayTeamId))
    .where(
      and(
        inArray(matches.stadiumId, stadiumIds),
        inArray(matches.status, [...UPCOMING_STATUSES]),
        gte(matches.utcDate, now),
        lte(matches.utcDate, new Date(now.getTime() + days * 86_400_000)),
      ),
    )
    .orderBy(asc(matches.utcDate));

  const team = (t: { id: string; name: string | null; fullName: string; crestUrl: string | null }): TeamRef => ({
    id: t.id,
    name: t.name ?? t.fullName,
    crestUrl: t.crestUrl,
  });
  const groups = groupByStadium(rows.map((r) => ({ ...r, utcDate: r.utcDate.toISOString() })), perStadium);
  return new Map(
    [...groups].map(([stadiumId, list]) => [
      stadiumId,
      list.map((r) => ({ id: r.id, sport: r.sport, utcDate: r.utcDate, competition: r.competition, home: team(r.home), away: team(r.away) })),
    ]),
  );
}

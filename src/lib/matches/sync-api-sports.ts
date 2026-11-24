import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { competitions, matches, stadiums, teams } from "@/db/schema";
import { apiSports } from "./api-sports";
import { API_SPORTS, API_SPORTS_LEAGUES, findVenue, freePlanDays, type ApiSport, type SportGame } from "./api-sports-parse";

/**
 * Jogos de NBB e Superliga (masculina e feminina) de ontem, hoje e amanhã: 1 requisição por dia e esporte
 * (6 no total). Times e partidas: upsert pelo id do provedor; a partida fica no ginásio do mandante
 * (basquete: pelo nome do local informado no jogo; vôlei não informa o local, vale o ginásio já conhecido do time).
 */

type Linked = { id: string; homeStadiumId: string | null };

async function indoorVenues(sport: ApiSport) {
  return db
    .select({ id: stadiums.id, name: stadiums.name })
    .from(stadiums)
    .where(and(eq(stadiums.status, "approved"), eq(stadiums.country, "BRA"), sql`${stadiums.sports} @> array[${sport}]::sport[]`));
}

async function upsertTeam(sport: ApiSport, t: SportGame["home"], cache: Map<string, Linked>): Promise<Linked> {
  const hit = cache.get(t.id);
  if (hit) return hit;
  const provider = API_SPORTS[sport].provider;
  const values = { name: t.name, crestUrl: t.logo, country: "BRA", sport, kind: "club" as const, status: "approved" as const };
  const [row] = await db
    .insert(teams)
    .values({ ...values, provider, providerId: t.id })
    .onConflictDoUpdate({ target: [teams.provider, teams.providerId], set: values })
    .returning({ id: teams.id, homeStadiumId: teams.homeStadiumId });
  cache.set(t.id, row);
  return row;
}

async function upsertGame(sport: ApiSport, code: string, g: SportGame, cache: Map<string, Linked>, venues: Array<{ id: string; name: string }>) {
  const home = await upsertTeam(sport, g.home, cache);
  const away = await upsertTeam(sport, g.away, cache);
  // Local informado no jogo (basquete) ou o ginásio já conhecido do mandante
  const fromVenue = findVenue(g.venue, venues);
  const stadiumId = fromVenue ?? home.homeStadiumId;
  if (fromVenue && !home.homeStadiumId) {
    await db.update(teams).set({ homeStadiumId: fromVenue }).where(and(eq(teams.id, home.id), isNull(teams.homeStadiumId)));
    home.homeStadiumId = fromVenue;
  }
  const values = {
    sport,
    competitionCode: code,
    utcDate: g.utcDate,
    status: g.status,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    stadiumId,
  };
  await db
    .insert(matches)
    .values({ ...values, provider: API_SPORTS[sport].provider, providerId: g.id })
    .onConflictDoUpdate({ target: [matches.provider, matches.providerId], set: values });
}

export async function syncApiSports(now = new Date()) {
  const summary: Array<{ sport: ApiSport; day: string; games?: number; error?: string }> = [];
  for (const sport of ["basquete", "volei"] as const) {
    const leagues = API_SPORTS_LEAGUES.filter((l) => l.sport === sport);
    const venues = await indoorVenues(sport);
    const cache = new Map<string, Linked>();
    const seenLeagues = new Map<number, string | null>();
    for (const day of freePlanDays(now)) {
      try {
        const games = (await apiSports.gamesOn(sport, day)).filter((g) => leagues.some((l) => l.id === g.leagueId));
        for (const g of games) {
          const league = leagues.find((l) => l.id === g.leagueId)!;
          if (!seenLeagues.has(league.id)) {
            await ensureCompetition(sport, league.code, league.name, g.leagueLogo);
            seenLeagues.set(league.id, g.leagueLogo);
          }
          await upsertGame(sport, league.code, g, cache, venues);
        }
        summary.push({ sport, day, games: games.length });
      } catch (error) {
        summary.push({ sport, day, error: (error as Error).message.slice(0, 160) });
      }
    }
  }
  return summary;
}

/** A competição aparece nos filtros só depois do primeiro jogo importado (lastSyncedAt preenchido). */
async function ensureCompetition(sport: ApiSport, code: string, name: string, emblemUrl: string | null) {
  const values = { name, sport, provider: API_SPORTS[sport].provider, country: "BRA", emblemUrl, lastSyncedAt: new Date(), syncError: null };
  await db.insert(competitions).values({ code, ...values }).onConflictDoUpdate({ target: competitions.code, set: values });
}

/**
 * O primeiro carimbo de um jogo em casa ensina o ginásio do time (vôlei não informa o local):
 * só quando o time importado ainda não tem ginásio.
 */
export async function learnHomeVenue(teamId: string | null, stadiumId: string) {
  if (!teamId) return;
  // Só local aprovado (um cadastro pendente não pode aparecer no "próximo jogo" de outros usuários)
  const approved = sql`exists (select 1 from ${stadiums} s where s.id = ${stadiumId} and s.status = 'approved')`;
  const [team] = await db
    .update(teams)
    .set({ homeStadiumId: stadiumId })
    .where(and(eq(teams.id, teamId), isNull(teams.homeStadiumId), sql`${teams.provider} in ('api-basketball', 'api-volleyball')`, approved))
    .returning({ id: teams.id });
  // Jogos já importados do time sem local passam a ficar nesse ginásio
  if (team) await db.update(matches).set({ stadiumId }).where(and(eq(matches.homeTeamId, team.id), isNull(matches.stadiumId)));
}

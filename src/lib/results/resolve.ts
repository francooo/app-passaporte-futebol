import "server-only";
import { and, between, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams, visits } from "@/db/schema";
import { apiFootball, apiFootballEnabled } from "@/lib/matches/api-football";
import { apiSports, apiSportsEnabled } from "@/lib/matches/api-sports";
import type { ApiSport } from "@/lib/matches/api-sports-parse";
import { footballData } from "@/lib/matches/football-data";
import { SPORT_INFO, SPORTS, type Sport } from "@shared/sports";
import { expectedEndAt, GIVE_UP_MS, isFinalStatus, officialFdScore, RECHECK_MS, type ResultProvider, type Score } from "./rules";
import { pickFixture, pickTeam, teamSearchTerm } from "./pick";

/**
 * Busca do resultado dos carimbos "pending" depois do fim previsto do jogo (início + 2 h).
 * Chamada ao abrir o passaporte/carimbo (poucos por vez, só do usuário) e pelo cron diário (todos).
 * Fontes: tabela `matches` (sync do football-data e da API-Sports) → provedor da partida → API-Football (futebol manual).
 * Nunca troca um resultado já final (inclusive o informado à mão).
 */

const FINAL_FD = ["FINISHED", "AWARDED"];

/**
 * Copia o placar das partidas encerradas para os carimbos ligados a elas: fecha os pendentes e corrige
 * os finais que vieram do provedor da partida (ex.: placar refeito sem os pênaltis). Só SQL, sem chamadas externas.
 */
export async function syncResultsFromMatches(userId?: string) {
  const result = await db.execute(sql`
    update ${visits} v
    set home_score = m.home_score, away_score = m.away_score, result_status = 'final', result_source = m.provider
    from ${matches} m
    where v.match_id = m.id
      and m.status in (${sql.join(FINAL_FD.map((s) => sql`${s}`), sql`, `)})
      and m.home_score is not null and m.away_score is not null
      and (v.result_status = 'pending' or (v.result_source = m.provider
           and (v.home_score is distinct from m.home_score or v.away_score is distinct from m.away_score)))
      ${userId ? sql`and v.user_id = ${userId}` : sql``}
  `);
  return result.rowCount ?? 0;
}

type Pending = {
  id: string;
  sport: Sport;
  matchId: string | null;
  externalFixtureId: string | null;
  kickoffAt: Date;
  homeTeamId: string | null;
  awayTeamId: string | null;
};

/** Resolve até `limit` carimbos pendentes que já passaram do fim previsto. Devolve quantos fecharam. */
export async function resolvePendingResults({ userId, limit = 3, now = new Date() }: { userId?: string; limit?: number; now?: Date } = {}) {
  await syncResultsFromMatches(userId);

  // Pré-filtro pelo esporte de jogo mais curto; o fim previsto de cada carimbo é conferido abaixo
  const shortest = Math.min(...SPORTS.map((s) => SPORT_INFO[s].durationMs));
  const ended = new Date(now.getTime() - shortest);
  const rows = await db
    .select({
      id: visits.id,
      sport: visits.sport,
      matchId: visits.matchId,
      externalFixtureId: visits.externalFixtureId,
      kickoffAt: visits.kickoffAt,
      homeTeamId: visits.homeTeamId,
      awayTeamId: visits.awayTeamId,
    })
    .from(visits)
    .where(
      and(
        eq(visits.resultStatus, "pending"),
        lte(visits.kickoffAt, ended),
        sql`${visits.kickoffAt} >= ${new Date(ended.getTime() - GIVE_UP_MS)}`,
        or(isNull(visits.resultCheckedAt), lte(visits.resultCheckedAt, new Date(now.getTime() - RECHECK_MS))),
        userId ? eq(visits.userId, userId) : undefined,
      ),
    )
    .orderBy(visits.kickoffAt)
    .limit(limit);
  // kickoffAt não é nulo aqui (filtro lte acima)
  const due: Pending[] = rows
    .map((r) => ({ ...r, kickoffAt: r.kickoffAt! }))
    .filter((r) => expectedEndAt(r.kickoffAt, r.sport).getTime() <= now.getTime());
  if (!due.length) return 0;

  // Marca a tentativa antes das chamadas: aberturas simultâneas não repetem a busca
  await db.update(visits).set({ resultCheckedAt: now }).where(inArray(visits.id, due.map((v) => v.id)));

  let closed = 0;
  for (const v of due) {
    try {
      const done = v.matchId ? await resolveFromMatch(v) : await resolveManual(v);
      if (done) closed++;
    } catch (error) {
      console.error(`[resultado] carimbo ${v.id}:`, error instanceof Error ? error.message : error);
    }
  }
  return closed;
}

async function setFinal(visitId: string, score: Score, source: ResultProvider) {
  await db
    .update(visits)
    .set({ homeScore: score.home, awayScore: score.away, resultStatus: "final", resultSource: source })
    .where(and(eq(visits.id, visitId), eq(visits.resultStatus, "pending")));
}

/** Partida escolhida em "Encontre a partida": atualiza a partida pelo provedor dela e copia o placar. */
async function resolveFromMatch(v: Pending) {
  const [match] = await db.select().from(matches).where(eq(matches.id, v.matchId!)).limit(1);
  if (!match) return false;
  if (match.provider === "api-basketball" || match.provider === "api-volleyball") return resolveFromApiSports(v, match);
  if (match.provider !== "football-data") return false;

  let { status, homeScore, awayScore, utcDate } = match;
  if (!FINAL_FD.includes(status)) {
    const fresh = await footballData.match(match.providerId);
    const score = officialFdScore(fresh.score);
    ({ status } = fresh);
    homeScore = score.home;
    awayScore = score.away;
    utcDate = new Date(fresh.utcDate);
    await db.update(matches).set({ status, homeScore, awayScore, utcDate }).where(eq(matches.id, match.id));
  }

  if (isFinalStatus("football-data", status) && homeScore != null && awayScore != null) {
    await setFinal(v.id, { home: homeScore, away: awayScore }, "football-data");
    return true;
  }
  // Remarcada: o carimbo passa a esperar o novo horário
  if (utcDate.getTime() !== v.kickoffAt.getTime()) {
    await db.update(visits).set({ kickoffAt: utcDate }).where(eq(visits.id, v.id));
  }
  return false;
}

const AF_DATE_WINDOW_MS = 30 * 60 * 60 * 1000;

/** Preenchimento manual: futebol pela API-Football; vôlei e basquete pela partida importada (NBB, Superliga). */
async function resolveManual(v: Pending) {
  if (v.sport === "futebol") return resolveFromApiFootball(v);
  if (v.sport === "volei" || v.sport === "basquete") return linkImportedMatch(v);
  return false;
}

const LINK_WINDOW_MS = 30 * 60 * 60 * 1000;

/** Acha a partida importada com os mesmos times perto do horário informado e liga o carimbo a ela. */
async function linkImportedMatch(v: Pending) {
  if (!v.homeTeamId || !v.awayTeamId) return false;
  const [match] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.sport, v.sport),
        eq(matches.homeTeamId, v.homeTeamId),
        eq(matches.awayTeamId, v.awayTeamId),
        between(matches.utcDate, new Date(v.kickoffAt.getTime() - LINK_WINDOW_MS), new Date(v.kickoffAt.getTime() + LINK_WINDOW_MS)),
      ),
    )
    .limit(1);
  if (!match) return false;
  await db.update(visits).set({ matchId: match.id, kickoffAt: match.utcDate }).where(eq(visits.id, v.id));
  return resolveFromMatch({ ...v, matchId: match.id, kickoffAt: match.utcDate });
}

/** Partida de NBB/Superliga: relê o jogo na API-Sports se ainda não terminou e copia o placar. */
async function resolveFromApiSports(v: Pending, match: typeof matches.$inferSelect) {
  const provider = match.provider as "api-basketball" | "api-volleyball";
  let { status, homeScore, awayScore, utcDate } = match;
  if (!isFinalStatus(provider, status) && apiSportsEnabled()) {
    const fresh = await apiSports.game(match.sport as ApiSport, match.providerId);
    if (fresh) {
      ({ status, homeScore, awayScore, utcDate } = fresh);
      await db.update(matches).set({ status, homeScore, awayScore, utcDate }).where(eq(matches.id, match.id));
    }
  }
  if (isFinalStatus(provider, status) && homeScore != null && awayScore != null) {
    await setFinal(v.id, { home: homeScore, away: awayScore }, provider);
    return true;
  }
  if (utcDate.getTime() !== v.kickoffAt.getTime()) {
    await db.update(visits).set({ kickoffAt: utcDate }).where(eq(visits.id, v.id));
  }
  return false;
}

/** Preenchimento manual de futebol: acha o jogo na API-Football (time + dia) e lê o placar. */
async function resolveFromApiFootball(v: Pending) {
  if (!apiFootballEnabled() || !v.homeTeamId) return false;

  let fixtureId = v.externalFixtureId;
  // O plano gratuito só busca jogos por data entre ontem e amanhã: depois disso, nem tenta (poupa a cota)
  if (!fixtureId && Date.now() - v.kickoffAt.getTime() > AF_DATE_WINDOW_MS) return false;
  if (!fixtureId) {
    const teamIds = [v.homeTeamId, v.awayTeamId].filter((id): id is string => Boolean(id));
    const local = await db
      .select({ id: teams.id, name: teams.name, shortName: teams.shortName, apiFootballId: teams.apiFootballId })
      .from(teams)
      .where(inArray(teams.id, teamIds));
    const home = local.find((t) => t.id === v.homeTeamId);
    const away = local.find((t) => t.id === v.awayTeamId) ?? null;
    if (!home) return false;

    const afTeamId = home.apiFootballId ?? (await findApiFootballTeam(home));
    if (!afTeamId) return false;

    const day = v.kickoffAt.toISOString().slice(0, 10);
    const fixture = pickFixture(await apiFootball.fixturesOn(afTeamId, day), away?.shortName ?? away?.name ?? null);
    if (!fixture) return false;
    fixtureId = String(fixture.fixture.id);
    await db
      .update(visits)
      .set({ externalFixtureId: fixtureId, kickoffAt: new Date(fixture.fixture.date) })
      .where(eq(visits.id, v.id));
    return applyFixture(v.id, fixture);
  }

  const fixture = await apiFootball.fixture(fixtureId);
  return fixture ? applyFixture(v.id, fixture) : false;
}

async function applyFixture(visitId: string, f: Awaited<ReturnType<typeof apiFootball.fixture>> & object) {
  const { home, away } = f.goals;
  if (!isFinalStatus("api-football", f.fixture.status.short) || home == null || away == null) return false;
  await setFinal(visitId, { home, away }, "api-football");
  return true;
}

/** Procura o time na API-Football pelo nome e guarda o id (próximas buscas não gastam cota). */
async function findApiFootballTeam(team: { id: string; name: string; shortName: string | null }) {
  const term = teamSearchTerm(team.shortName ?? team.name) ?? teamSearchTerm(team.name);
  if (!term) return null;
  const found = pickTeam([team.name, team.shortName], await apiFootball.searchTeams(term));
  if (!found) return null;
  await db.update(teams).set({ apiFootballId: String(found.id) }).where(eq(teams.id, team.id));
  return String(found.id);
}

/** Limita o tempo de espera de quem abriu a tela; o que não terminar segue na próxima abertura. */
export async function resolvePendingResultsQuickly(userId: string, timeoutMs = 4_000) {
  await Promise.race([
    resolvePendingResults({ userId, limit: 2 }).catch((error) => console.error("[resultado]", error)),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

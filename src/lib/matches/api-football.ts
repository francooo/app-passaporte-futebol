import "server-only";
import { hitRateLimit } from "@/lib/auth-core";

/**
 * Cliente da API-Football v3 (https://www.api-football.com/documentation-v3): 2ª fonte de resultados,
 * para jogos que o football-data.org não cobre (Série B, Copa do Brasil, estaduais…).
 * Plano gratuito: 100 requisições por dia e 10 por minuto. As chamadas são espaçadas e há um teto
 * diário com folga (DAILY_BUDGET). Sem API_FOOTBALL_KEY, fica desligado (apiFootballEnabled).
 */

const BASE = "https://v3.football.api-sports.io";
const MIN_INTERVAL_MS = 6_500;
const DAILY_BUDGET = 90;

export type AfTeam = { id: number; name: string; country?: string | null };
export type AfFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: AfTeam; away: AfTeam };
  /** Gols com prorrogação, sem a disputa de pênaltis (placar oficial). */
  goals: { home: number | null; away: number | null };
};

export class ApiFootballError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiFootballEnabled() {
  return Boolean(process.env.API_FOOTBALL_KEY);
}

let lastCall = 0;

async function get<T>(path: string): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new ApiFootballError(0, "API_FOOTBALL_KEY não definida.");
  if (!(await hitRateLimit("api-football:dia", DAILY_BUDGET, 24 * 60 * 60))) {
    throw new ApiFootballError(429, "Cota diária da API-Football usada.");
  }

  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new ApiFootballError(res.status, `API-Football respondeu ${res.status}`);
  const body = (await res.json()) as { response?: T[]; errors?: Record<string, string> | string[] };
  // Erros de plano/cota/parâmetro vêm com HTTP 200 e o campo "errors" preenchido
  const errors = Array.isArray(body.errors) ? body.errors : Object.values(body.errors ?? {});
  if (errors.length) throw new ApiFootballError(400, `API-Football: ${errors.join("; ")}`);
  return body.response ?? [];
}

const DAY_CACHE_MS = 10 * 60_000;
const dayCache = new Map<string, { at: number; fixtures: Promise<AfFixture[]> }>();

function fixturesOfDay(date: string) {
  const hit = dayCache.get(date);
  if (hit && Date.now() - hit.at < DAY_CACHE_MS) return hit.fixtures;
  const fixtures = get<AfFixture>(`/fixtures?date=${date}&timezone=UTC`);
  dayCache.set(date, { at: Date.now(), fixtures });
  fixtures.catch(() => dayCache.delete(date));
  return fixtures;
}

export const apiFootball = {
  /** Times pelo nome (mínimo 3 letras, sem acentos). */
  searchTeams: (name: string) => get<{ team: AfTeam }>(`/teams?search=${encodeURIComponent(name)}`).then((r) => r.map((x) => x.team)),
  /**
   * Jogos do time num dia ("AAAA-MM-DD", UTC). O plano gratuito não aceita `team=` (exige a temporada, e a
   * atual é bloqueada), mas aceita `date=` sozinho entre ontem e amanhã: busca o dia inteiro (1 requisição,
   * guardada por 10 min para as outras visitas do mesmo dia) e filtra pelo time.
   */
  fixturesOn: async (teamId: string, date: string) =>
    (await fixturesOfDay(date)).filter((f) => String(f.teams.home.id) === teamId || String(f.teams.away.id) === teamId),
  fixture: (id: string) => get<AfFixture>(`/fixtures?id=${encodeURIComponent(id)}`).then((r) => r[0] ?? null),
};

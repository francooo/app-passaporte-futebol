import "server-only";
import { hitRateLimit } from "@/lib/auth-core";
import { API_SPORTS, parseGame, type ApiSport, type RawGame, type SportGame } from "./api-sports-parse";

/**
 * Cliente da API-Sports para basquete e vôlei (mesma conta e chave da API-Football; plano gratuito separado
 * por esporte: 100 requisições/dia). O plano gratuito bloqueia a temporada atual e só aceita /games?date=
 * de ontem a amanhã: o sync diário importa esses três dias. Chave: API_SPORTS_KEY ou, sem ela, API_FOOTBALL_KEY.
 */

const MIN_INTERVAL_MS = 6_500;
const DAILY_BUDGET = 90;

export class ApiSportsError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const apiKey = () => process.env.API_SPORTS_KEY || process.env.API_FOOTBALL_KEY;

export function apiSportsEnabled() {
  return Boolean(apiKey());
}

const lastCall: Partial<Record<ApiSport, number>> = {};

async function get(sport: ApiSport, path: string): Promise<RawGame[]> {
  const key = apiKey();
  if (!key) throw new ApiSportsError(0, "API_SPORTS_KEY não definida.");
  const { baseUrl, provider } = API_SPORTS[sport];
  if (!(await hitRateLimit(`${provider}:dia`, DAILY_BUDGET, 24 * 60 * 60))) {
    throw new ApiSportsError(429, `Cota diária da ${provider} usada.`);
  }
  const wait = (lastCall[sport] ?? 0) + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall[sport] = Date.now();

  const res = await fetch(`${baseUrl}${path}`, { headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new ApiSportsError(res.status, `${provider} respondeu ${res.status}`);
  const body = (await res.json()) as { response?: RawGame[]; errors?: Record<string, string> | string[] };
  // Erros de plano/cota vêm com HTTP 200 e "errors" preenchido
  const errors = Array.isArray(body.errors) ? body.errors : Object.values(body.errors ?? {});
  if (errors.length) throw new ApiSportsError(400, `${provider}: ${errors.join("; ")}`);
  return body.response ?? [];
}

export const apiSports = {
  /** Todos os jogos do dia ("AAAA-MM-DD", UTC) no mundo; o sync filtra as ligas importadas. */
  gamesOn: async (sport: ApiSport, date: string): Promise<SportGame[]> =>
    (await get(sport, `/games?date=${date}&timezone=UTC`)).map(parseGame),
  game: async (sport: ApiSport, id: string): Promise<SportGame | null> => {
    const [g] = await get(sport, `/games?id=${encodeURIComponent(id)}`);
    return g ? parseGame(g) : null;
  },
};

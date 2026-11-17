/**
 * Cliente da API v4 do football-data.org (https://www.football-data.org/documentation/api).
 * Plano gratuito: 10 requisições por minuto — as chamadas são espaçadas automaticamente.
 */

const BASE = "https://api.football-data.org/v4";
const MIN_INTERVAL_MS = 6_500;

/** Competições do plano gratuito (a sincronização ignora as que a chave não liberar). */
export const FREE_COMPETITIONS = ["BSA", "CLI", "WC", "CL", "EC", "PL", "PD", "SA", "BL1", "FL1", "DED", "PPL", "ELC"] as const;

export type FdArea = { code: string; name: string };
export type FdTeam = {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  venue?: string | null;
  area?: FdArea;
};
export type FdCompetition = { code: string; name: string; emblem: string | null; area: FdArea; currentSeason?: { startDate: string } };
export type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  venue?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
};

export class FootballDataError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let lastCall = 0;

async function get<T>(path: string): Promise<T> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new FootballDataError(0, "FOOTBALL_DATA_API_KEY não definida.");

  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 429) {
    // Limite estourado: espera o tempo pedido (ou 60 s) e tenta uma vez de novo
    const retry = Number(res.headers.get("x-requestcounter-reset") ?? res.headers.get("retry-after")) || 60;
    await new Promise((r) => setTimeout(r, retry * 1000));
    lastCall = 0;
    return get<T>(path);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new FootballDataError(res.status, body.message ?? `football-data.org respondeu ${res.status}`);
  }
  return (await res.json()) as T;
}

export const footballData = {
  competition: (code: string) => get<FdCompetition>(`/competitions/${code}`),
  teams: (code: string, season?: number) =>
    get<{ teams: FdTeam[] }>(`/competitions/${code}/teams${season ? `?season=${season}` : ""}`).then((r) => r.teams),
  finishedMatches: (code: string, season?: number) =>
    get<{ matches: FdMatch[] }>(`/competitions/${code}/matches?status=FINISHED${season ? `&season=${season}` : ""}`).then(
      (r) => r.matches,
    ),
};

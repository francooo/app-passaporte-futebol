/**
 * Regras do palpite e da busca do resultado depois do jogo (funções puras; testes em rules.test.ts).
 * Usadas por src/lib/results/resolve.ts, src/lib/visits.ts e pelas telas (via VisitSummary).
 */

export type Score = { home: number; away: number };
export type ResultProvider = "football-data" | "api-football";
export type ResultSource = ResultProvider | "manual";
export type PredictionOutcome = "exact" | "winner" | "miss";

/** Duração prevista do jogo (90 min + intervalo + acréscimos, com folga): depois disso começa a busca. */
export const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

/** Intervalo mínimo entre duas buscas do mesmo carimbo. */
export const RECHECK_MS = 20 * 60 * 1000;

/** Depois disso sem resultado, a busca para e a tela pede para informar à mão. */
export const GIVE_UP_MS = 3 * 24 * 60 * 60 * 1000;

export function expectedEndAt(kickoffAt: Date) {
  return new Date(kickoffAt.getTime() + MATCH_DURATION_MS);
}

/** Já passou do fim previsto, ainda dentro do prazo de busca, e a última tentativa não é recente. */
export function isDueForCheck(v: { kickoffAt: Date | null; resultCheckedAt: Date | null }, now = new Date()) {
  if (!v.kickoffAt) return false;
  const end = expectedEndAt(v.kickoffAt).getTime();
  if (now.getTime() < end || now.getTime() > end + GIVE_UP_MS) return false;
  return !v.resultCheckedAt || now.getTime() - v.resultCheckedAt.getTime() >= RECHECK_MS;
}

/** Pendente há tanto tempo que a busca automática desistiu: o usuário informa o resultado. */
export function needsManualResult(kickoffAt: Date | null, now = new Date()) {
  if (!kickoffAt) return true;
  return now.getTime() > expectedEndAt(kickoffAt).getTime() + GIVE_UP_MS;
}

/** "Na mosca" (placar exato), acertou o vencedor/empate, ou errou. Null sem palpite ou sem resultado. */
export function predictionOutcome(prediction: Score | null, result: Score | null): PredictionOutcome | null {
  if (!prediction || !result) return null;
  if (prediction.home === result.home && prediction.away === result.away) return "exact";
  return Math.sign(prediction.home - prediction.away) === Math.sign(result.home - result.away) ? "winner" : "miss";
}

/** Os dois números ou nenhum (palpite/resultado parcial não vale). */
export function toScore(home: number | null | undefined, away: number | null | undefined): Score | null {
  return home == null || away == null ? null : { home, away };
}

// Status de cada fonte
const FINAL: Record<ResultProvider, readonly string[]> = {
  "football-data": ["FINISHED", "AWARDED"],
  // FT: tempo normal; AET: prorrogação; PEN: pênaltis; AWD/WO: decisão administrativa
  "api-football": ["FT", "AET", "PEN", "AWD", "WO"],
};
const CALLED_OFF: Record<ResultProvider, readonly string[]> = {
  "football-data": ["POSTPONED", "CANCELLED", "SUSPENDED"],
  "api-football": ["PST", "CANC", "ABD", "SUSP"],
};

export function isFinalStatus(provider: ResultProvider, status: string) {
  return FINAL[provider].includes(status);
}

/** Adiado, cancelado ou interrompido: não terá resultado no horário previsto. */
export function isCalledOff(provider: ResultProvider, status: string) {
  return CALLED_OFF[provider].includes(status);
}

/** Partidas do football-data que podem ser escolhidas antes do fim (hoje, ao vivo). */
export const OPEN_MATCH_STATUSES = ["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED"] as const;

type FdScore = {
  duration?: string | null;
  fullTime: { home: number | null; away: number | null };
  penalties?: { home: number | null; away: number | null } | null;
};

/**
 * Placar oficial (90 min + prorrogação, sem a disputa de pênaltis).
 * No football-data, `fullTime` de jogos decididos nos pênaltis soma os gols da disputa.
 */
export function officialFdScore(score: FdScore): { home: number | null; away: number | null } {
  const { home, away } = score.fullTime;
  const pens = score.penalties;
  if (score.duration === "PENALTY_SHOOTOUT" && home != null && away != null && pens?.home != null && pens.away != null) {
    return { home: home - pens.home, away: away - pens.away };
  }
  return { home, away };
}

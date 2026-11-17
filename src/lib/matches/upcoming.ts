/**
 * Regras dos "próximos jogos" (funções puras; testes em upcoming.test.ts).
 * Usadas pelo sync (src/lib/matches/sync.ts) e pela consulta dos estádios perto (src/lib/matches/queries.ts).
 */

/** Janela mostrada na tela de registro. */
export const UPCOMING_DAYS = 14;

/** Jogos por estádio na lista. */
export const UPCOMING_PER_STADIUM = 3;

/** Status do football-data.org que indicam partida válida ainda por jogar (exclui adiada, cancelada, suspensa). */
export const UPCOMING_STATUSES = ["SCHEDULED", "TIMED"] as const;

export function isUpcomingStatus(status: string) {
  return (UPCOMING_STATUSES as readonly string[]).includes(status);
}

/** "AAAA-MM-DD" (UTC) de hoje e de daqui a `days` dias: janela pedida ao provedor. */
export function upcomingWindow(now = new Date(), days = UPCOMING_DAYS) {
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}

/** Agrupa por estádio, em ordem de data, com no máximo `perStadium` jogos em cada. */
export function groupByStadium<T extends { stadiumId: string | null; utcDate: string }>(rows: T[], perStadium = UPCOMING_PER_STADIUM) {
  const sorted = [...rows].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const groups = new Map<string, T[]>();
  for (const row of sorted) {
    if (!row.stadiumId) continue;
    const list = groups.get(row.stadiumId) ?? [];
    if (list.length < perStadium) list.push(row);
    groups.set(row.stadiumId, list);
  }
  return groups;
}

/**
 * Escolha do time e do jogo na resposta da API-Football para um carimbo do preenchimento manual
 * (funções puras; testes em pick.test.ts). Compara nomes sem acentos e sem siglas ("FC", "EC"…).
 */
import { clubTokens, normalizeName } from "../matches/link";

type Named = { name: string };

/** Quantas palavras distintivas dos dois nomes coincidem ("Grêmio" × "Gremio FBPA" = 1). */
export function nameOverlap(a: string, b: string) {
  const ta = new Set(clubTokens(a).length ? clubTokens(a) : normalizeName(a).split(" ").filter(Boolean));
  const tb = clubTokens(b).length ? clubTokens(b) : normalizeName(b).split(" ").filter(Boolean);
  return tb.filter((t) => ta.has(t)).length;
}

/** Termo de busca para /teams?search: a palavra distintiva mais longa, sem acentos (mín. 3 letras). */
export function teamSearchTerm(name: string) {
  const words = clubTokens(name).length ? clubTokens(name) : normalizeName(name).split(" ");
  const best = [...words].sort((a, b) => b.length - a.length)[0] ?? "";
  return best.length >= 3 ? best : null;
}

/** Time da API com mais palavras em comum com o nosso (nome ou nome curto). Null se nenhum bater. */
export function pickTeam<T extends Named>(names: Array<string | null | undefined>, candidates: T[]): T | null {
  let best: { team: T; score: number } | null = null;
  for (const team of candidates) {
    const score = Math.max(0, ...names.filter((n): n is string => Boolean(n)).map((n) => nameOverlap(n, team.name)));
    if (score > 0 && (!best || score > best.score)) best = { team, score };
  }
  return best?.team ?? null;
}

/**
 * Jogo do dia em que o nosso mandante enfrenta o nosso visitante (em qualquer ordem: o usuário pode ter
 * invertido). Com um único jogo do time no dia, aceita mesmo sem conferir o adversário pelo nome.
 */
export function pickFixture<F extends { teams: { home: Named; away: Named } }>(fixtures: F[], opponent: string | null): F | null {
  if (fixtures.length === 1) return fixtures[0];
  if (!opponent) return null;
  return fixtures.find((f) => nameOverlap(opponent, f.teams.home.name) > 0 || nameOverlap(opponent, f.teams.away.name) > 0) ?? null;
}

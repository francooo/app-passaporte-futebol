/**
 * Regras puras da moderação (testes em moderation-rules.test.ts): candidatos a duplicado de um cadastro pendente.
 */
import { normalizeName } from "./matches/link";

/** Palavras que não distinguem locais nem times ("Ginásio", "Estádio", "Clube", "Futsal"…). */
const GENERIC = new Set([
  "estadio", "stadium", "ginasio", "arena", "poliesportivo", "esportes", "esportivo", "complexo", "centro", "municipal", "estadual",
  "clube", "club", "esporte", "sport", "futebol", "futsal", "volei", "voleibol", "basquete", "basketball", "associacao", "atletico",
  "do", "da", "de", "dos", "das", "e", "fc", "ec", "sc", "ac",
]);

export function nameTokens(name: string) {
  return [...new Set(normalizeName(name).split(" ").filter((w) => w.length >= 3 && !GENERIC.has(w)))];
}

/**
 * Até `limit` candidatos com mais palavras distintivas em comum (nome igual sem as palavras genéricas vem primeiro).
 * Quem chama já filtra pela cidade (locais) ou pelo esporte (times).
 */
export function rankDuplicates<T extends { id: string; name: string }>(pendingName: string, candidates: T[], limit = 3): T[] {
  const mine = nameTokens(pendingName);
  if (!mine.length) return [];
  const key = mine.join(" ");
  return candidates
    .map((c) => {
      const theirs = nameTokens(c.name);
      const shared = mine.filter((t) => theirs.includes(t)).length;
      return { c, score: theirs.join(" ") === key ? 100 : shared };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name, "pt-BR"))
    .slice(0, limit)
    .map((x) => x.c);
}

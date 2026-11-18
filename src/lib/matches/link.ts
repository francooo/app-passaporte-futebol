/**
 * Ligação das partidas do football-data.org aos estádios do catálogo (Wikidata).
 * Funções puras, testadas em link.test.ts.
 */

/** Sem acentos, minúsculas, só letras/números e espaços simples. */
export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Palavras genéricas que variam entre fontes ("Estádio X" × "X"). */
const STADIUM_WORDS = new Set(["estadio", "stadium", "stade", "stadio", "estadi", "stadion", "do", "da", "de", "del", "di", "du", "the", "municipal"]);

export function stadiumKey(name: string) {
  return normalizeName(name)
    .split(" ")
    .filter((w) => w && !STADIUM_WORDS.has(w))
    .join(" ");
}

/** O football-data.org usa códigos de área próprios para o Reino Unido (ENG, SCO…); o catálogo usa ISO3. */
export function areaToIso3(code: string | null | undefined) {
  if (!code) return null;
  return ["ENG", "SCO", "WAL", "NIR"].includes(code) ? "GBR" : code;
}

/** Palavras de nomes de clube que não identificam o time ("Clube", "FC", "Futebol"…). */
const CLUB_WORDS = new Set([
  "fc", "cf", "sc", "ac", "afc", "cr", "ec", "se", "club", "clube", "futebol", "football", "foot", "ball", "de", "do", "da", "regatas",
  "sport", "sporting", "esporte", "athletic", "atletico", "associacao", "real", "the", "and", "e", "y", "calcio", "1", "04", "1899", "1909",
]);

/** Palavras que distinguem o clube ("Flamengo", "Botafogo", "Palmeiras"). */
export function clubTokens(name: string) {
  return normalizeName(name)
    .split(" ")
    .filter((w) => w.length >= 4 && !CLUB_WORDS.has(w));
}

/** Mandantes que não são o time principal (base, reservas, feminino): não servem para ligar o time profissional. */
const SECONDARY_TEAM = /\b(reserves?|academy|youth|juvenil|women|womens|ladies|feminino|femenino|femminile|frauen|feminines?|w f c|wfc|u ?\d{2}|sub ?\d{2}|b|ii)\b/;

export function isSecondaryTeam(club: string) {
  return SECONDARY_TEAM.test(normalizeName(club));
}

export type CatalogStadium = { id: string; name: string; country: string; capacity: number | null; clubs: string[] };

/**
 * Estádio de um time: 1) nome do estádio informado pelo provedor igual (sem acentos/prefixos) ao do catálogo;
 * 2) senão, o estádio do país cujo clube mandante (Wikidata) tem mais palavras em comum com o nome do time;
 *    no empate, o maior. Contar as palavras evita que a cidade no nome decida sozinha
 *    ("Rayo Vallecano de Madrid" fica em Vallecas, não no Bernabéu do "Real Madrid"). Times de base, reservas
 *    e femininos não contam (o Academy Stadium não vira a casa do Manchester City).
 */
export function findTeamStadium(
  team: { name: string; shortName: string | null; venue: string | null; country: string | null },
  stadiums: CatalogStadium[],
): string | null {
  const pool = team.country ? stadiums.filter((s) => s.country === team.country) : stadiums;

  if (team.venue) {
    const key = stadiumKey(team.venue);
    const exact = key && pool.find((s) => stadiumKey(s.name) === key);
    if (exact) return exact.id;
  }

  const tokens = [...new Set([...clubTokens(team.shortName ?? ""), ...clubTokens(team.name)])];
  if (tokens.length === 0) return null;
  const score = (s: CatalogStadium) =>
    Math.max(
      0,
      ...s.clubs.filter((club) => !isSecondaryTeam(club)).map((club) => {
        const words = new Set(normalizeName(club).split(" "));
        return tokens.filter((t) => words.has(t)).length;
      }),
    );
  const candidates = pool.map((s) => ({ s, score: score(s) })).filter((c) => c.score > 0);
  candidates.sort((a, b) => b.score - a.score || (b.s.capacity ?? 0) - (a.s.capacity ?? 0));
  return candidates[0]?.s.id ?? null;
}

/**
 * Regras de qualidade do catálogo (funções puras, testadas em rules.test.ts).
 * Os dados vêm do Wikidata/Commons e nem sempre estão completos ou atualizados.
 */

export type CapacityStatement = {
  value: number;
  rank: "preferred" | "normal" | "deprecated";
  /** Data do valor (qualificador P585), ISO; null quando a fonte não informa. */
  date: string | null;
};

/**
 * Escolhe a capacidade atual:
 * 1) rank preferido; 2) o valor com data mais recente; 3) havendo valores diferentes sem data,
 * o menor (recordes históricos de público costumam ser maiores que a capacidade atual) — marcado para revisão.
 */
export function pickCapacity(statements: CapacityStatement[]): { capacity: number | null; needsReview: boolean } {
  const valid = statements.filter((s) => s.rank !== "deprecated" && Number.isFinite(s.value) && s.value > 0);
  if (valid.length === 0) return { capacity: null, needsReview: false };

  const preferred = valid.filter((s) => s.rank === "preferred");
  const pool = preferred.length > 0 ? preferred : valid;

  const dated = pool.filter((s) => s.date).sort((a, b) => b.date!.localeCompare(a.date!));
  if (dated.length > 0) return { capacity: Math.round(dated[0].value), needsReview: false };

  const distinct = [...new Set(pool.map((s) => Math.round(s.value)))];
  if (distinct.length === 1) return { capacity: distinct[0], needsReview: false };
  return { capacity: Math.min(...distinct), needsReview: true };
}

export type PlaceNode = {
  id: string;
  label: string;
  parentIds: string[];
  isMunicipality: boolean;
  isState: boolean;
};

/**
 * Resolve cidade e estado subindo pela hierarquia "localizado em" (P131) a partir do local direto do estádio.
 * Ex.: Morumbi (bairro) → São Paulo (município) → São Paulo (estado).
 */
export function resolvePlace(startIds: string[], nodes: Map<string, PlaceNode>): { city: string | null; state: string | null } {
  let city: string | null = null;
  let state: string | null = null;
  const seen = new Set<string>();
  let frontier = [...startIds];

  // Busca em largura: o ancestral mais próximo vence.
  while (frontier.length > 0 && (!city || !state)) {
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodes.get(id);
      if (!node) continue;
      if (!city && node.isMunicipality) city = node.label;
      if (!state && node.isState) state = node.label;
      next.push(...node.parentIds);
    }
    frontier = next;
  }

  if (!city) {
    const direct = startIds.map((id) => nodes.get(id)).find((n) => n && !n.isState);
    city = direct?.label ?? null;
  }
  return { city, state };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/** O Commons devolve o autor em HTML (links, spans); a legenda precisa de texto simples. */
export function cleanAuthor(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, code: string) => {
      if (code.startsWith("#x")) return String.fromCodePoint(parseInt(code.slice(2), 16));
      if (code.startsWith("#") && code !== "#39") return String.fromCodePoint(parseInt(code.slice(1), 10));
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/**
 * Só usamos fotos com licença livre identificável (domínio público, CC0, CC BY, CC BY-SA).
 * Sem licença clara → descarta (o estádio fica com a ilustração padrão).
 */
export function isAcceptedLicense(shortName: string | null | undefined): boolean {
  if (!shortName) return false;
  const name = shortName.trim().toLowerCase();
  if (/\b(nc|nd)\b|non-?commercial|no ?deriv|fair use|non-free/.test(name)) return false;
  return /^(public domain|pd\b|cc0|cc[ -]by)/.test(name);
}

/**
 * O world-map.svg (Natural Earth 1:110m) usa "-99" para alguns países e repete o id.
 * Corrige pelo nome para o ISO3 usado no Wikidata (P298).
 */
export const MAP_ID_FIXES: Record<string, string> = {
  France: "FRA",
  Norway: "NOR",
  Kosovo: "XKX",
  "Northern Cyprus": "CYP",
  Somaliland: "SOM",
};

export function mapCountryId(rawId: string, name: string): string | null {
  if (/^[A-Z]{3}$/.test(rawId)) return rawId;
  return MAP_ID_FIXES[name] ?? null;
}

/**
 * Larguras de miniatura que o Wikimedia aceita (outras respondem HTTP 400).
 * https://www.mediawiki.org/wiki/Common_thumbnail_sizes
 */
export const COMMONS_THUMB_WIDTHS = [250, 330, 500, 960, 1280] as const;
export type CommonsThumbWidth = (typeof COMMONS_THUMB_WIDTHS)[number];

/** Miniatura do Commons numa largura padrão, sem os parâmetros de rastreio (utm_*). */
export function commonsThumb(url: string | null, width: CommonsThumbWidth): string | null {
  if (!url) return null;
  return url.split("?")[0].replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`);
}

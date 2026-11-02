import type { CapacityStatement, PlaceNode } from "./rules";

const SPARQL = "https://query.wikidata.org/sparql";
const API = "https://www.wikidata.org/w/api.php";
/** O Wikidata exige um User-Agent identificável (https://meta.wikimedia.org/wiki/User-Agent_policy). */
export const USER_AGENT = "PassaporteEsportivo/0.1 (https://app-passaporte-futebol.vercel.app; catalogo de estadios)";
const LANGS = ["pt", "en", "es", "fr", "de", "it", "mul"];
const BATCH = 50;

type Binding = Record<string, { value: string } | undefined>;

async function withRetry(doFetch: () => Promise<Response>, what: string, attempt = 1): Promise<Response> {
  const res = await doFetch();
  // 429 (limite) e 5xx (sobrecarga do serviço público): tenta de novo com espera crescente.
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    const wait = Number(res.headers.get("retry-after")) * 1000 || attempt * 5000;
    await new Promise((r) => setTimeout(r, wait));
    return withRetry(doFetch, what, attempt + 1);
  }
  if (!res.ok) {
    const body = (await res.text()).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 160);
    throw new Error(`${what} respondeu ${res.status}: ${body}`);
  }
  return res;
}

async function sparql(query: string): Promise<Binding[]> {
  const res = await withRetry(
    () =>
      fetch(SPARQL, {
        method: "POST",
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: new URLSearchParams({ query }),
        signal: AbortSignal.timeout(65_000),
      }),
    "Wikidata (SPARQL)",
  );
  return ((await res.json()) as { results: { bindings: Binding[] } }).results.bindings;
}

const qid = (uri: string | undefined) => uri?.split("/").pop() ?? "";
const values = (ids: string[]) => ids.map((id) => `wd:${id}`).join(" ");

// ── Entidades (API wbgetentities: rápida e sem o timeout do SPARQL) ───────────

type Snak = { datavalue?: { value: unknown } };
type Claim = { mainsnak: Snak; rank: "preferred" | "normal" | "deprecated"; qualifiers?: Record<string, Snak[]> };
type Entity = { id: string; labels?: Record<string, { value: string }>; claims?: Record<string, Claim[]> };

/** Erros internos transitórios do Wikidata (ex.: DBConnectionError) vêm com HTTP 200: tenta de novo. */
async function entitiesBatch(params: URLSearchParams, attempt = 1): Promise<Record<string, Entity & { missing?: string }>> {
  const res = await withRetry(
    () => fetch(`${API}?${params}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) }),
    "Wikidata (API)",
  );
  const json = (await res.json()) as {
    entities?: Record<string, Entity & { missing?: string }>;
    error?: { code: string; info?: string };
  };
  if (json.error) {
    if (json.error.code.startsWith("internal_api_error") && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
      return entitiesBatch(params, attempt + 1);
    }
    // A API responde 200 com { error } em alguns casos: falhar alto em vez de devolver lista vazia.
    throw new Error(`Wikidata (API): ${json.error.code} ${json.error.info ?? ""}`.trim());
  }
  return json.entities ?? {};
}

async function fetchEntities(ids: string[], props: string): Promise<Map<string, Entity>> {
  const result = new Map<string, Entity>();
  const unique = [...new Set(ids)].filter((id) => /^Q\d+$/.test(id));
  for (let i = 0; i < unique.length; i += BATCH) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: unique.slice(i, i + BATCH).join("|"),
      props,
      languages: LANGS.join("|"),
      languagefallback: "1",
    });
    for (const [id, entity] of Object.entries(await entitiesBatch(params))) {
      if (!("missing" in entity)) result.set(id, entity);
    }
  }
  return result;
}

function label(entity: Entity | undefined): string | null {
  if (!entity?.labels) return null;
  for (const lang of LANGS) {
    const value = entity.labels[lang]?.value;
    if (value) return value;
  }
  return Object.values(entity.labels)[0]?.value ?? null;
}

const claims = (e: Entity, prop: string) => (e.claims?.[prop] ?? []).filter((c) => c.rank !== "deprecated");
const firstValue = <T>(e: Entity, prop: string) => claims(e, prop)[0]?.mainsnak.datavalue?.value as T | undefined;
const itemIds = (e: Entity, prop: string) =>
  claims(e, prop)
    .map((c) => (c.mainsnak.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((id): id is string => !!id);

/** "+1950-06-16T00:00:00Z" (com precisão de ano às vezes "+1950-00-00…") → "1950-06-16" / "1950-01-01". */
function wikidataDate(time: string | undefined): string | null {
  const m = time?.match(/^[+]?(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2] === "00" ? "01" : m[2]}-${m[3] === "00" ? "01" : m[3]}`;
}

// ── Classes (calculadas uma vez por execução) ─────────────────────────────────

type Classes = { football: string[]; generic: string[]; municipality: Set<string>; state: Set<string> };
let classesCache: Classes | null = null;

const subclassesOf = async (...roots: string[]) =>
  (await sparql(`SELECT DISTINCT ?t WHERE { VALUES ?root { ${values(roots)} } ?t wdt:P279* ?root . }`))
    .map((r) => qid(r.t?.value))
    .filter((id) => /^Q\d+$/.test(id));

async function classes(): Promise<Classes> {
  if (classesCache) return classesCache;
  const football = await subclassesOf("Q1154710"); // estádio de futebol
  const generic = (await subclassesOf("Q483110")).filter((id) => !football.includes(id)); // estádio
  // município / cidade / vila / cidade grande; 1º nível administrativo (estados, províncias…)
  const municipality = new Set(await subclassesOf("Q15284", "Q515", "Q3957", "Q1549591"));
  const state = new Set(await subclassesOf("Q10864048"));
  classesCache = { football, generic, municipality, state };
  return classesCache;
}

// ── Países e índice mundial de estádios ───────────────────────────────────────

export type WikidataCountry = { iso3: string; iso2: string | null; name: string; wikidataId: string };

/** Países atuais com código ISO 3166-1 alfa-3 (o mesmo dos ids do mapa). */
export async function fetchCountries(): Promise<WikidataCountry[]> {
  const rows = await sparql(`
    SELECT ?c ?iso3 (SAMPLE(?i2) AS ?iso2) ?cLabel WHERE {
      ?c wdt:P298 ?iso3 ; wdt:P31/wdt:P279* wd:Q6256 .
      OPTIONAL { ?c wdt:P297 ?i2 . }
      FILTER NOT EXISTS { ?c wdt:P576 [] . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${LANGS.join(",")}". }
    } GROUP BY ?c ?iso3 ?cLabel`);
  const byIso = new Map<string, WikidataCountry>();
  for (const r of rows) {
    const iso3 = r.iso3?.value;
    if (!iso3 || !/^[A-Z]{3}$/.test(iso3) || byIso.has(iso3)) continue;
    byIso.set(iso3, { iso3, iso2: r.iso2?.value ?? null, name: r.cLabel?.value ?? iso3, wikidataId: qid(r.c?.value) });
  }
  return [...byIso.values()];
}

let indexCache: Map<string, string[]> | null = null;

/**
 * Todos os estádios de futebol do mundo (ou estádios com esporte = futebol), por país, numa consulta só (~6 s).
 * A ordem forçada (tipos → itens → país) evita varrer tudo que está ligado a um país, que dava timeout.
 */
async function stadiumIndex(): Promise<Map<string, string[]>> {
  if (indexCache) return indexCache;
  const { football, generic } = await classes();
  const rows = await sparql(`
    SELECT DISTINCT ?s ?country WHERE {
      hint:Query hint:optimizer "None" .
      { VALUES ?type { ${values(football)} } ?s wdt:P31 ?type . }
      UNION
      { VALUES ?type { ${values(generic)} } ?s wdt:P31 ?type . ?s wdt:P641 wd:Q2736 . }
      ?s wdt:P17 ?country .
      FILTER NOT EXISTS { ?s wdt:P576 [] . }
    }`);
  const index = new Map<string, string[]>();
  for (const r of rows) {
    const country = qid(r.country?.value);
    const list = index.get(country) ?? [];
    list.push(qid(r.s?.value));
    index.set(country, list);
  }
  indexCache = index;
  return index;
}

// ── Estádios de um país ───────────────────────────────────────────────────────

export type RawStadium = {
  wikidataId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  imageFile: string | null;
  openedOn: string | null;
  website: string | null;
  locationIds: string[];
  capacities: CapacityStatement[];
  clubs: string[];
};

const MAX_PLACE_DEPTH = 6;

export async function fetchCountryStadiums(countryQid: string): Promise<{ stadiums: RawStadium[]; places: Map<string, PlaceNode> }> {
  const ids = (await stadiumIndex()).get(countryQid) ?? [];
  if (ids.length === 0) return { stadiums: [], places: new Map() };
  const cls = await classes();

  const entities = await fetchEntities(ids, "labels|claims");
  const stadiums: RawStadium[] = [];
  for (const e of entities.values()) {
    const name = label(e);
    if (!name) continue;
    const coord = firstValue<{ latitude: number; longitude: number }>(e, "P625");
    stadiums.push({
      wikidataId: e.id,
      name,
      lat: coord?.latitude ?? null,
      lng: coord?.longitude ?? null,
      imageFile: firstValue<string>(e, "P18") ?? null,
      openedOn: wikidataDate(firstValue<{ time: string }>(e, "P1619")?.time),
      website: firstValue<string>(e, "P856") ?? null,
      locationIds: itemIds(e, "P131"),
      capacities: (e.claims?.P1083 ?? []).map((c) => ({
        value: Number((c.mainsnak.datavalue?.value as { amount?: string } | undefined)?.amount),
        rank: c.rank,
        date: (c.qualifiers?.P585?.[0]?.datavalue?.value as { time?: string } | undefined)?.time ?? null,
      })),
      clubs: itemIds(e, "P466"),
    });
  }

  // Nomes dos clubes mandantes
  const clubEntities = await fetchEntities(stadiums.flatMap((s) => s.clubs), "labels");
  for (const s of stadiums) {
    s.clubs = [...new Set(s.clubs.map((id) => label(clubEntities.get(id))).filter((n): n is string => !!n))];
  }

  // Hierarquia de locais (P131), nível a nível, até achar município e estado
  const places = new Map<string, PlaceNode>();
  let frontier = [...new Set(stadiums.flatMap((s) => s.locationIds))];
  for (let depth = 0; depth < MAX_PLACE_DEPTH && frontier.length > 0; depth++) {
    const level = await fetchEntities(frontier, "labels|claims");
    const next: string[] = [];
    for (const e of level.values()) {
      const types = itemIds(e, "P31");
      const node: PlaceNode = {
        id: e.id,
        label: label(e) ?? e.id,
        parentIds: itemIds(e, "P131"),
        isMunicipality: types.some((t) => cls.municipality.has(t)),
        isState: types.some((t) => cls.state.has(t)),
      };
      places.set(e.id, node);
      // Só sobe enquanto ainda falta achar o estado nesse ramo
      if (!node.isState) next.push(...node.parentIds.filter((p) => !places.has(p)));
    }
    frontier = [...new Set(next)];
  }

  return { stadiums, places };
}

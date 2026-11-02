/**
 * Gera shared/world-map-data.ts a partir de public/map/world-map.svg (Natural Earth 1:110m),
 * com o ISO3 corrigido de cada país, para o web e o mobile desenharem o mapa clicável.
 * Uso: npm run gen:world-map
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mapCountryId } from "../src/lib/catalog/rules";

const root = join(import.meta.dirname, "..");
const svg = readFileSync(join(root, "public", "map", "world-map.svg"), "utf8");

const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
if (!viewBox) throw new Error("viewBox não encontrado");

const countries: Array<{ iso3: string; name: string; d: string }> = [];
const skipped: string[] = [];
for (const m of svg.matchAll(/<path class="country" id="country-([^"]+)" data-country="([^"]+)" d="([^"]+)"/g)) {
  const [, rawId, name, d] = m;
  const iso3 = mapCountryId(rawId, name);
  if (!iso3) {
    skipped.push(`${rawId} ${name}`);
    continue;
  }
  // Coordenadas com 1 casa decimal bastam para o tamanho de tela e reduzem o arquivo.
  countries.push({ iso3, name, d: d.replace(/(\d+\.\d)\d+/g, "$1") });
}
if (skipped.length) throw new Error(`Países sem ISO3: ${skipped.join("; ")} — adicione em MAP_ID_FIXES`);

const out = `// Gerado por scripts/gen-world-map.ts a partir de public/map/world-map.svg. Não editar à mão.
// Natural Earth (domínio público). iso3 = ISO 3166-1 alfa-3, igual ao código do país no catálogo.

export const WORLD_MAP_VIEWBOX = ${JSON.stringify(viewBox)};

export type WorldMapCountry = { iso3: string; name: string; d: string };

export const WORLD_MAP_COUNTRIES: WorldMapCountry[] = ${JSON.stringify(countries, null, 0).replace(/},{/g, "},\n  {")};
`;
writeFileSync(join(root, "shared", "world-map-data.ts"), out);
console.log(`${countries.length} países gravados em shared/world-map-data.ts (${(out.length / 1024).toFixed(0)} KB)`);

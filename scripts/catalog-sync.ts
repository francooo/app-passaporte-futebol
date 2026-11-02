/**
 * Carga do catálogo de estádios a partir do Wikidata.
 *   npm run catalog:sync -- BRA ARG      (países específicos)
 *   npm run catalog:sync -- --all        (todos os países)
 *   npm run catalog:sync -- --countries  (só a lista de países)
 */
import { db } from "@/db";
import { countries } from "@/db/schema";
import { syncCountry, syncCountryList } from "@/lib/catalog/sync";

const PAUSE_MS = 1500; // gentileza com o serviço público do Wikidata

const args = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const existing = await db.select({ iso3: countries.iso3 }).from(countries);
  if (existing.length === 0 || args.includes("--countries")) {
    console.log(`países: ${await syncCountryList()} atualizados`);
    if (args.includes("--countries")) return;
  }

  const targets = args.includes("--all")
    ? (await db.select({ iso3: countries.iso3 }).from(countries).orderBy(countries.iso3)).map((c) => c.iso3)
    : args.filter((a) => /^[A-Z]{3}$/.test(a));
  if (targets.length === 0) throw new Error("Informe países (ex.: BRA ARG) ou --all.");

  const failures: string[] = [];
  let total = 0;
  for (const [i, iso3] of targets.entries()) {
    const started = Date.now();
    try {
      const r = await syncCountry(iso3);
      total += r.imported;
      console.log(`[${i + 1}/${targets.length}] ${iso3}: ${r.imported} estádios, ${r.withPhoto} com foto (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (error) {
      failures.push(iso3);
      console.error(`[${i + 1}/${targets.length}] ${iso3}: ERRO ${(error as Error).message.slice(0, 160)}`);
    }
    await sleep(PAUSE_MS);
  }
  console.log(`\nConcluído: ${total} estádios; falhas: ${failures.length ? failures.join(", ") : "nenhuma"}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

import { NextResponse } from "next/server";
import { countriesDueForSync, syncCountry, syncCountryList } from "@/lib/catalog/sync";

// Wikidata é lento: dá tempo para alguns países por execução.
export const maxDuration = 300;

const BUDGET_MS = 240_000;
const MAX_COUNTRIES = 15;

/**
 * Job diário (vercel.json): atualiza os países sincronizados há mais tempo.
 * A Vercel chama com "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  // Uma vez por semana (domingo), atualiza também a lista de países.
  if (new Date().getUTCDay() === 0) await syncCountryList();

  const done: Array<{ iso3: string; imported?: number; error?: string }> = [];
  for (const { iso3 } of await countriesDueForSync(MAX_COUNTRIES)) {
    if (Date.now() - started > BUDGET_MS) break;
    try {
      const r = await syncCountry(iso3);
      done.push({ iso3, imported: r.imported });
    } catch (error) {
      done.push({ iso3, error: (error as Error).message.slice(0, 160) });
    }
  }
  return NextResponse.json({ done, seconds: Math.round((Date.now() - started) / 1000) });
}

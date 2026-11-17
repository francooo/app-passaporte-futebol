import { NextResponse } from "next/server";
import { FREE_COMPETITIONS } from "@/lib/matches/football-data";
import { competitionsDueForSync, syncCompetition } from "@/lib/matches/sync";

// football-data.org no plano gratuito: 10 requisições/min (~40 s por competição).
export const maxDuration = 300;

const BUDGET_MS = 230_000;
const MAX_COMPETITIONS = 5;

/**
 * Job diário (vercel.json): atualiza as competições sincronizadas há mais tempo
 * (resultados novos entram em até ~3 dias). A Vercel chama com "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const done: Array<{ code: string; matches?: number; error?: string }> = [];
  for (const code of await competitionsDueForSync(FREE_COMPETITIONS, MAX_COMPETITIONS)) {
    // Cada competição leva ~40 s; não começa outra se não houver tempo para terminá-la
    if (Date.now() - started > BUDGET_MS - 50_000) break;
    try {
      const r = await syncCompetition(code);
      done.push({ code, matches: r.matches });
    } catch (error) {
      done.push({ code, error: (error as Error).message.slice(0, 160) });
    }
  }
  return NextResponse.json({ done, seconds: Math.round((Date.now() - started) / 1000) });
}

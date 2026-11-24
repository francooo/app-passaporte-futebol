import { NextResponse } from "next/server";
import { FREE_COMPETITIONS } from "@/lib/matches/football-data";
import { competitionsDueForSync, syncCompetition, syncUpcoming } from "@/lib/matches/sync";
import { apiSportsEnabled } from "@/lib/matches/api-sports";
import { syncApiSports } from "@/lib/matches/sync-api-sports";
import { resolvePendingResults } from "@/lib/results/resolve";

// football-data.org no plano gratuito: 10 requisições/min (~6,5 s por chamada).
export const maxDuration = 300;

const BUDGET_MS = 240_000;
/** Tempo médio do sync completo de uma competição (~6 chamadas). */
const FULL_SYNC_MS = 45_000;
/** Carimbos pendentes resolvidos por execução (~6,5 s cada quando precisa consultar o provedor). */
const RESULTS_PER_RUN = 10;

/**
 * Job diário (vercel.json). A Vercel chama com "Authorization: Bearer $CRON_SECRET".
 * 0. NBB e Superliga (API-Sports): jogos de ontem, hoje e amanhã (6 chamadas, ~40 s).
 * 1. Próximos jogos (30 dias) de todas as competições: 1 chamada cada (~85 s), para o registro e o mapa.
 * 2. Resultado dos carimbos criados antes do fim do jogo (palpite) que ninguém abriu desde então.
 * 3. No tempo que sobra, resultados e times das competições sincronizadas há mais tempo.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  let apiSportsSummary: Awaited<ReturnType<typeof syncApiSports>> | string = "desligado";
  if (apiSportsEnabled()) {
    try {
      apiSportsSummary = await syncApiSports();
    } catch (error) {
      apiSportsSummary = (error as Error).message.slice(0, 160);
    }
  }
  const upcoming: Array<{ code: string; scheduled?: number; error?: string }> = [];
  for (const code of FREE_COMPETITIONS) {
    try {
      const r = await syncUpcoming(code);
      upcoming.push({ code, scheduled: r.scheduled });
    } catch (error) {
      upcoming.push({ code, error: (error as Error).message.slice(0, 160) });
    }
  }

  let results: number | string = 0;
  try {
    results = await resolvePendingResults({ limit: RESULTS_PER_RUN });
  } catch (error) {
    results = (error as Error).message.slice(0, 160);
  }

  const done: Array<{ code: string; matches?: number; error?: string }> = [];
  for (const code of await competitionsDueForSync(FREE_COMPETITIONS, FREE_COMPETITIONS.length)) {
    // Não começa uma competição sem tempo para terminá-la
    if (Date.now() - started > BUDGET_MS - FULL_SYNC_MS) break;
    try {
      const r = await syncCompetition(code);
      done.push({ code, matches: r.matches });
    } catch (error) {
      done.push({ code, error: (error as Error).message.slice(0, 160) });
    }
  }
  return NextResponse.json({ apiSports: apiSportsSummary, upcoming, results, done, seconds: Math.round((Date.now() - started) / 1000) });
}

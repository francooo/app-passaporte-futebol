/**
 * Carga de partidas do football-data.org (plano gratuito: 10 requisições/min — leva alguns minutos).
 *   npm run matches:sync              (todas as competições do plano gratuito)
 *   npm run matches:sync -- BSA CL    (competições específicas)
 *   npm run matches:sync -- --proximos [BSA …]   (só os jogos agendados dos próximos 30 dias)
 *   npm run matches:sync -- --api-sports         (NBB e Superliga: jogos de ontem, hoje e amanhã)
 */
import { FREE_COMPETITIONS } from "@/lib/matches/football-data";
import { syncCompetition, syncUpcoming } from "@/lib/matches/sync";
import { syncApiSports } from "@/lib/matches/sync-api-sports";

async function main() {
  if (process.argv.includes("--api-sports")) {
    for (const r of await syncApiSports()) console.log(`${r.sport} ${r.day}: ${r.error ? `ERRO ${r.error}` : `${r.games} jogos`}`);
    return;
  }
  const args = process.argv.slice(2).filter((a) => /^[A-Z0-9]{2,4}$/.test(a));
  const targets = args.length ? args : [...FREE_COMPETITIONS];
  const failures: string[] = [];
  if (process.argv.includes("--proximos")) {
    for (const [i, code] of targets.entries()) {
      try {
        const r = await syncUpcoming(code);
        console.log(`[${i + 1}/${targets.length}] ${code}: ${r.scheduled} jogos agendados (${r.total} na janela)`);
      } catch (error) {
        failures.push(code);
        console.error(`[${i + 1}/${targets.length}] ${code}: ERRO ${(error as Error).message.slice(0, 160)}`);
      }
    }
    console.log(`
Concluído; falhas: ${failures.length ? failures.join(", ") : "nenhuma"}`);
    return;
  }
  for (const [i, code] of targets.entries()) {
    const started = Date.now();
    try {
      const r = await syncCompetition(code);
      console.log(
        `[${i + 1}/${targets.length}] ${code} ${r.name}: ${r.matches} partidas, ${r.teams} times, temporadas ${r.seasons.join(", ") || "nenhuma"} (${((Date.now() - started) / 1000).toFixed(0)}s)`,
      );
    } catch (error) {
      failures.push(code);
      console.error(`[${i + 1}/${targets.length}] ${code}: ERRO ${(error as Error).message.slice(0, 160)}`);
    }
  }
  console.log(`\nConcluído; falhas: ${failures.length ? failures.join(", ") : "nenhuma"}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

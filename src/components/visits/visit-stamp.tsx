import type { VisitSummary } from "@shared/api-types";
import { StampCard } from "@/components/ui/stamp-card";

/** Carimbo de um registro: em blocos (linha no mobile, cartão vertical no desktop) ou na listagem compacta. */
export function VisitStamp({ visit: v, view = "blocos" }: { visit: VisitSummary; view?: "blocos" | "lista" }) {
  const [y, m, d] = v.date ? v.date.split("-").map(Number) : [];
  const props = {
    href: `/app/passaporte/${v.id}`,
    stadium: v.stadium.name,
    city: v.stadium.city ?? v.stadium.country,
    stateCode: v.stadium.state && v.stadium.state !== v.stadium.city ? v.stadium.state : undefined,
    kind: v.kind,
    date: v.date ? new Date(y, m - 1, d) : null,
    photoUrl: v.stadium.thumbUrl,
    tone: v.kind === "match" ? ("azul" as const) : ("verde" as const),
    tag: v.result?.status === "pending" ? "Aguardando resultado" : v.predictionOutcome === "exact" ? "Palpite na mosca!" : null,
    // Partida: escudos e placar final (pendente mostra "– × –")
    match: v.kind === "match" && (v.home || v.away) ? { home: v.home, away: v.away, homeScore: v.homeScore, awayScore: v.awayScore } : null,
    competition: v.competition,
    sport: v.sport,
  };
  if (view === "lista") return <StampCard {...props} layout="list" />;
  return (
    <>
      <div className="lg:hidden">
        <StampCard {...props} />
      </div>
      <div className="hidden h-full lg:block">
        <StampCard {...props} layout="tile" />
      </div>
    </>
  );
}

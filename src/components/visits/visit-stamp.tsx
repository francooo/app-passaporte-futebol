import type { VisitSummary } from "@shared/api-types";
import { StampCard } from "@/components/ui/stamp-card";

/** Carimbo de um registro: linha no mobile, cartão vertical no desktop. */
export function VisitStamp({ visit: v }: { visit: VisitSummary }) {
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
  };
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

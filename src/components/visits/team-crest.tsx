import type { TeamRef } from "@shared/api-types";
import { KitIcon } from "@/components/ui/kit-icon";
import { cn } from "@/lib/cn";

/** Escudo do time (football-data.org) ou o selo padrão do kit. */
export function TeamCrest({ team, size = 40, className }: { team: Pick<TeamRef, "name" | "crestUrl"> | null; size?: number; className?: string }) {
  if (team?.crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- escudos externos (SVG/PNG do provedor)
      <img
        src={team.crestUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return <KitIcon name="crest-stamp" size={size} className={cn("shrink-0", className)} />;
}

/** Linha "Mandante 2 × 1 Visitante" com escudos. */
export function Scoreline({
  home,
  away,
  homeScore,
  awayScore,
  size = "md",
}: {
  home: Pick<TeamRef, "name" | "crestUrl"> | null;
  away: Pick<TeamRef, "name" | "crestUrl"> | null;
  homeScore: number | null;
  awayScore: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const crest = size === "lg" ? 64 : size === "md" ? 44 : 28;
  const score = size === "lg" ? "text-5xl" : size === "md" ? "text-4xl" : "text-2xl";
  const name = size === "sm" ? "text-base" : "text-lg lg:text-xl";
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
      <div className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className={cn("titulo-display truncate text-estadio", name)}>{home?.name ?? "Mandante"}</span>
        <TeamCrest team={home} size={crest} />
      </div>
      <p className={cn("titulo-display flex items-center gap-2 text-estadio tabular-nums", score)} aria-label={`Placar ${homeScore ?? "?"} a ${awayScore ?? "?"}`}>
        <span>{homeScore ?? "–"}</span>
        <span className="text-[0.6em] text-suave">×</span>
        <span>{awayScore ?? "–"}</span>
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <TeamCrest team={away} size={crest} />
        <span className={cn("titulo-display truncate text-estadio", name)}>{away?.name ?? "Visitante"}</span>
      </div>
    </div>
  );
}

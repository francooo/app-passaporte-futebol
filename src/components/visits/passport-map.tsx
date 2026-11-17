import { WORLD_MAP_COUNTRIES, WORLD_MAP_VIEWBOX } from "@shared/world-map-data";
import { cn } from "@/lib/cn";

/**
 * Mapa-múndi do passaporte: países com carimbo em amarelo (link para os estádios do país),
 * demais em verde. Renderizado no servidor.
 */
export function PassportMap({ visited, className }: { visited: Set<string>; className?: string }) {
  return (
    <svg
      viewBox={WORLD_MAP_VIEWBOX}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={visited.size ? `Mapa-múndi com ${visited.size} ${visited.size === 1 ? "país carimbado" : "países carimbados"}` : "Mapa-múndi"}
    >
      {WORLD_MAP_COUNTRIES.map((c, i) => {
        const on = visited.has(c.iso3);
        const path = (
          <path
            d={c.d}
            className={cn("stroke-marfim stroke-[0.5]", on ? "fill-ingresso stroke-estadio hover:fill-ingresso-escuro" : "fill-estadio")}
          />
        );
        return on ? (
          <a key={`${c.iso3}-${i}`} href={`/app/mapa?pais=${c.iso3}`}>
            {path}
          </a>
        ) : (
          <g key={`${c.iso3}-${i}`}>{path}</g>
        );
      })}
    </svg>
  );
}

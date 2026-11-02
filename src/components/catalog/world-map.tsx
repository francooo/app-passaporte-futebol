import { WORLD_MAP_COUNTRIES, WORLD_MAP_VIEWBOX } from "@shared/world-map-data";
import { cn } from "@/lib/cn";

type Props = {
  selected: string;
  /** ISO3 → nome em português, só dos países com estádios no catálogo. */
  available: Map<string, string>;
  className?: string;
};

/**
 * Mapa-múndi clicável renderizado no servidor: cada país com estádios é um link (funciona sem JavaScript).
 * Amarelo = selecionado; verde-estádio = tem estádios; verde-claro = sem estádios no catálogo.
 */
export function WorldMap({ selected, available, className }: Props) {
  return (
    <svg viewBox={WORLD_MAP_VIEWBOX} className={cn("h-auto w-full", className)} role="group" aria-label="Mapa-múndi: escolha um país">
      {WORLD_MAP_COUNTRIES.map((c, i) => {
        const name = available.get(c.iso3);
        const isSelected = c.iso3 === selected;
        const path = (
          <path
            d={c.d}
            className={cn(
              "stroke-marfim stroke-[0.5] transition-colors",
              isSelected ? "fill-ingresso stroke-estadio" : name ? "fill-estadio hover:fill-estadio-claro" : "fill-[#A9BFB5]",
            )}
          />
        );
        if (!name) return <g key={`${c.iso3}-${i}`} aria-hidden>{path}</g>;
        return (
          <a
            key={`${c.iso3}-${i}`}
            href={`/app/mapa?pais=${c.iso3}`}
            aria-label={`${name}${isSelected ? " (selecionado)" : ""}`}
            aria-current={isSelected ? "true" : undefined}
            className="outline-none focus-visible:[&>path]:fill-ingresso-escuro"
          >
            <title>{name}</title>
            {path}
          </a>
        );
      })}
    </svg>
  );
}

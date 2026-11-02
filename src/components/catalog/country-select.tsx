"use client";

import type { CatalogCountry } from "@shared/api-types";
import { cn } from "@/lib/cn";

/**
 * Seletor de país (alternativa acessível ao mapa e acesso a países pequenos que não aparecem nele).
 * É um formulário GET: com JavaScript troca ao selecionar; sem, pelo botão "Ver".
 */
export function CountrySelect({
  countries,
  selected,
  action = "/app/mapa",
  className,
}: {
  countries: CatalogCountry[];
  selected: string;
  action?: string;
  className?: string;
}) {
  return (
    <form action={action} className={cn("flex items-center gap-2", className)}>
      <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-linha bg-papel px-4">
        <span className="rotulo-display shrink-0 text-xs text-suave">País</span>
        <select
          name="pais"
          defaultValue={selected}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="min-w-0 flex-1 bg-transparent py-3 font-display text-lg font-semibold text-estadio outline-none"
        >
          {countries.map((c) => (
            <option key={c.iso3} value={c.iso3}>
              {c.name} ({c.stadiumCount})
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="min-h-12 rounded-xl bg-ingresso px-4 font-display font-semibold text-estadio">
          Ver
        </button>
      </noscript>
    </form>
  );
}

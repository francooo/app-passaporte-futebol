import { SPORT_INFO, SPORTS, type Sport } from "@shared/sports";
import { KitIcon } from "@/components/ui/kit-icon";
import { cn } from "@/lib/cn";

export { hasMatchSource, scoreDigits, scoreFieldLabel, SPORT_COPY, venueWord } from "@shared/sport-copy";

/** Escolha do esporte (chips com ícone) no topo do registro. */
export function SportPicker({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-display text-xl font-semibold text-estadio">Esporte</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SPORTS.map((s) => {
          const active = value === s;
          return (
            <label
              key={s}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 font-display text-lg font-semibold text-estadio transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-estadio",
                active ? "border-estadio bg-ingresso" : "border-estadio/20 bg-white hover:bg-partida/50",
              )}
            >
              <input type="radio" name="esporte" value={s} checked={active} onChange={() => onChange(s)} className="sr-only" />
              <KitIcon name={SPORT_INFO[s].icon} size={26} />
              {SPORT_INFO[s].label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

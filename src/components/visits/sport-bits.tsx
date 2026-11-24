import { SPORT_INFO, SPORTS, type Sport } from "@shared/sports";
import { KitIcon } from "@/components/ui/kit-icon";
import { cn } from "@/lib/cn";

/** Textos por esporte usados no registro, no carimbo e no resultado. */
export const SPORT_COPY: Record<Sport, { matchExample: string; teamExample: string; competitionExample: string; source: string | null }> = {
  futebol: { matchExample: "Ex.: Flamengo x Botafogo", teamExample: "Ex.: Flamengo", competitionExample: "Ex.: Copa do Brasil", source: "football-data.org · principais ligas" },
  volei: { matchExample: "Ex.: Sesi Bauru x Minas", teamExample: "Ex.: Sada Cruzeiro", competitionExample: "Ex.: Superliga", source: "API-Sports · Superliga" },
  basquete: { matchExample: "Ex.: Flamengo x Franca", teamExample: "Ex.: Franca", competitionExample: "Ex.: NBB", source: "API-Sports · NBB" },
  futsal: { matchExample: "Ex.: Magnus x Corinthians", teamExample: "Ex.: Magnus Futsal", competitionExample: "Ex.: Liga Nacional de Futsal", source: null },
};

/** "gols do mandante", "sets do visitante", "pontos do mandante". */
export const scoreFieldLabel = (sport: Sport, side: "home" | "away") =>
  `${SPORT_INFO[sport].scoreUnit[0].toUpperCase()}${SPORT_INFO[sport].scoreUnit.slice(1)} do ${side === "home" ? "mandante" : "visitante"}`;

/** Dígitos do campo de placar: basquete passa de 99. */
export const scoreDigits = (sport: Sport) => String(SPORT_INFO[sport].maxScore).length;

/** O esporte tem partidas importadas (busca em "Encontre a partida")? Futsal é só manual. */
export const hasMatchSource = (sport: Sport) => SPORT_COPY[sport].source != null;

/** Nome do local em frases ("estádio", "local"). */
export const venueWord = (sport: Sport) => (sport === "futebol" ? "estádio" : "local");

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

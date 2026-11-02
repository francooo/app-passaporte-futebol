import { memo } from "react";
import Svg, { Path } from "react-native-svg";
import { WORLD_MAP_COUNTRIES, WORLD_MAP_VIEWBOX } from "@shared/world-map-data";
import { colors } from "@/theme";

type Props = {
  selected: string;
  /** ISO3 dos países com estádios no catálogo. */
  available: Set<string>;
  onSelect: (iso3: string) => void;
};

const SEM_DADOS = "#A9BFB5";

/**
 * Mapa-múndi tocável (mesmos dados do web: shared/world-map-data.ts).
 * Amarelo = selecionado; verde-estádio = tem estádios; verde-claro = sem estádios.
 * O seletor de país da tela é a alternativa acessível para leitores de tela.
 */
export const WorldMap = memo(function WorldMap({ selected, available, onSelect }: Props) {
  return (
    <Svg viewBox={WORLD_MAP_VIEWBOX} width="100%" height="100%">
      {WORLD_MAP_COUNTRIES.map((c, i) => {
        const has = available.has(c.iso3);
        const isSelected = c.iso3 === selected;
        return (
          <Path
            key={`${c.iso3}-${i}`}
            d={c.d}
            fill={isSelected ? colors.ingresso : has ? colors.estadio : SEM_DADOS}
            stroke={isSelected ? colors.estadio : colors.marfim}
            strokeWidth={0.5}
            onPress={has ? () => onSelect(c.iso3) : undefined}
          />
        );
      })}
    </Svg>
  );
});

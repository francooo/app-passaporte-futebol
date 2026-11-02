import { useId, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { colors, radius } from "@/theme";

const HOLE = 4;
const PITCH = 18;
const BITE = 14;

/** Coluna de furos verdes na borda da moldura (equivale a .perfurado do web). */
function Perforation({ side }: { side: "left" | "right" }) {
  const id = `furo${side}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg style={[styles.perforation, side === "left" ? { left: 0 } : { right: 0 }]} width={HOLE * 2} height="100%">
      <Defs>
        <Pattern id={id} width={HOLE * 2} height={PITCH} patternUnits="userSpaceOnUse">
          <Circle cx={side === "left" ? 0 : HOLE * 2} cy={PITCH / 2} r={HOLE} fill={colors.estadio} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

type FrameProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** De borda a borda da tela, sem cantos arredondados. */
  bleed?: boolean;
};

/** Moldura amarela com bordas perfuradas. */
export function PerforatedFrame({ children, style, bleed = false }: FrameProps) {
  return (
    <View style={[styles.frame, bleed && styles.bleed, style]}>
      <Perforation side="left" />
      <Perforation side="right" />
      {children}
    </View>
  );
}

/**
 * Cartão marfim com "mordidas" semicirculares nas laterais (equivale a .mordida do web).
 * As mordidas são círculos da cor da moldura sobre a borda do cartão.
 */
export function BittenCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      {children}
      <View pointerEvents="none" style={[styles.bite, { left: -BITE }]} />
      <View pointerEvents="none" style={[styles.bite, { right: -BITE }]} />
    </View>
  );
}

/** Ingresso completo: moldura perfurada + cartão com mordidas (porta o Ticket do web). */
export function Ticket({
  children,
  style,
  innerStyle,
  bleed,
}: FrameProps & { innerStyle?: StyleProp<ViewStyle> }) {
  return (
    <PerforatedFrame style={style} bleed={bleed}>
      <BittenCard style={innerStyle}>{children}</BittenCard>
    </PerforatedFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.ingresso,
    borderRadius: radius.ingresso,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: "hidden",
  },
  bleed: { borderRadius: 0, marginHorizontal: -20 },
  perforation: { position: "absolute", top: 0, bottom: 0 },
  card: {
    backgroundColor: colors.marfim,
    borderRadius: radius.cartao,
    padding: 20,
    overflow: "hidden",
  },
  bite: {
    position: "absolute",
    top: "50%",
    marginTop: -BITE,
    width: BITE * 2,
    height: BITE * 2,
    borderRadius: BITE,
    backgroundColor: colors.ingresso,
  },
});

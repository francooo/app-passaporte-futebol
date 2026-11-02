import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, font, radius } from "@/theme";

type Variant = "primario" | "secundario" | "texto";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Mesmas variantes do Button do web: primário amarelo, secundário com contorno verde e texto. */
export function Button({ children, variant = "primario", icon, loading, disabled, style, ...props }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && pressedStyles[variant],
        inactive && styles.inactive,
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={colors.estadio} /> : icon}
      <Text style={[styles.label, variant === "texto" && styles.labelTexto]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.campo,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  primario: { backgroundColor: colors.ingresso, borderBottomWidth: 2, borderBottomColor: colors.ingressoEscuro },
  secundario: { borderWidth: 2, borderColor: colors.estadio, backgroundColor: "rgba(255,255,255,0.6)" },
  texto: { backgroundColor: "transparent" },
  inactive: { opacity: 0.6 },
  label: { fontFamily: font.displaySemi, fontSize: 20, color: colors.estadio },
  labelTexto: { fontSize: 18 },
});

const pressedStyles = StyleSheet.create({
  primario: { backgroundColor: colors.ingressoEscuro },
  secundario: { backgroundColor: colors.visita },
  texto: { opacity: 0.7 },
});

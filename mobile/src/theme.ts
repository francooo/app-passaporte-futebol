import { StyleSheet } from "react-native";
import { colors, radius } from "@shared/tokens";

export { colors, radius };

/** Famílias carregadas em app/_layout.tsx (@expo-google-fonts). No Android o peso vem do nome da família. */
export const font = {
  display: "Oswald_700Bold",
  displaySemi: "Oswald_600SemiBold",
  displayMedium: "Oswald_500Medium",
  sans: "Inter_400Regular",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

/** Equivalentes das classes .titulo-display e .rotulo-display do web. */
export const type = StyleSheet.create({
  titulo: { fontFamily: font.display, color: colors.estadio, letterSpacing: -0.2 },
  rotulo: {
    fontFamily: font.displaySemi,
    color: colors.estadio,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  corpo: { fontFamily: font.sans, color: colors.tinta, fontSize: 16 },
  suave: { fontFamily: font.sans, color: colors.suave, fontSize: 14 },
});

/** Espaçamento base (múltiplos de 4, como o Tailwind do web). */
export const space = (n: number) => n * 4;

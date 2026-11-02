import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, font } from "@/theme";
import { KitIcon } from "./kit-icon";

const sizes = {
  sm: { text: 24, mark: 58 },
  lg: { text: 36, mark: 84 },
};

/** Wordmark provisório (o logotipo oficial só existe rasterizado nos mockups). */
export function Logo({ size = "sm", style }: { size?: keyof typeof sizes; style?: StyleProp<ViewStyle> }) {
  const s = sizes[size];
  return (
    <View style={[styles.row, style]} accessible accessibilityRole="header" accessibilityLabel="Passaporte Esportivo">
      <View>
        <Text style={[styles.word, { fontSize: s.text, lineHeight: s.text * 0.95 }]}>Passaporte</Text>
        <Text style={[styles.word, { fontSize: s.text, lineHeight: s.text * 0.95, paddingLeft: s.text * 0.3 }]}>
          Esportivo
        </Text>
      </View>
      <KitIcon name="football-postmark" width={s.mark} height={(s.mark * 100) / 220} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  word: { fontFamily: font.display, color: colors.estadio, includeFontPadding: false },
});

import { StyleSheet, TextInput } from "react-native";
import { colors, font, radius } from "@/theme";

/** Gols de um time (0–99): placar, palpite ou resultado informado à mão. */
export function ScoreInput({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 2))}
      keyboardType="number-pad"
      maxLength={2}
      style={[styles.input, invalid && { borderColor: colors.erro }]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: 64,
    height: 56,
    textAlign: "center",
    fontFamily: font.display,
    fontSize: 28,
    color: colors.estadio,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
});

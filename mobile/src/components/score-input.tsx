import { StyleSheet, TextInput } from "react-native";
import { colors, font, radius } from "@/theme";

/** Placar de um time: placar, palpite ou resultado informado à mão. digits: 3 no basquete, 1 no vôlei (sets). */
export function ScoreInput({
  label,
  value,
  onChange,
  invalid,
  digits = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  digits?: number;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, digits))}
      keyboardType="number-pad"
      maxLength={digits}
      style={[styles.input, digits > 2 && { width: 80 }, invalid && { borderColor: colors.erro }]}
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

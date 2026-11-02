import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, font, radius } from "@/theme";
import { KitIcon, type KitIconName } from "./kit-icon";

type Props = TextInputProps & {
  label: string;
  icon?: KitIconName;
  error?: string;
  hint?: string;
  /** Campo de senha com botão de mostrar/ocultar. */
  password?: boolean;
};

/** Campo com rótulo persistente, ícone, erro junto ao campo e olho de senha (como o TextField do web). */
export function TextField({ label, icon, error, hint, password, style, ...props }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.focused, !!error && styles.boxError]}>
        {icon && <KitIcon name={icon} size={22} />}
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.suave}
          secureTextEntry={password && !revealed}
          autoCapitalize={password ? "none" : props.autoCapitalize}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {password && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
            hitSlop={8}
            style={styles.eye}
          >
            <KitIcon name="eye" size={22} style={{ opacity: revealed ? 1 : 0.6 }} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  box: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  focused: { borderColor: colors.estadio, borderWidth: 2 },
  boxError: { borderColor: colors.erro },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: font.sans, fontSize: 16, color: colors.tinta },
  eye: { padding: 4 },
  error: { fontFamily: font.sans, fontSize: 14, color: colors.erro },
  hint: { fontFamily: font.sans, fontSize: 14, color: colors.suave },
});

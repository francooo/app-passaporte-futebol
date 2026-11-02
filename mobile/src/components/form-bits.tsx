import { Link, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, font } from "@/theme";

/** Mensagem do formulário (sucesso em verde, erro em vermelho), anunciada a leitores de tela. */
export function FormMessage({ message }: { message: { text: string; ok: boolean } | null }) {
  if (!message) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={[styles.message, { color: message.ok ? colors.estadio : colors.erro }]}>
      {message.text}
    </Text>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function TextLink({ href, children, align = "center" }: { href: Href; children: string; align?: "center" | "right" }) {
  return (
    <Link href={href} replace style={[styles.link, { textAlign: align, alignSelf: align === "right" ? "flex-end" : "center" }]}>
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  message: { fontFamily: font.sans, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.linha, marginVertical: 4 },
  link: { fontFamily: font.displaySemi, fontSize: 18, color: colors.estadio, paddingVertical: 6 },
});

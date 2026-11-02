import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, type } from "@/theme";
import { Logo } from "./logo";
import { Ticket } from "./ticket";

/** Fluxo de acesso: fundo verde de arquibancada + ingresso com o formulário (como o (auth)/layout do web). */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[type.rotulo, styles.tagline]}>Futebol conecta pessoas a lugares incríveis</Text>

          <Ticket innerStyle={styles.card}>
            <Logo size="lg" style={styles.logo} />
            <View style={styles.rule} />
            <Text style={[type.rotulo, styles.title]} accessibilityRole="header">
              {title}
            </Text>
            {children}
          </Ticket>

          <Text style={styles.footer}>
            Mais que futebol{"\n"}mais histórias
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.estadio },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 20, gap: 20 },
  tagline: { color: colors.ingresso, fontSize: 13, textAlign: "center" },
  card: { paddingHorizontal: 24, paddingVertical: 28 },
  logo: { alignSelf: "center" },
  rule: { height: 1, backgroundColor: colors.estadio, width: "75%", alignSelf: "center", marginVertical: 16 },
  title: { fontSize: 19, textAlign: "center", marginBottom: 20 },
  footer: {
    marginTop: "auto",
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 26,
    textTransform: "uppercase",
    color: colors.ingresso,
  },
});

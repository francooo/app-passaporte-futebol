import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { KitIcon } from "./kit-icon";
import { Logo } from "./logo";

/** Estrutura das abas: cabeçalho com logo + menu e conteúdo rolável (como o AppLayout mobile do web). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo />
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu" hitSlop={8} style={styles.menu}>
            <KitIcon name="menu" size={30} />
          </Pressable>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.marfim },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  menu: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});

import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { Logo } from "./logo";

type Props = {
  children: ReactNode;
  /** "Puxar para atualizar". */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Estrutura das abas: cabeçalho com o logo e conteúdo rolável (como o AppLayout mobile do web). */
export function Screen({ children, refreshing = false, onRefresh }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.estadio} colors={[colors.estadio]} /> : undefined}
      >
        <View style={styles.header}>
          <Logo />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.marfim },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 20 },
  header: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

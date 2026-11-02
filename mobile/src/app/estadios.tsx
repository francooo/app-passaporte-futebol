import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { StadiumSummary } from "@shared/api-types";
import { KitIcon } from "@/components/kit-icon";
import { StadiumRow } from "@/components/stadium-bits";
import { ApiRequestError } from "@/lib/api";
import { catalogApi } from "@/lib/catalog";
import { colors, font, radius, type } from "@/theme";

/** Lista completa de estádios do país: do maior para o menor, com busca e carregamento contínuo. */
export default function EstadiosScreen() {
  const { pais = "BRA", nome } = useLocalSearchParams<{ pais?: string; nome?: string }>();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<StadiumSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadPage = useCallback(
    async (page: number, q: string, replace: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await catalogApi.stadiums(pais, { q, page });
        if (id !== requestId.current) return; // resposta de uma busca antiga
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setNextPage(res.nextPage);
        setTotal(res.total);
      } catch (e) {
        if (id === requestId.current) setError(e instanceof ApiRequestError ? e.message : "Não foi possível carregar.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [pais],
  );

  // Busca com pequena espera enquanto digita
  useEffect(() => {
    const timer = setTimeout(() => loadPage(0, query.trim(), true), query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [query, loadPage]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={styles.back}>
          <KitIcon name="back" size={22} />
          <Text style={styles.backText}>Mapa</Text>
        </Pressable>
        <Text style={[type.titulo, styles.title]} accessibilityRole="header" numberOfLines={2}>
          Estádios: {nome ?? pais}
        </Text>
        {total != null && (
          <Text style={type.suave}>
            {total} {total === 1 ? "estádio" : "estádios"} · do maior para o menor
          </Text>
        )}
        <View style={styles.search}>
          <KitIcon name="search" size={20} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar estádio ou cidade"
            placeholderTextColor={colors.suave}
            accessibilityLabel="Buscar estádio ou cidade"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => <StadiumRow stadium={item} position={query ? undefined : index + 1} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && nextPage != null && items.length > 0) loadPage(nextPage, query.trim(), false);
        }}
        ListEmptyComponent={!loading && !error ? <Text style={type.suave}>Nenhum estádio encontrado.</Text> : undefined}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator color={colors.estadio} style={{ paddingVertical: 20 }} />
          ) : error ? (
            <Pressable onPress={() => loadPage(nextPage ?? 0, query.trim(), items.length === 0)} accessibilityRole="button">
              <Text style={styles.error}>{error} Toque para tentar de novo.</Text>
            </Pressable>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.marfim },
  header: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  backText: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  title: { fontSize: 32 },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
    marginBottom: 8,
  },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.sans, fontSize: 16, color: colors.tinta, paddingVertical: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  error: { fontFamily: font.sans, color: colors.erro, paddingVertical: 16 },
});

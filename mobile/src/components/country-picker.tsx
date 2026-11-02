import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CatalogCountry } from "@shared/api-types";
import { colors, font, radius, type } from "@/theme";
import { KitIcon } from "./kit-icon";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Seletor de país com busca: alternativa acessível ao mapa e acesso a países pequenos que não aparecem nele. */
export function CountryPicker({
  countries,
  selected,
  onSelect,
}: {
  countries: CatalogCountry[];
  selected: string;
  onSelect: (iso3: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = countries.find((c) => c.iso3 === selected);
  const filtered = useMemo(
    () => (query ? countries.filter((c) => normalize(c.name).includes(normalize(query))) : countries),
    [countries, query],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`País selecionado: ${current?.name ?? selected}. Trocar país`}
        style={styles.trigger}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {current?.name ?? selected}
        </Text>
        <Text style={[type.rotulo, styles.triggerLabel]}>Trocar país ▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={[type.titulo, styles.title]} accessibilityRole="header">
              Escolha o país
            </Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.search}>
            <KitIcon name="search" size={20} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar país"
              placeholderTextColor={colors.suave}
              accessibilityLabel="Buscar país"
              style={styles.searchInput}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.iso3}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.iso3);
                  setOpen(false);
                  setQuery("");
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: item.iso3 === selected }}
                style={[styles.item, item.iso3 === selected && styles.itemSelected]}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={type.suave}>{item.stadiumCount}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.papel,
  },
  triggerText: { flex: 1, fontFamily: font.displaySemi, fontSize: 20, color: colors.estadio },
  triggerLabel: { fontSize: 11, color: colors.suave },
  modal: { flex: 1, backgroundColor: colors.marfim },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  title: { fontSize: 28 },
  close: { fontSize: 22, color: colors.estadio },
  search: {
    marginHorizontal: 20,
    marginBottom: 8,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.sans, fontSize: 16, color: colors.tinta, paddingVertical: 10 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.linha,
  },
  itemSelected: { backgroundColor: colors.partida },
  itemName: { fontFamily: font.sansSemi, fontSize: 16, color: colors.estadio },
});

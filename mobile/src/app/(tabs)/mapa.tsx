import { StyleSheet, Text, TextInput, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Button } from "@/components/button";
import { FlagBR } from "@/components/flag-br";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { worldMapSvg } from "@/generated/world-map";
import { demoCountryRanking } from "@/lib/demo-data";
import { colors, font, radius, type } from "@/theme";

const capacity = new Intl.NumberFormat("pt-BR");

export default function MapaScreen() {
  const { country, stadiums } = demoCountryRanking;

  return (
    <Screen>
      <View style={styles.headRow}>
        <View style={styles.flex}>
          <Text style={[type.titulo, styles.title]} accessibilityRole="header">
            Mapa dos estádios
          </Text>
          <Text style={type.suave}>Explore o futebol pelo mundo</Text>
        </View>
        <Text style={[type.rotulo, styles.chip]}>✦ IA</Text>
      </View>

      <View style={styles.search}>
        <KitIcon name="search" size={22} />
        <TextInput
          placeholder="Buscar país ou estádio"
          placeholderTextColor={colors.suave}
          accessibilityLabel="Buscar país ou estádio"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <View style={styles.mapBox}>
        <Text style={[type.rotulo, styles.mapLabel]}>Mapa-múndi</Text>
        <View style={styles.map} accessible accessibilityRole="image" accessibilityLabel="Mapa-múndi com o Brasil em destaque">
          <SvgXml xml={worldMapSvg} width="100%" height="100%" />
        </View>
      </View>

      <View style={styles.selected}>
        <View style={styles.inline}>
          <FlagBR />
          <Text style={styles.countryText}>{country}</Text>
        </View>
        <Text style={[type.rotulo, styles.selectedLabel]}>País selecionado</Text>
      </View>

      <View style={styles.headRow}>
        <Text style={[type.titulo, styles.subtitle]} accessibilityRole="header">
          Estádios do {country}
        </Text>
        <Text style={styles.sort}>▾ Maior capacidade</Text>
      </View>

      <View style={styles.list}>
        {stadiums.map((s, i) => (
          <View key={s.id} style={styles.item} accessible accessibilityLabel={`${i + 1}º, ${s.name}, ${s.city}, ${capacity.format(s.capacity)} lugares`}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>{i + 1}º</Text>
            </View>
            <KitIcon name="stadium" size={28} />
            <View style={styles.flex}>
              <Text style={styles.itemName} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={type.suave}>{s.city}</Text>
            </View>
            <View style={styles.capacity}>
              <Text style={styles.capacityValue}>{capacity.format(s.capacity)}</Text>
              <Text style={styles.capacityLabel}>lugares</Text>
            </View>
          </View>
        ))}
      </View>

      <Button variant="secundario" icon={<KitIcon name="arrow-right" size={20} />}>
        Ver todos os estádios
      </Button>

      <Text style={styles.note}>Capacidades demonstrativas. Seleção de país e mapa navegável chegam na Fase 4.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 34 },
  chip: {
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.partida,
    overflow: "hidden",
  },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.sans, fontSize: 16, color: colors.tinta, paddingVertical: 12 },
  mapBox: { borderWidth: 4, borderColor: colors.ingresso, borderRadius: radius.cartao, backgroundColor: colors.branco, padding: 12 },
  mapLabel: { fontSize: 11, color: colors.suave, marginBottom: 8 },
  map: { width: "100%", aspectRatio: 720 / 320 },
  selected: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.papel,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 12 },
  countryText: { fontFamily: font.displaySemi, fontSize: 20, color: colors.estadio },
  selectedLabel: { fontSize: 11, color: colors.suave },
  subtitle: { fontSize: 24, flexShrink: 1 },
  sort: {
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: colors.estadio,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
    overflow: "hidden",
  },
  list: { gap: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  rank: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.estadio, alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: font.display, fontSize: 18, color: colors.ingresso },
  itemName: { fontFamily: font.sansSemi, fontSize: 16, color: colors.estadio },
  capacity: { alignItems: "flex-end" },
  capacityValue: { fontFamily: font.display, fontSize: 20, color: colors.estadio },
  capacityLabel: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  note: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
});

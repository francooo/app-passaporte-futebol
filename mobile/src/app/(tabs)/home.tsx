import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Button } from "@/components/button";
import { FlagBR } from "@/components/flag-br";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { Ticket } from "@/components/ticket";
import { worldMapSvg } from "@/generated/world-map";
import { useAuth } from "@/lib/auth-context";
import { demoNearby } from "@/lib/demo-data";
import { colors, font, radius, type } from "@/theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <Screen>
      <View style={styles.greetingRow}>
        <Text style={[type.titulo, styles.greeting]} accessibilityRole="header">
          Olá{firstName ? `, ${firstName}` : ""}!
        </Text>
        <Text style={[type.rotulo, styles.motto]}>Explorar{"\n"}Colecionar{"\n"}Viver o futebol</Text>
      </View>

      <View style={styles.search}>
        <KitIcon name="search" size={22} />
        <TextInput
          placeholder="País, cidade ou estádio"
          placeholderTextColor={colors.suave}
          accessibilityLabel="Buscar país, cidade ou estádio"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <Ticket bleed innerStyle={styles.mapCard}>
        <View style={styles.mapRow}>
          <View style={styles.map} accessible accessibilityRole="image" accessibilityLabel="Mapa-múndi">
            <SvgXml xml={worldMapSvg} width="100%" height="100%" />
          </View>
          <Text style={[type.rotulo, styles.mapNote]}>O mundo{"\n"}também{"\n"}joga aqui</Text>
        </View>
        <Pressable style={styles.country} accessibilityRole="button" accessibilityLabel="País: Brasil">
          <View style={styles.countryName}>
            <FlagBR />
            <Text style={styles.countryText}>Brasil</Text>
          </View>
          <Text style={styles.caret}>▾</Text>
        </Pressable>
      </Ticket>

      <Pressable style={styles.row} onPress={() => router.navigate("/mapa")} accessibilityRole="button">
        <View style={styles.rowLeft}>
          <KitIcon name="location-pin" size={22} />
          <Text style={type.corpo}>Usar minha localização</Text>
        </View>
        <KitIcon name="arrow-right" size={20} />
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[type.titulo, styles.sectionTitle]} accessibilityRole="header">
            Estádios próximos
          </Text>
          <Pressable onPress={() => router.navigate("/mapa")} hitSlop={8}>
            <Text style={styles.seeAll}>Ver todos ›</Text>
          </Pressable>
        </View>
        {demoNearby.map((s) => (
          <Pressable key={s.id} style={styles.nearby} onPress={() => router.navigate("/mapa")} accessibilityRole="button">
            <View style={styles.nearbyPhoto}>
              {s.photo ? <Image source={s.photo} style={styles.nearbyImage} resizeMode="cover" /> : <KitIcon name="stadium" size={48} />}
            </View>
            <View style={styles.nearbyInfo}>
              <Text style={[type.titulo, styles.nearbyName]}>{s.name}</Text>
              <View style={styles.rowLeft}>
                <KitIcon name="location-pin" size={16} />
                <Text style={type.suave}>{s.distanceKm.toLocaleString("pt-BR")} km</Text>
              </View>
            </View>
            <KitIcon name="arrow-right" size={20} />
          </Pressable>
        ))}
      </View>

      <Button icon={<KitIcon name="camera-ai" size={30} />} onPress={() => router.navigate("/passaporte")}>
        Registrar com IA
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greetingRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  greeting: { fontSize: 36, flexShrink: 1 },
  motto: { fontSize: 11, lineHeight: 14, textAlign: "right" },
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
  mapCard: { padding: 12 },
  mapRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  map: { flex: 1, aspectRatio: 720 / 320 },
  mapNote: { fontSize: 9, lineHeight: 11, textAlign: "right" },
  country: {
    marginTop: 8,
    alignSelf: "center",
    width: "80%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  countryName: { flexDirection: "row", alignItems: "center", gap: 12 },
  countryText: { fontFamily: font.sans, fontSize: 18, color: colors.tinta },
  caret: { color: colors.estadio },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontSize: 30 },
  seeAll: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  nearby: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 12,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
    overflow: "hidden",
  },
  nearbyPhoto: { width: 128, height: 96, backgroundColor: colors.partida, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  nearbyImage: { width: 128, height: 96 },
  nearbyInfo: { flex: 1, gap: 4 },
  nearbyName: { fontSize: 20 },
});

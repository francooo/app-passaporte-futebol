import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { NearbyStadium, StadiumSummary } from "@shared/api-types";
import { WORLD_MAP_COUNTRIES, WORLD_MAP_VIEWBOX } from "@shared/world-map-data";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { place, StadiumRow, StadiumThumb } from "@/components/stadium-bits";
import { Ticket } from "@/components/ticket";
import { EmptyState, VisitStamp } from "@/components/visit-bits";
import { useAuth } from "@/lib/auth-context";
import { useLoad, useReloadOnFocus } from "@/lib/catalog";
import { visitsApi } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export default function HomeScreen() {
  const { user, token } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const { data, loading, error, reload } = useLoad(() => visitsApi(token).list(), [token]);
  useReloadOnFocus(reload);
  const countries = useMemo(() => new Set((data?.items ?? []).map((v) => v.stadium.country)), [data]);
  const latest = data?.items.slice(0, 3) ?? [];

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <View style={styles.greetingRow}>
        <Text style={[type.titulo, styles.greeting]} accessibilityRole="header">
          Olá{firstName ? `, ${firstName}` : ""}!
        </Text>
        <Text style={[type.rotulo, styles.motto]}>Explorar{"\n"}Colecionar{"\n"}Viver o futebol</Text>
      </View>

      <StadiumSearch />

      <Ticket bleed innerStyle={styles.mapCard}>
        <View style={styles.mapRow}>
          <View
            style={styles.map}
            accessible
            accessibilityRole="image"
            accessibilityLabel={countries.size ? `Mapa-múndi com ${countries.size} ${countries.size === 1 ? "país carimbado" : "países carimbados"}` : "Mapa-múndi"}
          >
            <PassportMap visited={countries} />
          </View>
          <Text style={[type.rotulo, styles.mapNote]}>O mundo{"\n"}também{"\n"}joga aqui</Text>
        </View>
        <View style={styles.mapFoot}>
          <Text style={styles.mapCaption}>
            {countries.size ? `${countries.size} ${countries.size === 1 ? "país carimbado" : "países carimbados"}` : "Seu primeiro carimbo pinta o país no mapa"}
          </Text>
          <Pressable onPress={() => router.navigate("/mapa")} hitSlop={8} accessibilityRole="link">
            <Text style={styles.seeAll}>Explorar ›</Text>
          </Pressable>
        </View>
      </Ticket>

      <Pressable onPress={() => router.navigate("/passaporte")} accessibilityRole="button" style={styles.passport}>
        <View style={styles.passportHead}>
          <Text style={[type.titulo, styles.passportTitle]}>Meu Passaporte</Text>
          <KitIcon name="passport" size={30} />
        </View>
        <View style={styles.counters}>
          <Counter value={data?.totals.stamps ?? 0} one="carimbo" many="carimbos" divider />
          <Counter value={data?.totals.stadiums ?? 0} one="estádio" many="estádios" />
        </View>
      </Pressable>

      <Pressable onPress={() => router.navigate("/estatisticas")} accessibilityRole="button" style={styles.row}>
        <View style={styles.rowLeft}>
          <KitIcon name="stats" size={22} />
          <Text style={styles.rowText}>Sua jornada em números</Text>
        </View>
        <KitIcon name="arrow-right" size={20} />
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[type.titulo, styles.sectionTitle]} accessibilityRole="header">
            Últimos carimbos
          </Text>
          {latest.length > 0 && (
            <Pressable onPress={() => router.navigate("/passaporte")} hitSlop={8}>
              <Text style={styles.seeAll}>Ver todos ›</Text>
            </Pressable>
          )}
        </View>
        {loading && !data ? (
          <ActivityIndicator color={colors.estadio} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : latest.length ? (
          latest.map((v) => <VisitStamp key={v.id} visit={v} onPress={() => router.push({ pathname: "/carimbo/[id]", params: { id: v.id } })} />)
        ) : (
          <EmptyState icon="stamp-visita" title="Seu passaporte está em branco" text="Registre a primeira visita a um estádio ou uma partida que você viu ao vivo." />
        )}
      </View>

      <Nearby />

      <Button icon={<KitIcon name="camera-ai" size={30} />} onPress={() => router.push("/registrar")}>
        Adicionar carimbo
      </Button>
    </Screen>
  );
}

function Counter({ value, one, many, divider }: { value: number; one: string; many: string; divider?: boolean }) {
  const label = value === 1 ? one : many;
  return (
    <View style={[styles.counter, divider && styles.counterDivider]} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[type.titulo, styles.counterValue]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

/** Mapa-múndi com os países carimbados em amarelo (mesmos dados do web). */
function PassportMap({ visited }: { visited: Set<string> }) {
  return (
    <Svg viewBox={WORLD_MAP_VIEWBOX} width="100%" height="100%">
      {WORLD_MAP_COUNTRIES.map((c, i) => {
        const on = visited.has(c.iso3);
        return <Path key={`${c.iso3}-${i}`} d={c.d} fill={on ? colors.ingresso : colors.estadio} stroke={on ? colors.estadio : colors.marfim} strokeWidth={0.5} />;
      })}
    </Svg>
  );
}

/** Busca de estádios e cidades em todos os países (mesma rota do registro). */
function StadiumSearch() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StadiumSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    const term = q.trim();
    if (term.length < 2) return setResults(null);
    setLoading(true);
    try {
      setResults(await visitsApi(token).searchStadiums(term));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.searchWrap}>
      <View style={styles.search}>
        <KitIcon name="search" size={22} />
        <TextInput
          value={q}
          onChangeText={(t) => {
            setQ(t);
            if (!t) setResults(null);
          }}
          onSubmitEditing={search}
          placeholder="Estádio ou cidade"
          placeholderTextColor={colors.suave}
          accessibilityLabel="Buscar estádio ou cidade"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>
      {loading && <ActivityIndicator color={colors.estadio} />}
      {results && !loading && (
        <View style={styles.searchResults}>
          {results.length ? (
            results.slice(0, 8).map((s) => <StadiumRow key={s.id} stadium={s} />)
          ) : (
            <Text style={type.suave}>Nenhum estádio ou cidade encontrado.</Text>
          )}
        </View>
      )}
    </View>
  );
}

/** Estádios perto: só pede a localização ao tocar (ou carrega direto se a permissão já foi dada). */
function Nearby() {
  const { token } = useAuth();
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; items: NearbyStadium[]; message?: string }>({ status: "idle", items: [] });

  async function locate(ask: boolean) {
    try {
      const perm = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        if (ask) setState({ status: "error", items: [], message: "Permissão de localização negada." });
        return;
      }
      setState({ status: "loading", items: [] });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const items = await visitsApi(token).nearbyStadiums(pos.coords.latitude, pos.coords.longitude, 100);
      setState({ status: "done", items: items.slice(0, 3) });
    } catch {
      setState({ status: "error", items: [], message: "Não foi possível obter sua localização." });
    }
  }

  useEffect(() => {
    locate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[type.titulo, styles.sectionTitle]} accessibilityRole="header">
          Estádios perto de você
        </Text>
        <Pressable onPress={() => router.navigate("/mapa")} hitSlop={8}>
          <Text style={styles.seeAll}>Mapa ›</Text>
        </Pressable>
      </View>
      {(state.status === "idle" || state.status === "error") && (
        <View style={styles.nearbyAsk}>
          {state.message && <Text style={styles.error}>{state.message}</Text>}
          <Text style={type.corpo}>Veja os estádios do catálogo a até 100 km de onde você está.</Text>
          <Button variant="secundario" onPress={() => locate(true)} icon={<KitIcon name="location-pin" size={22} />}>
            Usar minha localização
          </Button>
        </View>
      )}
      {state.status === "loading" && <ActivityIndicator color={colors.estadio} />}
      {state.status === "done" &&
        (state.items.length ? (
          state.items.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.nearby, pressed && { opacity: 0.85 }]}
              onPress={() => router.push({ pathname: "/estadio/[id]", params: { id: s.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}, ${number.format(s.distanceKm)} km`}
            >
              <StadiumThumb url={s.thumbUrl} size={88} />
              <View style={styles.nearbyInfo}>
                <Text style={[type.titulo, styles.nearbyName]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={type.suave} numberOfLines={1}>
                  {place(s)}
                </Text>
                <View style={styles.rowLeft}>
                  <KitIcon name="location-pin" size={16} />
                  <Text style={styles.km}>{number.format(s.distanceKm)} km</Text>
                </View>
              </View>
              <KitIcon name="arrow-right" size={20} />
            </Pressable>
          ))
        ) : (
          <Text style={type.suave}>Nenhum estádio do catálogo a até 100 km.</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  greetingRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  greeting: { fontSize: 36, flexShrink: 1 },
  motto: { fontSize: 11, lineHeight: 14, textAlign: "right" },
  searchWrap: { gap: 10 },
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
  searchResults: { gap: 8 },
  mapCard: { padding: 12 },
  mapRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  map: { flex: 1, aspectRatio: 720 / 320 },
  mapNote: { fontSize: 9, lineHeight: 11, textAlign: "right" },
  mapFoot: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mapCaption: { flex: 1, fontFamily: font.displayMedium, fontSize: 16, color: colors.estadio },
  passport: { gap: 12, padding: 18, borderRadius: radius.cartao, borderWidth: 1, borderColor: "rgba(18,58,50,0.1)", backgroundColor: colors.marfim },
  passportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passportTitle: { fontSize: 24 },
  counters: { flexDirection: "row" },
  counter: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 },
  counterDivider: { borderRightWidth: 1, borderRightColor: colors.linha },
  counterValue: { fontSize: 44 },
  counterLabel: { fontFamily: font.displayMedium, fontSize: 18, color: colors.estadio },
  row: {
    minHeight: 52,
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
  rowText: { fontFamily: font.displaySemi, fontSize: 18, color: colors.estadio },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  sectionTitle: { fontSize: 28, flexShrink: 1 },
  seeAll: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  error: { fontFamily: font.sans, fontSize: 14, color: colors.erro },
  nearbyAsk: { gap: 12, padding: 16, borderRadius: radius.cartao, borderWidth: 1, borderStyle: "dashed", borderColor: colors.linha, backgroundColor: "rgba(255,255,255,0.6)" },
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
  nearbyInfo: { flex: 1, gap: 2 },
  nearbyName: { fontSize: 19 },
  km: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
});

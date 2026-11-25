import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import type { NearbyStadium } from "@shared/api-types";
import { SPORT_COPY, venuePlural, venueWord } from "@shared/sport-copy";
import { SPORT_INFO, SPORTS, type Sport } from "@shared/sports";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/button";
import { CountryPicker } from "@/components/country-picker";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { StadiumRow } from "@/components/stadium-bits";
import { WorldMap } from "@/components/world-map";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { catalogApi, useLoad } from "@/lib/catalog";
import { visitsApi } from "@/lib/visits";
import { Chip } from "@/components/visit-bits";
import { colors, font, radius, type } from "@/theme";

const DEFAULT_COUNTRY = "BRA";
const TOP = 5;

const NEAR_KM = 100;

export default function MapaScreen() {
  const { token } = useAuth();
  const [sport, setSport] = useState<Sport>("futebol");
  const [selected, setSelected] = useState(DEFAULT_COUNTRY);
  // Filtro de esporte: países, ranking e próximos jogos só daquele esporte
  const countries = useLoad(() => catalogApi.countries(sport), [sport]);
  const top = useLoad(() => catalogApi.stadiums(selected, { sport }), [selected, sport]);
  const available = useMemo(() => new Set((countries.data ?? []).map((c) => c.iso3)), [countries.data]);
  const country = countries.data?.find((c) => c.iso3 === selected);
  const [near, setNear] = useState<{ loading: boolean; error: string | null; items: NearbyStadium[] | null }>({ loading: false, error: null, items: null });

  // País sem locais do esporte escolhido: passa para o Brasil ou o primeiro da lista
  useEffect(() => {
    const list = countries.data;
    if (!list?.length || list.some((c) => c.iso3 === selected)) return;
    setSelected(list.some((c) => c.iso3 === DEFAULT_COUNTRY) ? DEFAULT_COUNTRY : list[0].iso3);
  }, [countries.data, selected]);

  function chooseSport(s: Sport) {
    setSport(s);
    setNear({ loading: false, error: null, items: null });
  }

  /** Locais do esporte a até 100 km do aparelho; seleciona o país do mais perto (a posição não é gravada). */
  async function locate() {
    setNear({ loading: true, error: null, items: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return setNear({ loading: false, error: "Permissão de localização negada.", items: null });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const items = await visitsApi(token).nearbyStadiums(pos.coords.latitude, pos.coords.longitude, NEAR_KM, sport);
      setNear({ loading: false, error: null, items });
      if (items[0]?.country) setSelected(items[0].country);
    } catch {
      setNear({ loading: false, error: "Não foi possível obter sua localização.", items: null });
    }
  }

  return (
    <Screen>
      <View>
        <Text style={[type.titulo, styles.title]} accessibilityRole="header">
          Mapa
        </Text>
        <Text style={type.suave}>Explore estádios e arenas pelo mundo</Text>
      </View>

      <View style={styles.chips} accessibilityLabel="Esporte">
        {SPORTS.map((s) => (
          <Chip key={s} label={SPORT_INFO[s].label} active={sport === s} onPress={() => chooseSport(s)} />
        ))}
      </View>

      <View style={styles.mapBox}>
        <Text style={[type.rotulo, styles.mapLabel]}>Mapa-múndi · toque num país</Text>
        <View style={styles.map}>
          <WorldMap selected={selected} available={available} onSelect={setSelected} />
        </View>
        <Text style={styles.small}>Mapa: Natural Earth · Dados: Wikidata</Text>
      </View>

      {countries.data && <CountryPicker countries={countries.data} selected={selected} onSelect={setSelected} />}

      <Button variant="secundario" loading={near.loading} onPress={locate} icon={<KitIcon name="location-pin" size={20} />}>
        {`${venuePlural(sport)} perto de mim`}
      </Button>
      {near.error && <Text style={styles.errorText}>{near.error}</Text>}
      {near.items && (
        <View style={styles.list}>
          <Text style={[type.titulo, styles.subtitle]} accessibilityRole="header">
            Perto de você · {SPORT_INFO[sport].label}
          </Text>
          {near.items.length ? (
            near.items.slice(0, 8).map((s) => <StadiumRow key={s.id} stadium={s} />)
          ) : (
            <Text style={type.suave}>
              Nenhum {venueWord(sport)} de {SPORT_INFO[sport].label.toLowerCase()} no catálogo a até {NEAR_KM} km.
            </Text>
          )}
        </View>
      )}

      <View style={styles.headRow}>
        <Text style={[type.titulo, styles.subtitle]} accessibilityRole="header" numberOfLines={2}>
          {venuePlural(sport)}: {country?.name ?? selected}
        </Text>
        {top.data && <Text style={type.suave}>{top.data.total} no catálogo</Text>}
      </View>

      {top.loading ? (
        <ActivityIndicator color={colors.estadio} style={styles.loading} />
      ) : top.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{top.error}</Text>
          <Button variant="secundario" onPress={top.reload}>
            Tentar de novo
          </Button>
        </View>
      ) : top.data?.items.length ? (
        <View style={styles.list}>
          {top.data.items.slice(0, TOP).map((s, i) => (
            <StadiumRow key={s.id} stadium={s} position={i + 1} />
          ))}
        </View>
      ) : (
        <Text style={type.suave}>
          {sport === "futebol"
            ? "Ainda não há estádios deste país no catálogo."
            : `Ainda não há ginásios ou arenas de ${SPORT_INFO[sport].label.toLowerCase()} deste país no catálogo. Ao registrar um carimbo, você pode cadastrar o local.`}
        </Text>
      )}
      <Text style={styles.small}>
        {SPORT_COPY[sport].source
          ? `Próximo jogo (${SPORT_COPY[sport].source}) nos próximos 30 dias, no local do mandante.`
          : `Ainda não temos uma fonte de jogos de ${SPORT_INFO[sport].label.toLowerCase()}.`}
      </Text>

      <Button
        icon={<KitIcon name="arrow-right" size={20} />}
        onPress={() => router.push({ pathname: "/estadios", params: { pais: selected, nome: country?.name ?? selected, esporte: sport } })}
      >
        {`Ver todos: ${venuePlural(sport).toLowerCase()}`}
      </Button>

      <Text style={[styles.small, styles.link]} accessibilityRole="link" onPress={() => Linking.openURL(`${API_URL}/creditos`)}>
        Créditos das imagens e fontes de dados
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34 },
  mapBox: { borderWidth: 4, borderColor: colors.ingresso, borderRadius: radius.cartao, backgroundColor: colors.branco, padding: 12, gap: 8 },
  mapLabel: { fontSize: 11, color: colors.suave },
  map: { width: "100%", aspectRatio: 720 / 320 },
  headRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  subtitle: { fontSize: 24, flexShrink: 1 },
  list: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  loading: { paddingVertical: 24 },
  errorBox: { gap: 12 },
  errorText: { fontFamily: font.sans, color: colors.erro },
  small: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  link: { textDecorationLine: "underline" },
});

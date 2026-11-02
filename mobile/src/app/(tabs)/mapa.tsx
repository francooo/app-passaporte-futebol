import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/button";
import { CountryPicker } from "@/components/country-picker";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { StadiumRow } from "@/components/stadium-bits";
import { WorldMap } from "@/components/world-map";
import { API_URL } from "@/lib/api";
import { catalogApi, useLoad } from "@/lib/catalog";
import { colors, font, radius, type } from "@/theme";

const DEFAULT_COUNTRY = "BRA";
const TOP = 5;

export default function MapaScreen() {
  const [selected, setSelected] = useState(DEFAULT_COUNTRY);
  const countries = useLoad(() => catalogApi.countries(), []);
  const top = useLoad(() => catalogApi.stadiums(selected), [selected]);
  const available = useMemo(() => new Set((countries.data ?? []).map((c) => c.iso3)), [countries.data]);
  const country = countries.data?.find((c) => c.iso3 === selected);

  return (
    <Screen>
      <View>
        <Text style={[type.titulo, styles.title]} accessibilityRole="header">
          Mapa dos estádios
        </Text>
        <Text style={type.suave}>Explore o futebol pelo mundo</Text>
      </View>

      <View style={styles.mapBox}>
        <Text style={[type.rotulo, styles.mapLabel]}>Mapa-múndi · toque num país</Text>
        <View style={styles.map}>
          <WorldMap selected={selected} available={available} onSelect={setSelected} />
        </View>
        <Text style={styles.small}>Mapa: Natural Earth · Dados: Wikidata</Text>
      </View>

      {countries.data && <CountryPicker countries={countries.data} selected={selected} onSelect={setSelected} />}

      <View style={styles.headRow}>
        <Text style={[type.titulo, styles.subtitle]} accessibilityRole="header" numberOfLines={2}>
          Estádios: {country?.name ?? selected}
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
        <Text style={type.suave}>Ainda não há estádios deste país no catálogo.</Text>
      )}

      <Button
        icon={<KitIcon name="arrow-right" size={20} />}
        onPress={() => router.push({ pathname: "/estadios", params: { pais: selected, nome: country?.name ?? selected } })}
      >
        Ver todos os estádios
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
  loading: { paddingVertical: 24 },
  errorBox: { gap: 12 },
  errorText: { fontFamily: font.sans, color: colors.erro },
  small: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  link: { textDecorationLine: "underline" },
});

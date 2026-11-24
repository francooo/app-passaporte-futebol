import { SPORT_INFO } from "@shared/sports";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { BittenCard, PerforatedFrame } from "@/components/ticket";
import { Chip, EmptyState, VisitStamp } from "@/components/visit-bits";
import { useAuth } from "@/lib/auth-context";
import { useLoad, useReloadOnFocus } from "@/lib/catalog";
import { visitsApi } from "@/lib/visits";
import { colors, font, type } from "@/theme";

const kinds = [
  { value: "", label: "Todos" },
  { value: "partida", label: "Partidas" },
  { value: "visita", label: "Visitas" },
];

export default function PassaporteScreen() {
  const { token } = useAuth();
  const [tipo, setTipo] = useState("");
  const [ano, setAno] = useState("");
  const [competicao, setCompeticao] = useState("");
  const [esporte, setEsporte] = useState("");
  const [view, setView] = useState<"blocos" | "lista">("blocos");
  const { data, error, loading, reload } = useLoad(() => visitsApi(token).list({ tipo, ano, competicao, esporte }), [token, tipo, ano, competicao, esporte]);
  useReloadOnFocus(reload);

  const filtered = Boolean(tipo || ano || competicao || esporte);
  // Só futebol: "estádios"; com outros esportes: "locais" (ginásios e arenas)
  const onlyFootball = (data?.sports ?? []).every((s) => s === "futebol");
  const add = () => router.push("/registrar");

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <View>
        <Text style={[type.titulo, styles.title]} accessibilityRole="header">
          Meu Passaporte
        </Text>
        <Text style={styles.subtitle}>Suas visitas, suas histórias.</Text>
      </View>

      <PerforatedFrame bleed style={styles.frame}>
        <BittenCard style={styles.counters}>
          <Counter value={data?.totals.stamps ?? 0} one="carimbo" many="carimbos" divider />
          <Counter value={data?.totals.stadiums ?? 0} one={onlyFootball ? "estádio" : "local"} many={onlyFootball ? "estádios" : "locais"} />
        </BittenCard>

        {data && data.totals.stamps > 0 && (
          <View style={styles.filters}>
            {data.sports.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="Esporte">
                <Chip label="Todos os esportes" active={!esporte} onPress={() => setEsporte("")} />
                {data.sports.map((s) => (
                  <Chip
                    key={s}
                    label={SPORT_INFO[s].label}
                    active={esporte === s}
                    onPress={() => {
                      setEsporte(s);
                      // As competições mudam com o esporte
                      setCompeticao("");
                    }}
                  />
                ))}
              </ScrollView>
            )}
            <View style={styles.row}>
              {kinds.map((k) => (
                <Chip key={k.label} label={k.label} active={tipo === k.value} onPress={() => setTipo(k.value)} />
              ))}
            </View>
            <View style={styles.row} accessibilityLabel="Exibição">
              <Chip label="Blocos" active={view === "blocos"} onPress={() => setView("blocos")} />
              <Chip label="Lista" active={view === "lista"} onPress={() => setView("lista")} />
            </View>
            {data.years.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                <Chip label="Todos os anos" active={!ano} onPress={() => setAno("")} />
                {data.years.map((y) => (
                  <Chip key={y} label={String(y)} active={ano === String(y)} onPress={() => setAno(String(y))} />
                ))}
              </ScrollView>
            )}
            {data.competitions.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                <Chip label="Todas as competições" active={!competicao} onPress={() => setCompeticao("")} />
                {data.competitions.map((c) => (
                  <Chip key={c} label={c} active={competicao === c} onPress={() => setCompeticao(c)} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {loading && !data ? (
          <ActivityIndicator color={colors.estadio} style={styles.loading} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Button variant="secundario" onPress={reload}>
              Tentar de novo
            </Button>
          </View>
        ) : data && data.items.length > 0 ? (
          data.items.map((v) => <VisitStamp key={v.id} visit={v} view={view} onPress={() => router.push({ pathname: "/carimbo/[id]", params: { id: v.id } })} />)
        ) : (
          <EmptyState
            title={filtered ? "Nenhum carimbo com esses filtros" : "Seu passaporte está em branco"}
            text={filtered ? "Mude os filtros para ver outros carimbos." : "Registre a primeira visita a um estádio ou uma partida que você viu ao vivo."}
          />
        )}

        <Button icon={<KitIcon name="camera-ai" size={30} />} style={styles.add} onPress={add}>
          Adicionar carimbo
        </Button>
      </PerforatedFrame>
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

const styles = StyleSheet.create({
  title: { fontSize: 46 },
  subtitle: { fontFamily: font.displayMedium, fontSize: 20, letterSpacing: 0.4, color: colors.tinta, marginTop: 2 },
  frame: { gap: 12, paddingVertical: 16, paddingHorizontal: 20 },
  counters: { flexDirection: "row", paddingVertical: 16 },
  counter: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 },
  counterDivider: { borderRightWidth: 1, borderRightColor: colors.linha },
  counterValue: { fontSize: 46 },
  counterLabel: { fontFamily: font.displayMedium, fontSize: 20, color: colors.estadio },
  filters: { gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  loading: { paddingVertical: 32 },
  errorBox: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.marfim },
  error: { fontFamily: font.sans, fontSize: 15, color: colors.erro },
  add: { borderWidth: 2, borderColor: colors.ingressoEscuro },
});

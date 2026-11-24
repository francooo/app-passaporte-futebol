import { SPORT_INFO } from "@shared/sports";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import type { FanStats } from "@shared/api-types";
import { Button } from "@/components/button";
import { KitIcon, type KitIconName } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { StadiumThumb } from "@/components/stadium-bits";
import { PerforatedFrame } from "@/components/ticket";
import { Chip, EmptyState, Panel, TeamCrest } from "@/components/visit-bits";
import { useAuth } from "@/lib/auth-context";
import { useLoad, useReloadOnFocus } from "@/lib/catalog";
import { visitsApi } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";

const number = new Intl.NumberFormat("pt-BR");
const plural = (n: number, one: string, many: string) => `${number.format(n)} ${n === 1 ? one : many}`;

/** "Sua jornada em números" (tela 04 do kit v06), com os mesmos dados do web. */
export default function EstatisticasScreen() {
  const { token } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const { data: s, error, loading, reload } = useLoad(() => visitsApi(token).stats(teamId), [token, teamId]);
  useReloadOnFocus(reload);
  const total = s ? s.matches + s.visits : 0;
  // Com outros esportes: "locais" (ginásios e arenas) e as partidas separadas por esporte
  const multi = (s?.bySport ?? []).some((b) => b.sport !== "futebol");

  return (
    <Screen refreshing={loading && !!s} onRefresh={reload}>
      <View>
        <Text style={[type.titulo, styles.title]} accessibilityRole="header">
          Sua jornada em números
        </Text>
        <Text style={styles.subtitle}>Veja até onde o esporte já te levou.</Text>
      </View>

      {loading && !s ? (
        <ActivityIndicator color={colors.estadio} style={{ paddingVertical: 48 }} />
      ) : error || !s ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.error}>{error ?? "Não foi possível carregar."}</Text>
          <Button variant="secundario" onPress={reload}>
            Tentar de novo
          </Button>
        </View>
      ) : total === 0 ? (
        <EmptyState icon="stats" title="Ainda não há números para mostrar" text="Registre visitas e partidas: países, estádios, km viajados e o desempenho do seu time aparecem aqui.">
          <Button icon={<KitIcon name="camera-ai" size={26} />} onPress={() => router.push("/registrar")}>
            Adicionar carimbo
          </Button>
        </EmptyState>
      ) : (
        <>
          <PerforatedFrame bleed style={styles.frame}>
            <View style={styles.tiles}>
              <Tile icon="globe" value={s.countries} label={s.countries === 1 ? "país" : "países"} />
              <Tile
                icon={multi ? "arena" : "stadium"}
                value={s.stadiums}
                label={multi ? (s.stadiums === 1 ? "local" : "locais") : s.stadiums === 1 ? "estádio" : "estádios"}
              />
              <Tile icon={multi ? "trophy" : "football"} value={s.matches} label={s.matches === 1 ? "partida" : "partidas"} />
              {s.km != null ? (
                <Tile icon="plane" value={s.km} label="km viajados" />
              ) : (
                <Pressable style={styles.tile} onPress={() => router.navigate("/perfil")} accessibilityRole="button" accessibilityLabel="Informe sua cidade no Perfil para calcular os km viajados">
                  <KitIcon name="plane" size={30} />
                  <Text style={styles.tileLabel}>km viajados</Text>
                  <Text style={styles.tileHint}>Informe sua cidade no Perfil</Text>
                </Pressable>
              )}
            </View>
          </PerforatedFrame>

          <Panel title="Registros por ano">
            {s.byYear.length ? <YearBars data={s.byYear} /> : <Text style={type.suave}>Seus registros ainda não têm data.</Text>}
          </Panel>

          <Panel title="Desempenho do seu time">
            {s.team ? (
              <>
                {s.teamsSeen.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {s.teamsSeen.map((t) => (
                      <Chip key={t.id} label={t.name} active={t.id === s.team!.team.id} onPress={() => setTeamId(t.id)} />
                    ))}
                  </ScrollView>
                )}
                <View style={styles.teamRow}>
                  <TeamCrest team={s.team.team} size={44} />
                  <Text style={[type.titulo, styles.teamName]}>{s.team.team.name}</Text>
                </View>
                {s.team.winRate != null ? (
                  <View style={styles.teamRow}>
                    <WinRing rate={s.team.winRate} />
                    <Text style={[type.titulo, styles.rate]}>
                      {s.team.winRate}%{"\n"}
                      <Text style={styles.rateLabel}>vitórias</Text>
                    </Text>
                  </View>
                ) : (
                  <Text style={type.suave}>Sem placar registrado nas partidas desse time.</Text>
                )}
                <Text style={styles.record}>
                  {plural(s.team.wins, "vitória", "vitórias")} · {plural(s.team.draws, "empate", "empates")} · {plural(s.team.losses, "derrota", "derrotas")}
                </Text>
                <Text style={type.suave}>Nas partidas que você registrou com esse time em campo.</Text>
              </>
            ) : (
              <Text style={type.suave}>Registre partidas de futebol para ver o desempenho do seu time quando você está no estádio.</Text>
            )}
          </Panel>

          {multi && (
            <Panel title="Partidas por esporte">
              {s.bySport.map((b) => (
                <View key={b.sport} style={styles.sportRow}>
                  <KitIcon name={SPORT_INFO[b.sport].icon} size={24} />
                  <Text style={[type.corpo, styles.flex1]}>{SPORT_INFO[b.sport].label}</Text>
                  <Text style={[type.titulo, styles.sportCount]}>{b.matches}</Text>
                </View>
              ))}
            </Panel>
          )}
          <Panel title={multi ? "Maiores locais que você visitou" : "Maiores estádios que você visitou"} subtitle="Ranking por capacidade">
            {s.biggestStadiums.length ? (
              s.biggestStadiums.map((st, i) => (
                <Pressable
                  key={st.id}
                  onPress={() => router.push({ pathname: "/estadio/[id]", params: { id: st.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}º, ${st.name}, ${number.format(st.capacity)} lugares`}
                  style={({ pressed }) => [styles.rank, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.rankPos}>
                    <Text style={styles.rankPosText}>{i + 1}</Text>
                  </View>
                  <StadiumThumb url={st.thumbUrl} size={44} />
                  <View style={styles.flex}>
                    <Text style={styles.rankName} numberOfLines={1}>
                      {st.name}
                    </Text>
                    {st.city && (
                      <Text style={type.suave} numberOfLines={1}>
                        {st.city}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.rankCap}>{number.format(st.capacity)}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={type.suave}>Os locais que você registrou não têm capacidade informada.</Text>
            )}
          </Panel>

          <Text style={type.suave}>
            {plural(total, "registro", "registros")} no total ({plural(s.visits, "visita", "visitas")} e {plural(s.matches, "partida", "partidas")}).
            {s.km != null ? ` Distâncias em linha reta, ida e volta a partir de ${s.homeCity?.split(",")[0]}.` : ""}
          </Text>
        </>
      )}
    </Screen>
  );
}

function Tile({ icon, value, label }: { icon: KitIconName; value: number; label: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${number.format(value)} ${label}`}>
      <KitIcon name={icon} size={30} />
      <Text style={[type.titulo, styles.tileValue]} adjustsFontSizeToFit numberOfLines={1}>
        {number.format(value)}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

/** Barras por ano (uma série, cor estádio) com rótulo direto; anos vazios entre o primeiro e o último aparecem com zero. */
function YearBars({ data }: { data: FanStats["byYear"] }) {
  const last = data.at(-1)!.year;
  const first = Math.max(data[0].year, last - 5);
  const counts = new Map(data.map((d) => [d.year, d.count]));
  const years = Array.from({ length: last - first + 1 }, (_, i) => ({ year: first + i, count: counts.get(first + i) ?? 0 }));
  const max = Math.max(...years.map((y) => y.count), 1);
  const H = 150;
  return (
    <View accessible accessibilityLabel={years.map((y) => `${y.year}: ${y.count}`).join(", ")}>
      <View style={[styles.bars, { height: H + 28 }]}>
        {years.map((y) => (
          <View key={y.year} style={styles.barCol}>
            {y.count > 0 && <Text style={styles.barValue}>{y.count}</Text>}
            <View style={[styles.bar, { height: Math.max((y.count / max) * H, y.count ? 4 : 0) }]} />
          </View>
        ))}
      </View>
      <View style={styles.barAxis}>
        {years.map((y) => (
          <Text key={y.year} style={styles.barYear}>
            {y.year}
          </Text>
        ))}
      </View>
    </View>
  );
}

function WinRing({ rate }: { rate: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={110} height={110} viewBox="0 0 100 100" accessibilityLabel={`${rate}% de vitórias`}>
      <Circle cx="50" cy="50" r={r} fill="none" stroke={colors.linha} strokeWidth="10" />
      {rate > 0 && (
        <Circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={colors.ingresso}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(rate / 100) * c} ${c}`}
          transform="rotate(-90 50 50)"
        />
      )}
      <SvgText x="50" y="58" textAnchor="middle" fill={colors.estadio} fontSize="22" fontFamily={font.display}>
        {`${rate}%`}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  sportRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  flex1: { flex: 1 },
  sportCount: { fontSize: 22 },
  title: { fontSize: 40, lineHeight: 46 },
  subtitle: { fontFamily: font.displayMedium, fontSize: 18, color: colors.tinta, marginTop: 2 },
  error: { fontFamily: font.sans, fontSize: 15, color: colors.erro },
  frame: { paddingVertical: 14, paddingHorizontal: 20 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48.5%", flexGrow: 1, alignItems: "center", gap: 2, paddingVertical: 14, paddingHorizontal: 8, borderRadius: radius.cartao, backgroundColor: colors.marfim },
  tileValue: { fontSize: 36 },
  tileLabel: { fontFamily: font.displayMedium, fontSize: 17, color: colors.tinta },
  tileHint: { fontFamily: font.sans, fontSize: 12, color: colors.estadio, textDecorationLine: "underline", textAlign: "center" },
  row: { flexDirection: "row", gap: 8 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  teamName: { fontSize: 24, flexShrink: 1 },
  rate: { fontSize: 44, lineHeight: 48 },
  rateLabel: { fontFamily: font.displayMedium, fontSize: 20 },
  record: { fontFamily: font.displayMedium, fontSize: 17, color: colors.tinta },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 2, borderBottomWidth: 1, borderBottomColor: colors.linha },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "70%", maxWidth: 56, backgroundColor: colors.estadio, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barValue: { fontFamily: font.displaySemi, fontSize: 16, color: colors.tinta, marginBottom: 4 },
  barAxis: { flexDirection: "row", gap: 2, marginTop: 6 },
  barYear: { flex: 1, textAlign: "center", fontFamily: font.sans, fontSize: 13, color: colors.tinta },
  rank: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: radius.campo, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  rankPos: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.ingresso, alignItems: "center", justifyContent: "center" },
  rankPosText: { fontFamily: font.display, fontSize: 16, color: colors.estadio },
  flex: { flex: 1, minWidth: 0 },
  rankName: { fontFamily: font.displaySemi, fontSize: 16, color: colors.estadio },
  rankCap: { fontFamily: font.displaySemi, fontSize: 16, color: colors.tinta },
});

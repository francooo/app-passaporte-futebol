import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";
import type { TeamRef, VisitSummary } from "@shared/api-types";
import { remoteImage } from "@/lib/remote-image";
import { colors, font, radius, type } from "@/theme";
import { KitIcon } from "./kit-icon";
import { StampCard } from "./stamp-card";

/** Escudo do time: os do football-data costumam ser SVG (o Image do RN não desenha SVG). */
export function TeamCrest({ team, size = 40 }: { team: Pick<TeamRef, "crestUrl"> | null; size?: number }) {
  const url = team?.crestUrl;
  if (!url) return <KitIcon name="crest-stamp" size={size} />;
  if (/\.svg(\?|$)/i.test(url)) {
    return (
      <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SvgUri uri={url} width={size} height={size} />
      </View>
    );
  }
  return <Image source={remoteImage(url)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/** "Mandante 2 × 1 Visitante" com escudos (nome embaixo do escudo, como no kit mobile). */
export function Scoreline({
  home,
  away,
  homeScore,
  awayScore,
  size = 44,
}: {
  home: Pick<TeamRef, "name" | "crestUrl"> | null;
  away: Pick<TeamRef, "name" | "crestUrl"> | null;
  homeScore: number | null;
  awayScore: number | null;
  size?: number;
}) {
  return (
    <View
      style={styles.score}
      accessible
      accessibilityLabel={`${home?.name ?? "Mandante"} ${homeScore ?? "?"} a ${awayScore ?? "?"} ${away?.name ?? "Visitante"}`}
    >
      <View style={styles.team}>
        <TeamCrest team={home} size={size} />
        <Text style={styles.teamName} numberOfLines={2}>
          {home?.name ?? "Mandante"}
        </Text>
      </View>
      <Text style={[type.titulo, styles.goals, { fontSize: size * 0.8 }]}>
        {homeScore ?? "–"} <Text style={styles.times}>×</Text> {awayScore ?? "–"}
      </Text>
      <View style={styles.team}>
        <TeamCrest team={away} size={size} />
        <Text style={styles.teamName} numberOfLines={2}>
          {away?.name ?? "Visitante"}
        </Text>
      </View>
    </View>
  );
}

/** Carimbo de um registro no "Meu Passaporte" (selo com a foto do estádio). */
export function VisitStamp({ visit: v, onPress }: { visit: VisitSummary; onPress: () => void }) {
  const [y, m, d] = v.date ? v.date.split("-").map(Number) : [];
  return (
    <StampCard
      stadium={v.stadium.name}
      city={v.stadium.city ?? v.stadium.country}
      stateCode={v.stadium.state && v.stadium.state !== v.stadium.city ? v.stadium.state : undefined}
      kind={v.kind}
      date={v.date ? new Date(y, m - 1, d) : null}
      photo={v.stadium.thumbUrl ? remoteImage(v.stadium.thumbUrl) : null}
      tone={v.kind === "match" ? "azul" : "verde"}
      tag={v.result?.status === "pending" ? "Aguardando resultado" : v.predictionOutcome === "exact" ? "Palpite na mosca!" : null}
      onPress={onPress}
    />
  );
}

/** Botão-pílula de filtro (Todos / Partidas / Visitas / anos…). */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Caixa tracejada para listas vazias, com ação opcional. */
export function EmptyState({ icon = "passport", title, text, children }: { icon?: Parameters<typeof KitIcon>[0]["name"]; title: string; text?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <KitIcon name={icon} size={48} />
      <Text style={[type.titulo, styles.emptyTitle]}>{title}</Text>
      {text && <Text style={[type.suave, styles.center]}>{text}</Text>}
      {children}
    </View>
  );
}

/** Cartão branco com título (painéis de estatísticas, perfil…). */
export function Panel({ title, subtitle, children, style }: { title?: string; subtitle?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.panel, style]}>
      {title && (
        <View>
          <Text style={[type.titulo, styles.panelTitle]} accessibilityRole="header">
            {title}
          </Text>
          {subtitle && <Text style={type.suave}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

export const kindColors = { match: colors.partida, visit: colors.visita } as const;

const styles = StyleSheet.create({
  score: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  team: { flex: 1, alignItems: "center", gap: 4 },
  teamName: { fontFamily: font.displaySemi, fontSize: 15, color: colors.estadio, textAlign: "center" },
  goals: { color: colors.estadio },
  times: { fontSize: 20, color: colors.suave },
  chip: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(18,58,50,0.3)",
    backgroundColor: colors.branco,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.ingresso, borderColor: colors.ingresso },
  chipText: { fontFamily: font.displayMedium, fontSize: 17, color: colors.estadio },
  chipTextActive: { fontFamily: font.displaySemi },
  empty: {
    alignItems: "center",
    gap: 8,
    padding: 24,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.linha,
    backgroundColor: colors.marfim,
  },
  emptyTitle: { fontSize: 22, textAlign: "center" },
  center: { textAlign: "center" },
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  panelTitle: { fontSize: 24 },
});

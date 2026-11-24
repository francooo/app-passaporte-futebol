import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import type { TeamRef } from "@shared/api-types";
import { SPORT_INFO, type Sport } from "@shared/sports";
import { colors, font, radius, type } from "@/theme";
import { KitIcon } from "./kit-icon";
import { Stamp } from "./stamp";
import { TeamCrest } from "./team-crest";

export type VisitKind = "visit" | "match";

/** Confronto do carimbo de partida: escudos e placar final (null enquanto o jogo não termina). */
export type StampMatch = {
  home: Pick<TeamRef, "name" | "crestUrl"> | null;
  away: Pick<TeamRef, "name" | "crestUrl"> | null;
  homeScore: number | null;
  awayScore: number | null;
};

type Props = {
  stadium: string;
  city: string;
  stateCode?: string;
  kind: VisitKind;
  /** null = registro sem data */
  date: Date | null;
  photo?: ImageSourcePropType | null;
  tone?: "verde" | "azul";
  /** Etiqueta curta sob a cidade (ex.: "Aguardando resultado"). */
  tag?: string | null;
  match?: StampMatch | null;
  competition?: string | null;
  /** "row": cartão com o selo (padrão). "list": linha compacta da listagem. */
  layout?: "row" | "list";
  /** Esporte do carimbo (ícone e rótulo); padrão: futebol. */
  sport?: Sport;
  onPress?: () => void;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short" });

export function formatStampDate(date: Date | null) {
  if (!date) return "SEM DATA";
  return dateFormat.format(date).replace(/\./g, "").replace(/ de /g, " ").toUpperCase();
}

const matchLabel = (m: StampMatch) =>
  m.homeScore != null && m.awayScore != null
    ? `${m.home?.name ?? "Mandante"} ${m.homeScore} a ${m.awayScore} ${m.away?.name ?? "Visitante"}`
    : `${m.home?.name ?? "Mandante"} contra ${m.away?.name ?? "Visitante"}, resultado pendente`;

/** "[escudo] 2 × 5 [escudo]", com os nomes dos times ao lado quando há espaço. */
function MatchLine({ match: m, names, crest = 24 }: { match: StampMatch; names?: boolean; crest?: number }) {
  return (
    <View style={styles.matchLine}>
      {names && (
        <Text style={[styles.teamName, styles.teamHome]} numberOfLines={1}>
          {m.home?.name ?? "Mandante"}
        </Text>
      )}
      <TeamCrest team={m.home} size={crest} />
      <Text style={styles.score}>
        {m.homeScore ?? "–"} <Text style={styles.times}>×</Text> {m.awayScore ?? "–"}
      </Text>
      <TeamCrest team={m.away} size={crest} />
      {names && (
        <Text style={styles.teamName} numberOfLines={1}>
          {m.away?.name ?? "Visitante"}
        </Text>
      )}
    </View>
  );
}

/** Carimbo do "Meu Passaporte": selo, estádio/cidade, confronto (partidas), tipo escrito (VISITA/PARTIDA) e data. */
export function StampCard({ stadium, city, stateCode, kind, date, photo, tone, tag, match, competition, layout = "row", sport = "futebol", onPress }: Props) {
  const isMatch = kind === "match";
  const label = isMatch ? (sport === "futebol" ? "Partida" : `Partida · ${SPORT_INFO[sport].label}`) : "Visita";
  const contest = sport === "futebol" ? competition : [SPORT_INFO[sport].label, competition].filter(Boolean).join(" · ");
  const a11y = `${match ? `${matchLabel(match)}. ` : ""}${stadium}, ${city}. ${label}, ${formatStampDate(date)}${tag ? `. ${tag}` : ""}`;

  if (layout === "list") {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.card, styles.listCard, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.dateBlock}>
          {date ? (
            <>
              <Text style={[type.titulo, styles.day]}>{String(date.getDate()).padStart(2, "0")}</Text>
              <Text style={[type.rotulo, styles.monthYear]}>
                {shortMonth.format(date).replace(/\./g, "").toUpperCase()} {date.getFullYear()}
              </Text>
            </>
          ) : (
            <Text style={[type.rotulo, styles.monthYear]}>SEM DATA</Text>
          )}
        </View>
        <View style={styles.listInfo}>
          {match ? (
            <>
              <MatchLine match={match} crest={22} />
              <Text style={styles.teamsText} numberOfLines={1}>
                {match.home?.name ?? "Mandante"} × {match.away?.name ?? "Visitante"}
              </Text>
            </>
          ) : (
            <Text style={[type.titulo, styles.listStadium]} numberOfLines={1}>
              {stadium}
            </Text>
          )}
          <Text style={[type.suave, styles.small]} numberOfLines={1}>
            {match ? `${stadium} · ${contest || city}` : `Visita · ${city}`}
          </Text>
          {tag && <Text style={[type.rotulo, styles.tag]}>{tag}</Text>}
        </View>
        <KitIcon name="arrow-right" size={18} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.card, styles.cardColumn, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardRow}>
        <Stamp name={stadium} place={stateCode ? `${city} - ${stateCode}` : city} photo={photo} tone={tone} size={80} />
        <View style={styles.info}>
          <Text style={[type.titulo, styles.name]} numberOfLines={2}>
            {stadium}
          </Text>
          <View style={styles.cityRow}>
            <KitIcon name="location-pin" size={16} />
            <Text style={type.suave} numberOfLines={1}>
              {city}
            </Text>
          </View>
          {tag && <Text style={[type.rotulo, styles.tag]}>{tag}</Text>}
        </View>
        <View style={styles.kind}>
          <KitIcon name={isMatch ? SPORT_INFO[sport].icon : sport === "futebol" ? "stadium" : "arena"} size={32} />
          <Text style={[type.rotulo, styles.badge, { backgroundColor: isMatch ? colors.partida : colors.visita }]}>{isMatch ? "Partida" : "Visita"}</Text>
          {isMatch && sport !== "futebol" && <Text style={styles.sportLabel}>{SPORT_INFO[sport].label}</Text>}
          <Text style={styles.date}>{formatStampDate(date)}</Text>
        </View>
        <KitIcon name="arrow-right" size={20} />
      </View>
      {/* Confronto numa faixa de largura total: cabe com os nomes dos times */}
      {match && (
        <View style={styles.matchBand}>
          <MatchLine match={match} names />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.cartao,
    backgroundColor: colors.marfim,
    borderWidth: 1,
    borderColor: "rgba(18,58,50,0.1)",
    shadowColor: colors.estadio,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  info: {
    flex: 1,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.linha,
    paddingRight: 8,
  },
  name: { fontSize: 20 },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  kind: { width: 88, alignItems: "center", gap: 4 },
  badge: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  date: { fontFamily: font.displayMedium, fontSize: 13, color: colors.estadio },
  sportLabel: { fontFamily: font.displaySemi, fontSize: 12, color: colors.suave },
  tag: {
    alignSelf: "flex-start",
    marginTop: 6,
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.ingresso,
  },
  matchLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  score: { fontFamily: font.display, fontSize: 20, color: colors.estadio },
  times: { fontSize: 13, color: colors.suave },
  teamName: {
    flexShrink: 1,
    fontFamily: font.displaySemi,
    fontSize: 15,
    color: colors.estadio,
  },
  teamHome: { textAlign: "right" },
  listCard: { paddingVertical: 10 },
  cardColumn: { flexDirection: "column", alignItems: "stretch" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  matchBand: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.linha,
    borderStyle: "dashed",
    paddingTop: 2,
  },
  teamsText: {
    fontFamily: font.displaySemi,
    fontSize: 15,
    color: colors.estadio,
  },
  dateBlock: { width: 60, alignItems: "center" },
  day: { fontSize: 28, lineHeight: 30 },
  monthYear: { fontSize: 10, color: colors.estadio, textAlign: "center" },
  listInfo: { flex: 1, minWidth: 0, gap: 2 },
  listStadium: { fontSize: 18 },
  small: { fontSize: 13 },
});

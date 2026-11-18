import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { UpcomingMatch } from "@shared/api-types";
import { colors, font, type } from "@/theme";
import { KitIcon } from "./kit-icon";
import { TeamCrest } from "./visit-bits";

// Fuso do aparelho (sem timeZone fixo)
const when = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** "sáb, 22/11, 16:00" */
export function formatKickoff(utcDate: string) {
  return when.format(new Date(utcDate)).replace(/\./g, "").replace(/\s/g, " ");
}

/** Próximos jogos de um estádio (registro, busca e ranking do mapa; igual ao web): o primeiro visível, os demais ao expandir. */
export function UpcomingMatches({ matches }: { matches: UpcomingMatch[] }) {
  const [open, setOpen] = useState(false);
  if (!matches.length) return null;
  const rest = matches.length - 1;
  const shown = open ? matches : matches.slice(0, 1);

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <KitIcon name="calendar" size={14} />
        <Text style={[type.rotulo, styles.title]}>{matches.length === 1 ? "Próximo jogo neste estádio" : "Próximos jogos neste estádio"}</Text>
      </View>
      {shown.map((m) => (
        <View
          key={m.id}
          style={styles.match}
          accessible
          accessibilityLabel={`${m.home.name} contra ${m.away.name}, ${formatKickoff(m.utcDate)}, ${m.competition.name}`}
        >
          <View style={styles.teams}>
            <TeamCrest team={m.home} size={18} />
            <Text style={styles.team} numberOfLines={1}>
              {m.home.name}
            </Text>
            <Text style={styles.x}>×</Text>
            <TeamCrest team={m.away} size={18} />
            <Text style={styles.team} numberOfLines={1}>
              {m.away.name}
            </Text>
          </View>
          <Text style={styles.meta}>
            {formatKickoff(m.utcDate)} · {m.competition.name}
          </Text>
        </View>
      ))}
      {rest > 0 && (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={8}>
          <Text style={styles.more}>{open ? "Mostrar menos" : `+${rest} ${rest === 1 ? "jogo" : "jogos"}`}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.partida },
  head: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: { fontSize: 10 },
  match: { gap: 2 },
  teams: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  team: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio, flexShrink: 1 },
  x: { fontFamily: font.sans, fontSize: 13, color: colors.suave },
  meta: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  more: { fontFamily: font.sansSemi, fontSize: 13, color: colors.estadio, textDecorationLine: "underline" },
});

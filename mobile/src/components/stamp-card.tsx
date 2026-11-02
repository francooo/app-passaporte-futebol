import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import type { VisitKind } from "@/lib/demo-data";
import { colors, font, radius, type } from "@/theme";
import { KitIcon } from "./kit-icon";
import { Stamp } from "./stamp";

type Props = {
  stadium: string;
  city: string;
  stateCode?: string;
  kind: VisitKind;
  /** null = registro sem data */
  date: Date | null;
  photo?: ImageSourcePropType | null;
  tone?: "verde" | "azul";
  onPress?: () => void;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function formatStampDate(date: Date | null) {
  if (!date) return "SEM DATA";
  return dateFormat.format(date).replace(/\./g, "").replace(/ de /g, " ").toUpperCase();
}

/** Linha do "Meu Passaporte": selo, estádio/cidade, tipo escrito (VISITA/PARTIDA) e data. */
export function StampCard({ stadium, city, stateCode, kind, date, photo, tone, onPress }: Props) {
  const isMatch = kind === "match";
  const label = isMatch ? "Partida" : "Visita";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${stadium}, ${city}. ${label}, ${formatStampDate(date)}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
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
      </View>
      <View style={styles.kind}>
        <KitIcon name={isMatch ? "football" : "stadium"} size={32} />
        <Text style={[type.rotulo, styles.badge, { backgroundColor: isMatch ? colors.partida : colors.visita }]}>
          {label}
        </Text>
        <Text style={styles.date}>{formatStampDate(date)}</Text>
      </View>
      <KitIcon name="arrow-right" size={20} />
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
  info: { flex: 1, minWidth: 0, borderRightWidth: 1, borderRightColor: colors.linha, paddingRight: 8 },
  name: { fontSize: 20 },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  kind: { width: 88, alignItems: "center", gap: 4 },
  badge: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  date: { fontFamily: font.displayMedium, fontSize: 13, color: colors.estadio },
});

import { router } from "expo-router";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { PhotoCredit, StadiumSummary } from "@shared/api-types";
import { colors, font, radius, type } from "@/theme";
import { KitIcon } from "./kit-icon";

const number = new Intl.NumberFormat("pt-BR");

export function place(s: Pick<StadiumSummary, "city" | "state">) {
  return [s.city, s.state && s.state !== s.city ? s.state : null].filter(Boolean).join(", ") || "Local não informado";
}

/** Capacidade com o selo "a confirmar" quando a fonte é ambígua (igual ao web). */
export function Capacity({ value, needsReview, large }: { value: number | null; needsReview: boolean; large?: boolean }) {
  if (value == null) return <Text style={type.suave}>Capacidade não informada</Text>;
  return (
    <View style={styles.capacity}>
      <Text style={[styles.capacityValue, large && { fontSize: 34 }]}>{number.format(value)}</Text>
      <View style={styles.capacityRow}>
        <Text style={styles.capacityLabel}>lugares</Text>
        {needsReview && <Text style={[type.rotulo, styles.review]}>a confirmar</Text>}
      </View>
    </View>
  );
}

export function StadiumThumb({ url, size = 48 }: { url: string | null; size?: number }) {
  return (
    <View style={[styles.thumb, { width: size, height: size }]}>
      {url ? <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="cover" /> : <KitIcon name="stadium" size={size * 0.55} />}
    </View>
  );
}

/** Linha do ranking/lista: posição, foto, nome, local e capacidade. */
export function StadiumRow({ stadium, position }: { stadium: StadiumSummary; position?: number }) {
  const capacity = stadium.capacity != null ? `${number.format(stadium.capacity)} lugares` : "capacidade não informada";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/estadio/[id]", params: { id: stadium.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${position ? `${position}º, ` : ""}${stadium.name}, ${place(stadium)}, ${capacity}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      {position != null && (
        <View style={styles.rank}>
          <Text style={styles.rankText}>{position}º</Text>
        </View>
      )}
      <StadiumThumb url={stadium.thumbUrl} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {stadium.name}
        </Text>
        <Text style={type.suave} numberOfLines={1}>
          {place(stadium)}
        </Text>
      </View>
      <Capacity value={stadium.capacity} needsReview={stadium.capacityNeedsReview} />
    </Pressable>
  );
}

/** Crédito obrigatório das fotos do Commons (autor + licença + página do arquivo). */
export function PhotoCreditLine({ photo }: { photo: PhotoCredit }) {
  return (
    <Text style={styles.credit}>
      Foto: {photo.author ?? "autor não informado"} /{" "}
      <Text
        style={styles.link}
        accessibilityRole="link"
        onPress={photo.licenseUrl ? () => Linking.openURL(photo.licenseUrl!) : undefined}
      >
        {photo.license}
      </Text>
      {" · "}
      <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(photo.pageUrl)}>
        Wikimedia Commons
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  capacity: { alignItems: "flex-end" },
  capacityValue: { fontFamily: font.display, fontSize: 20, color: colors.estadio },
  capacityRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  capacityLabel: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  review: {
    fontSize: 10,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: colors.partida,
    overflow: "hidden",
  },
  thumb: {
    borderRadius: 8,
    backgroundColor: colors.partida,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  rank: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.estadio, alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: font.display, fontSize: 16, color: colors.ingresso },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.sansSemi, fontSize: 15, color: colors.estadio },
  credit: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  link: { textDecorationLine: "underline" },
});

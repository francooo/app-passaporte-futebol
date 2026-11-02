import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { Capacity, PhotoCreditLine, place } from "@/components/stadium-bits";
import { Ticket } from "@/components/ticket";
import { catalogApi, useLoad } from "@/lib/catalog";
import { remoteImage } from "@/lib/remote-image";
import { colors, font, radius, type } from "@/theme";

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.info}>
      <Text style={[type.rotulo, styles.infoLabel]}>{label}</Text>
      {children}
    </View>
  );
}

/** Detalhe do estádio: foto com crédito, capacidade, endereço, inauguração, clubes e links. */
export default function EstadioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, error, loading, reload } = useLoad(() => catalogApi.stadium(id), [id]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={styles.back}>
          <KitIcon name="back" size={22} />
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={colors.estadio} style={{ paddingVertical: 48 }} />
        ) : error || !s ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.error}>{error ?? "Estádio não encontrado."}</Text>
            <Button variant="secundario" onPress={reload}>
              Tentar de novo
            </Button>
          </View>
        ) : (
          <>
            <Ticket bleed innerStyle={styles.photoCard}>
              <View style={styles.photo}>
                {s.photo ? (
                  <Image
                    source={remoteImage(s.photo.url)}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    accessibilityLabel={`Foto do ${s.name}`}
                  />
                ) : (
                  <KitIcon name="stadium" size={80} />
                )}
              </View>
            </Ticket>
            {s.photo && <PhotoCreditLine photo={s.photo} />}

            <View>
              <Text style={[type.titulo, styles.name]} accessibilityRole="header">
                {s.name}
              </Text>
              <View style={styles.placeRow}>
                <KitIcon name="location-pin" size={18} />
                <Text style={type.suave}>
                  {place(s)} · {s.countryName}
                </Text>
              </View>
            </View>

            <View style={styles.capacityBox}>
              <Text style={[type.rotulo, { fontSize: 13 }]}>Capacidade</Text>
              <Capacity value={s.capacity} needsReview={s.capacityNeedsReview} large />
            </View>

            {(s.address || s.openedYear || s.clubs.length > 0 || s.website) && (
              <View style={styles.card}>
                {s.address && (
                  <Info label="Endereço">
                    <Text style={type.corpo}>{s.address}</Text>
                    {s.addressSource === "openstreetmap" && (
                      <Text style={styles.small} onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright")}>
                        © OpenStreetMap
                      </Text>
                    )}
                  </Info>
                )}
                {s.openedYear != null && (
                  <Info label="Inauguração">
                    <Text style={type.corpo}>{s.openedYear}</Text>
                  </Info>
                )}
                {s.clubs.length > 0 && (
                  <Info label={s.clubs.length > 1 ? "Clubes mandantes" : "Clube mandante"}>
                    <Text style={type.corpo}>{s.clubs.join(", ")}</Text>
                  </Info>
                )}
                {s.website && (
                  <Info label="Site oficial">
                    <Text style={[type.corpo, styles.link]} accessibilityRole="link" onPress={() => Linking.openURL(s.website!)}>
                      {s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </Text>
                  </Info>
                )}
              </View>
            )}

            <Button icon={<KitIcon name="camera-ai" size={26} />} onPress={() => router.navigate("/passaporte")}>
              Registrar visita
            </Button>
            {s.lat != null && s.lng != null && (
              <Button
                variant="secundario"
                onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=16/${s.lat}/${s.lng}`)}
              >
                Abrir no mapa
              </Button>
            )}

            {s.wikidataUrl && (
              <Text style={styles.small}>
                Fonte dos dados:{" "}
                <Text style={styles.link} onPress={() => Linking.openURL(s.wikidataUrl!)}>
                  Wikidata
                </Text>
                {s.capacityNeedsReview ? " · a fonte traz valores diferentes para a capacidade" : ""}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.marfim },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  backText: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  error: { fontFamily: font.sans, color: colors.erro },
  photoCard: { padding: 6 },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.partida,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 32 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  capacityBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.papel,
  },
  card: { paddingHorizontal: 16, borderRadius: radius.cartao, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  info: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.linha, borderStyle: "dashed" },
  infoLabel: { fontSize: 11, color: colors.suave },
  small: { fontFamily: font.sans, fontSize: 12, color: colors.suave },
  link: { textDecorationLine: "underline", color: colors.estadio },
});

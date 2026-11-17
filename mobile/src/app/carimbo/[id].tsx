import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PHOTO_LIMITS } from "@shared/schemas";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { Stamp } from "@/components/stamp";
import { Ticket } from "@/components/ticket";
import { Scoreline } from "@/components/visit-bits";
import { useAuth } from "@/lib/auth-context";
import { useLoad } from "@/lib/catalog";
import { remoteImage } from "@/lib/remote-image";
import { formatDay, photoErrorMessage, privatePhoto, visitsApi } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";

/** Detalhe do carimbo: selo, resultado, anotação, fotos (adicionar/remover) e exclusão. */
export default function CarimboScreen() {
  const { id, fotos_falharam, motivo } = useLocalSearchParams<{ id: string; fotos_falharam?: string; motivo?: string }>();
  const { token } = useAuth();
  const api = visitsApi(token);
  const { data: v, error, loading, reload } = useLoad(() => api.get(id), [id, token]);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  async function addPhotos() {
    if (!v) return;
    const free = PHOTO_LIMITS.maxPerVisit - v.photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: free, quality: 1 });
    if (result.canceled) return;
    setActionError(null);
    let failed = 0;
    let reason = "";
    const list = result.assets.slice(0, free);
    for (const [i, a] of list.entries()) {
      setBusy(`Enviando foto ${i + 1} de ${list.length}…`);
      try {
        await api.addPhoto(v.id, { uri: a.uri, width: a.width, height: a.height });
      } catch (error) {
        failed++;
        reason ||= photoErrorMessage(error);
      }
    }
    setBusy(null);
    if (failed) setActionError(`${failed === 1 ? "A foto não foi enviada" : `${failed} fotos não foram enviadas`}: ${reason}`);
    reload();
  }

  function removePhoto(photoId: string, index: number) {
    Alert.alert("Remover foto", `Remover a foto ${index + 1}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          setBusy("Removendo foto…");
          try {
            await api.removePhoto(photoId);
            reload();
          } catch (e) {
            setActionError((e as Error).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  function removeVisit() {
    Alert.alert("Excluir carimbo", "Excluir este carimbo e as fotos dele? Não dá para desfazer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setBusy("Excluindo…");
          try {
            await api.remove(id);
            router.back();
          } catch (e) {
            setActionError((e as Error).message);
            setBusy(null);
          }
        },
      },
    ]);
  }

  const isMatch = v?.kind === "match";
  const where = v
    ? [v.stadium.city, v.stadium.state && v.stadium.state !== v.stadium.city ? v.stadium.state : null].filter(Boolean).join(" - ") || v.stadium.country
    : "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/passaporte"))}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao Meu Passaporte"
          hitSlop={8}
          style={styles.back}
        >
          <KitIcon name="back" size={22} />
          <Text style={styles.backText}>Meu Passaporte</Text>
        </Pressable>

        {fotos_falharam && (
          <Text style={styles.errorBox}>
            Carimbo criado, mas {fotos_falharam === "1" ? "a foto não foi enviada" : `${fotos_falharam} fotos não foram enviadas`}
            {motivo ? ` (${motivo})` : ""}. Tente adicioná-las de novo abaixo.
          </Text>
        )}

        {loading && !v ? (
          <ActivityIndicator color={colors.estadio} style={{ paddingVertical: 48 }} />
        ) : error || !v ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.error}>{error ?? "Carimbo não encontrado."}</Text>
            <Button variant="secundario" onPress={reload}>
              Tentar de novo
            </Button>
          </View>
        ) : (
          <>
            <Ticket bleed innerStyle={styles.stampCard}>
              <Stamp
                name={v.stadium.name}
                place={where}
                photo={v.stadium.thumbUrl ? remoteImage(v.stadium.thumbUrl) : null}
                tone={isMatch ? "azul" : "verde"}
                size={200}
              />
              <Text style={[type.rotulo, styles.badge, { backgroundColor: isMatch ? colors.partida : colors.visita }]}>{isMatch ? "Partida" : "Visita"}</Text>
              <Text style={styles.date}>{formatDay(v.date).toUpperCase()}</Text>
            </Ticket>

            <View>
              <Text style={[type.titulo, styles.title]} accessibilityRole="header">
                {v.stadium.name}
              </Text>
              <Text style={type.suave}>
                {where} · {v.stadium.country}
              </Text>
              <Pressable onPress={() => router.push({ pathname: "/estadio/[id]", params: { id: v.stadium.id } })} accessibilityRole="link" hitSlop={6}>
                <Text style={styles.link}>Ver página do estádio</Text>
              </Pressable>
            </View>

            {isMatch && (v.home || v.away) && (
              <View style={styles.box}>
                <Scoreline home={v.home} away={v.away} homeScore={v.homeScore} awayScore={v.awayScore} size={52} />
                {v.competition && <Text style={[type.suave, { textAlign: "center" }]}>{v.competition}</Text>}
              </View>
            )}

            {v.note && (
              <View style={{ gap: 4 }}>
                <Text style={[type.titulo, styles.section]}>Anotação</Text>
                <Text style={type.corpo}>{v.note}</Text>
              </View>
            )}

            <View style={styles.photosHead}>
              <Text style={[type.titulo, styles.section]} accessibilityRole="header">
                Fotos <Text style={type.suave}>({v.photos.length}/{PHOTO_LIMITS.maxPerVisit})</Text>
              </Text>
              {v.photos.length < PHOTO_LIMITS.maxPerVisit && (
                <Button variant="secundario" onPress={addPhotos} disabled={!!busy} style={styles.addBtn} icon={<KitIcon name="camera-ai" size={20} />}>
                  Adicionar
                </Button>
              )}
            </View>
            {busy && <Text style={type.suave}>{busy}</Text>}
            {actionError && <Text style={styles.error}>{actionError}</Text>}
            {v.photos.length ? (
              <View style={styles.grid}>
                {v.photos.map((p, i) => (
                  <View key={p.id} style={styles.cell}>
                    <Pressable onPress={() => setViewing(p.url)} accessibilityRole="imagebutton" accessibilityLabel={`Ampliar foto ${i + 1}`}>
                      <Image source={privatePhoto(p.thumbUrl, token)} style={styles.photo} />
                    </Pressable>
                    <Pressable onPress={() => removePhoto(p.id, i)} disabled={!!busy} accessibilityRole="button" accessibilityLabel={`Remover foto ${i + 1}`} hitSlop={6} style={styles.trash}>
                      <KitIcon name="trash" size={18} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyPhotos}>Nenhuma foto neste carimbo ainda.</Text>
            )}

            <Pressable onPress={removeVisit} disabled={!!busy} accessibilityRole="button" style={styles.delete} hitSlop={6}>
              <KitIcon name="trash" size={18} />
              <Text style={styles.deleteText}>Excluir carimbo</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)} accessibilityRole="button" accessibilityLabel="Fechar foto">
          {viewing && <Image source={privatePhoto(viewing, token)} style={styles.viewerImage} resizeMode="contain" />}
          <Text style={styles.viewerClose}>Toque para fechar</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.marfim },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 18 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  backText: { fontFamily: font.sansSemi, fontSize: 15, color: colors.estadio },
  stampCard: { alignItems: "center", gap: 8 },
  badge: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  date: { fontFamily: font.displayMedium, fontSize: 18, color: colors.estadio },
  title: { fontSize: 34, lineHeight: 40 },
  link: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio, textDecorationLine: "underline", marginTop: 6 },
  box: { gap: 8, padding: 16, borderRadius: radius.cartao, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  section: { fontSize: 24 },
  photosHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  addBtn: { minHeight: 44, paddingHorizontal: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: "31.5%" },
  photo: { width: "100%", aspectRatio: 1, borderRadius: 12, backgroundColor: colors.partida },
  trash: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  emptyPhotos: { fontFamily: font.sans, color: colors.suave, padding: 16, borderRadius: radius.campo, borderWidth: 1, borderStyle: "dashed", borderColor: colors.linha },
  delete: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  deleteText: { fontFamily: font.sansSemi, fontSize: 15, color: colors.erro },
  error: { fontFamily: font.sans, fontSize: 15, color: colors.erro },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 12 },
  viewerImage: { width: "100%", height: "85%" },
  viewerClose: { fontFamily: font.sansSemi, fontSize: 14, color: colors.marfim, marginTop: 12 },
  errorBox: { fontFamily: font.sans, fontSize: 15, color: colors.erro, padding: 12, borderRadius: radius.campo, borderWidth: 1, borderColor: colors.erro, backgroundColor: colors.branco },
});

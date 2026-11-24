import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { PendingTeam, PendingVenue } from "@shared/api-types";
import { SPORT_INFO, SPORTS, type Sport } from "@shared/sports";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { Chip, TeamCrest } from "@/components/visit-bits";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLoad } from "@/lib/catalog";
import { moderationApi, type MergeTarget } from "@/lib/moderation";
import { formatDay } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";

/** Moderação de locais e times cadastrados por usuários (só moderadores; igual a /app/moderacao no web). */
export default function ModeracaoScreen() {
  const { token, user } = useAuth();
  const allowed = user?.role === "moderator" || user?.role === "admin";
  const { data, error, loading, reload } = useLoad(() => (allowed ? moderationApi(token).queue() : Promise.resolve(null)), [token, allowed]);
  const [tab, setTab] = useState<"locais" | "times">("locais");
  const [notice, setNotice] = useState<string | null>(null);
  const done = (msg: string) => {
    setNotice(msg);
    reload();
  };

  return (
    <Screen refreshing={loading && !!data} onRefresh={reload}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={styles.back}>
        <KitIcon name="back" size={22} />
        <Text style={styles.backText}>Voltar</Text>
      </Pressable>
      <Text style={[type.titulo, styles.title]} accessibilityRole="header">
        Moderação
      </Text>
      <Text style={type.suave}>Locais e times cadastrados pelos usuários.</Text>

      {!allowed ? (
        <Text style={styles.error}>Apenas moderadores.</Text>
      ) : loading && !data ? (
        <ActivityIndicator color={colors.estadio} />
      ) : error || !data ? (
        <Text style={styles.error}>{error ?? "Não foi possível carregar."}</Text>
      ) : (
        <>
          <View style={styles.row}>
            <Chip label={`Locais (${data.venues.length})`} active={tab === "locais"} onPress={() => setTab("locais")} />
            <Chip label={`Times (${data.teams.length})`} active={tab === "times"} onPress={() => setTab("times")} />
          </View>
          {notice && (
            <Text style={styles.notice} accessibilityLiveRegion="polite">
              {notice}
            </Text>
          )}
          {tab === "locais" ? (
            data.venues.length ? (
              data.venues.map((v) => <VenueCard key={v.id} venue={v} onDone={done} />)
            ) : (
              <Text style={type.suave}>Nenhum local aguardando moderação.</Text>
            )
          ) : data.teams.length ? (
            data.teams.map((t) => <TeamCard key={t.id} team={t} onDone={done} />)
          ) : (
            <Text style={type.suave}>Nenhum time aguardando moderação.</Text>
          )}
        </>
      )}
    </Screen>
  );
}

function useSend(onDone: (msg: string) => void) {
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  async function send(run: () => Promise<{ warning: string | null }>, success: string) {
    setState({ busy: true, error: null });
    try {
      const r = await run();
      setState({ busy: false, error: null });
      onDone(r.warning ? `${success} ${r.warning}` : success);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? (Object.values(error.body.fields ?? {}).flat()[0] ?? error.message) : "Não foi possível salvar.";
      setState({ busy: false, error: message });
    }
  }
  return { ...state, send };
}

const meta = (p: { author: string | null; createdAt: string; uses: number }) =>
  `Por ${p.author ?? "conta apagada"} em ${formatDay(p.createdAt.slice(0, 10))} · ${p.uses} ${p.uses === 1 ? "carimbo" : "carimbos"}`;

function confirmReject(name: string, onYes: () => void) {
  Alert.alert("Recusar?", `“${name}” some para os outros usuários; os carimbos do autor continuam funcionando.`, [
    { text: "Voltar", style: "cancel" },
    { text: "Recusar", style: "destructive", onPress: onYes },
  ]);
}

function MergeBox({
  kind,
  pendingId,
  duplicates,
  busy,
  onMerge,
}: {
  kind: "local" | "time";
  pendingId: string;
  duplicates: MergeTarget[];
  busy: boolean;
  onMerge: (t: MergeTarget) => void;
}) {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MergeTarget[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => moderationApi(token).targets(kind, pendingId, term, controller.signal).then(setResults, () => {}), 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, q, kind, pendingId]);

  const list = [...duplicates, ...(q.trim().length >= 2 ? results.filter((r) => !duplicates.some((d) => d.id === r.id)) : [])];
  return (
    <View style={styles.mergeBox}>
      <Text style={styles.label}>{duplicates.length ? "Possíveis duplicados" : "É duplicado de outro cadastro?"}</Text>
      {list.map((t) => (
        <View key={t.id} style={styles.mergeRow}>
          {kind === "time" && <TeamCrest team={t.crestUrl ? { crestUrl: t.crestUrl } : null} size={22} />}
          <Text style={[type.corpo, styles.flex]} numberOfLines={1}>
            {t.name}
            {t.city ? ` · ${t.city}` : ""}
          </Text>
          <Pressable onPress={() => onMerge(t)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Mesclar com ${t.name}`} hitSlop={8}>
            <Text style={styles.link}>Mesclar</Text>
          </Pressable>
        </View>
      ))}
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Mesclar com outro… (busque pelo nome)"
        placeholderTextColor={colors.suave}
        accessibilityLabel="Buscar cadastro aprovado para mesclar"
        style={styles.input}
      />
      <Text style={[type.suave, styles.small]}>Mesclar move os carimbos para o cadastro escolhido e apaga este.</Text>
    </View>
  );
}

function VenueCard({ venue: v, onDone }: { venue: PendingVenue; onDone: (msg: string) => void }) {
  const { token } = useAuth();
  const { busy, error, send } = useSend(onDone);
  const [name, setName] = useState(v.name);
  const [uf, setUf] = useState(v.state ?? "");
  const [sports, setSports] = useState<Sport[]>(v.sports);
  const api = moderationApi(token);

  function approve() {
    const edits: Record<string, unknown> = {};
    if (name.trim() !== v.name) edits.name = name.trim();
    if ((uf.trim() || null) !== v.state) edits.state = uf.trim() || null;
    if (sports.join() !== v.sports.join()) edits.sports = sports;
    send(() => api.venue(v.id, { action: "approve", edits }), `“${name.trim()}” aprovado.`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <KitIcon name={v.venueType === "estadio" ? "stadium" : "arena"} size={36} />
        <View style={styles.flex}>
          <Text style={[type.titulo, styles.name]}>{v.name}</Text>
          <Text style={type.suave}>{[v.city, v.state].filter(Boolean).join(" - ")}</Text>
          <Text style={[type.suave, styles.small]}>{meta(v)}</Text>
          {v.lat == null && <Text style={styles.error}>Sem localização: não aparece nas listas até ganhar uma.</Text>}
        </View>
      </View>
      <TextField label="Nome" value={name} onChangeText={setName} maxLength={120} />
      <TextField label="UF" value={uf} onChangeText={setUf} maxLength={40} autoCapitalize="characters" />
      <Text style={styles.label}>Esportes</Text>
      <View style={styles.wrap}>
        {SPORTS.map((s) => (
          <Chip
            key={s}
            label={SPORT_INFO[s].label}
            active={sports.includes(s)}
            onPress={() => setSports((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]))}
          />
        ))}
      </View>
      <MergeBox
        kind="local"
        pendingId={v.id}
        duplicates={v.duplicates}
        busy={busy}
        onMerge={(t) => send(() => api.venue(v.id, { action: "merge", targetId: t.id }), `“${v.name}” mesclado com “${t.name}”.`)}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button loading={busy} onPress={approve}>
        Aprovar
      </Button>
      <Button variant="secundario" disabled={busy} onPress={() => confirmReject(v.name, () => send(() => api.venue(v.id, { action: "reject" }), `“${v.name}” recusado.`))}>
        Recusar
      </Button>
    </View>
  );
}

function TeamCard({ team: t, onDone }: { team: PendingTeam; onDone: (msg: string) => void }) {
  const { token } = useAuth();
  const { busy, error, send } = useSend(onDone);
  const [name, setName] = useState(t.name);
  const api = moderationApi(token);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <TeamCrest team={t.crestUrl ? { crestUrl: t.crestUrl } : null} size={36} />
        <View style={styles.flex}>
          <Text style={[type.titulo, styles.name]}>{t.name}</Text>
          <Text style={type.suave}>{SPORT_INFO[t.sport].label}</Text>
          <Text style={[type.suave, styles.small]}>{meta(t)}</Text>
        </View>
      </View>
      <TextField label="Nome" value={name} onChangeText={setName} maxLength={80} />
      <MergeBox
        kind="time"
        pendingId={t.id}
        duplicates={t.duplicates}
        busy={busy}
        onMerge={(x) => send(() => api.team(t.id, { action: "merge", targetId: x.id }), `“${t.name}” mesclado com “${x.name}”.`)}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        loading={busy}
        onPress={() => send(() => api.team(t.id, { action: "approve", edits: name.trim() !== t.name ? { name: name.trim() } : {} }), `“${name.trim()}” aprovado.`)}
      >
        Aprovar
      </Button>
      <Button variant="secundario" disabled={busy} onPress={() => confirmReject(t.name, () => send(() => api.team(t.id, { action: "reject" }), `“${t.name}” recusado.`))}>
        Recusar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  backText: { fontFamily: font.displaySemi, fontSize: 18, color: colors.estadio },
  title: { fontSize: 40 },
  row: { flexDirection: "row", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: radius.cartao,
    backgroundColor: colors.marfim,
    borderWidth: 1,
    borderColor: colors.linha,
  },
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  name: { fontSize: 22 },
  label: { fontFamily: font.displaySemi, fontSize: 16, color: colors.estadio },
  small: { fontSize: 13 },
  error: { color: colors.erro },
  notice: { backgroundColor: colors.partida, borderRadius: radius.campo, padding: 10, color: colors.tinta },
  link: { fontFamily: font.displaySemi, fontSize: 15, color: colors.estadio, textDecorationLine: "underline" },
  mergeBox: { gap: 8, padding: 10, borderRadius: radius.campo, backgroundColor: "rgba(246,231,176,0.5)", borderWidth: 1, borderColor: colors.linha },
  mergeRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  input: {
    minHeight: 44,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
    paddingHorizontal: 12,
    color: colors.tinta,
  },
});

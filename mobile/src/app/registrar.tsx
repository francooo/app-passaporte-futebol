import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CompetitionOption, MatchResult, NearbyStadium, StadiumSummary, VisitDetail } from "@shared/api-types";
import { PHOTO_LIMITS, type VisitInput } from "@shared/schemas";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { place, StadiumThumb } from "@/components/stadium-bits";
import { Stamp } from "@/components/stamp";
import { TextField } from "@/components/text-field";
import { Ticket } from "@/components/ticket";
import { TeamInput, type ManualTeam } from "@/components/team-input";
import { UpcomingMatches } from "@/components/upcoming-matches";
import { Chip, Scoreline } from "@/components/visit-bits";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { catalogApi } from "@/lib/catalog";
import { remoteImage } from "@/lib/remote-image";
import { formatDay, maskBrDate, parseBrDate, todayIso, toBrDate, visitsApi, type PickedPhoto } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";

type Kind = "visit" | "match";
type Step = 1 | 2 | 3;
type Manual = { home: ManualTeam; away: ManualTeam; homeScore: string; awayScore: string; competition: string };

const emptyTeam: ManualTeam = { id: null, name: "", crestUrl: null };
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Registro de visita ou partida (telas 01 e 02 do kit v06, igual ao web):
 * 1. tipo, estádio (busca ou GPS) e data · 2. encontre a partida ou preencha à mão · 3. fotos e criar carimbo.
 * ?estadio=<id> abre com o estádio escolhido (vindo da página do estádio).
 */
export default function RegistrarScreen() {
  const { token } = useAuth();
  const api = visitsApi(token);
  const { estadio } = useLocalSearchParams<{ estadio?: string }>();
  const scroll = useRef<ScrollViewInstance>(null);

  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<Kind>("match");
  const [stadium, setStadium] = useState<StadiumSummary | null>(null);
  const [dateText, setDateText] = useState("");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [manual, setManual] = useState<Manual | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ busy: boolean; message: string | null; error: string | null }>({ busy: false, message: null, error: null });

  // Estádio vindo da página do estádio
  useEffect(() => {
    if (!estadio) return;
    catalogApi.stadium(estadio).then(
      (s) =>
        setStadium({
          id: s.id,
          name: s.name,
          city: s.city,
          state: s.state,
          country: s.country,
          capacity: s.capacity,
          capacityNeedsReview: s.capacityNeedsReview,
          thumbUrl: s.thumbUrl,
        }),
      () => {},
    );
  }, [estadio]);

  const date = parseBrDate(dateText);
  const dateError =
    dateText && !date ? "Use o formato DD/MM/AAAA." : date && date > todayIso() ? "A data não pode estar no futuro." : undefined;
  const steps: Step[] = kind === "match" ? [1, 2, 3] : [1, 3];
  const position = steps.indexOf(step) + 1;

  function go(next: Step) {
    setStatus((s) => ({ ...s, error: null }));
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  async function submit() {
    if (!stadium) return;
    setStatus({ busy: true, message: "Criando carimbo…", error: null });
    const body: VisitInput = { kind, stadiumId: stadium.id, date: date ?? null, note: note.trim() || null };
    if (kind === "match" && match) body.matchId = match.id;
    if (kind === "match" && !match && manual) {
      Object.assign(body, {
        homeTeamId: manual.home.id,
        homeTeamName: manual.home.name,
        awayTeamId: manual.away.id,
        awayTeamName: manual.away.name,
        homeScore: Number(manual.homeScore),
        awayScore: Number(manual.awayScore),
        competition: manual.competition || null,
      });
    }

    let visit: VisitDetail;
    try {
      visit = await api.create(body);
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? (Object.values(error.body.fields ?? {}).flat()[0] ?? error.message)
          : "Não foi possível criar o carimbo.";
      setStatus({ busy: false, message: null, error: message });
      return;
    }

    let failed = 0;
    for (const [i, photo] of photos.entries()) {
      setStatus({ busy: true, message: `Enviando foto ${i + 1} de ${photos.length}…`, error: null });
      try {
        await api.addPhoto(visit.id, photo);
      } catch {
        failed++;
      }
    }
    router.replace({ pathname: "/carimbo/[id]", params: { id: visit.id, ...(failed ? { fotos_falharam: String(failed) } : {}) } });
  }

  const effectiveDate = date ?? (match ? match.utcDate.slice(0, 10) : null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => (step === 1 ? router.back() : go(step === 3 && kind === "match" ? 2 : 1))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={styles.back}
        >
          <KitIcon name="back" size={22} />
          <Text style={styles.backText}>{step === 1 ? "Cancelar" : "Voltar"}</Text>
        </Pressable>

        <View>
          <Text style={[type.titulo, styles.title]} accessibilityRole="header">
            {step === 2 ? "Encontre a partida" : "Registrar experiência"}
          </Text>
          <Text style={styles.subtitle}>{step === 2 ? "Confirme o jogo para completar seu carimbo." : "Suas visitas, suas histórias."}</Text>
          <Stepper total={steps.length} current={position} />
        </View>

        {step === 1 && (
          <>
            <KindToggle
              value={kind}
              onChange={(k) => {
                setKind(k);
                if (k === "visit") {
                  setMatch(null);
                  setManual(null);
                }
              }}
            />
            <StadiumPicker
              stadium={stadium}
              onChange={(s) => {
                setStadium(s);
                setMatch(null);
              }}
            />
            <TextField
              label={kind === "match" ? "Data da partida (opcional)" : "Data da visita (opcional)"}
              icon="calendar"
              value={dateText}
              onChangeText={(t) => setDateText(maskBrDate(t))}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              error={dateError}
              hint={kind === "match" ? "Ajuda a encontrar o jogo. Se escolher a partida, a data dela é usada." : "Pode registrar sem data."}
            />
            <Button disabled={!stadium || !!dateError} onPress={() => go(kind === "match" ? 2 : 3)} icon={<KitIcon name="arrow-right" size={22} />}>
              {kind === "match" ? "Continuar: partida" : "Continuar: fotos"}
            </Button>
            {!stadium && <Text style={[type.suave, styles.center]}>Escolha o estádio para continuar.</Text>}
          </>
        )}

        {step === 2 && stadium && (
          <MatchStep
            stadium={stadium}
            date={date}
            selected={match}
            manual={manual}
            onPick={(m) => {
              setMatch(m);
              setManual(null);
              if (!date) setDateText(toBrDate(m.utcDate.slice(0, 10)));
              go(3);
            }}
            onManual={(m) => {
              setManual(m);
              setMatch(null);
              go(3);
            }}
          />
        )}

        {step === 3 && stadium && (
          <>
            <Ticket bleed innerStyle={styles.preview}>
              <Stamp
                name={stadium.name}
                place={[stadium.city, stadium.state && stadium.state !== stadium.city ? stadium.state : null].filter(Boolean).join(" - ") || stadium.country}
                photo={stadium.thumbUrl ? remoteImage(stadium.thumbUrl) : null}
                tone={kind === "match" ? "azul" : "verde"}
                size={180}
              />
              <Text style={[type.rotulo, styles.badge, { backgroundColor: kind === "match" ? colors.partida : colors.visita }]}>
                {kind === "match" ? "Partida" : "Visita"}
              </Text>
              <Text style={styles.previewDate}>{effectiveDate ? formatDay(effectiveDate).toUpperCase() : "SEM DATA"}</Text>
            </Ticket>

            {kind === "match" && (match || manual) && (
              <View style={styles.resultBox}>
                <Scoreline
                  home={match ? match.home : manual!.home}
                  away={match ? match.away : manual!.away}
                  homeScore={match ? match.homeScore : Number(manual!.homeScore)}
                  awayScore={match ? match.awayScore : Number(manual!.awayScore)}
                />
                <Text style={[type.suave, styles.center]}>
                  {match ? match.competition.name : `${manual!.competition || "Competição não informada"} · preenchido à mão`}
                </Text>
                {match?.stadiumId && match.stadiumId !== stadium.id && (
                  <Text style={styles.warn}>Pelo nosso catálogo, essa partida foi em outro estádio. Confira se é o jogo certo ou volte e troque.</Text>
                )}
              </View>
            )}

            <PhotoPicker photos={photos} onChange={setPhotos} disabled={status.busy} />

            <TextField label="Anotação (opcional)" value={note} onChangeText={setNote} placeholder="Com quem foi, o que marcou o dia…" multiline maxLength={1000} style={styles.note} />

            {status.error && (
              <Text style={styles.errorBox} accessibilityLiveRegion="polite">
                {status.error}
              </Text>
            )}
            {status.busy && status.message && <Text style={type.suave}>{status.message}</Text>}
            <Button loading={status.busy} onPress={submit} icon={<KitIcon name="stamp-partida" size={28} />}>
              Criar carimbo
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.stepper} accessible accessibilityLabel={`Etapa ${current} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.stepItem}>
          {i > 0 && <View style={[styles.stepLine, { backgroundColor: i < current ? colors.ingresso : colors.estadio }]} />}
          <View style={[styles.stepDot, i + 1 <= current && styles.stepDotOn]} />
        </View>
      ))}
      <Text style={styles.stepText}>
        Etapa {current} de {total}
      </Text>
    </View>
  );
}

function KindToggle({ value, onChange }: { value: Kind; onChange: (k: Kind) => void }) {
  const options: Array<{ value: Kind; label: string; icon: "stadium" | "football" }> = [
    { value: "visit", label: "Visita", icon: "stadium" },
    { value: "match", label: "Partida", icon: "football" },
  ];
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[styles.toggleItem, active && styles.toggleActive]}
          >
            <KitIcon name={o.icon} size={28} />
            <Text style={styles.toggleText}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StadiumPicker({ stadium, onChange }: { stadium: StadiumSummary | null; onChange: (s: StadiumSummary | null) => void }) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<StadiumSummary & Partial<Pick<NearbyStadium, "distanceKm" | "upcoming">>> | null>(null);
  const nearby = results?.some((r) => r.distanceKm != null) ?? false;
  const [state, setState] = useState<{ loading: boolean; error: string | null; label: string | null }>({ loading: false, error: null, label: null });

  async function search() {
    const q = query.trim();
    if (q.length < 2) return setState({ loading: false, error: "Digite ao menos 2 letras do estádio ou da cidade.", label: null });
    setState({ loading: true, error: null, label: null });
    try {
      setResults(await visitsApi(token).searchStadiums(q));
      setState({ loading: false, error: null, label: `Resultados para “${q}”` });
    } catch (error) {
      setState({ loading: false, error: (error as Error).message, label: null });
    }
  }

  async function locate() {
    setState({ loading: true, error: null, label: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return setState({ loading: false, error: "Permissão de localização negada. Busque o estádio pelo nome.", label: null });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const list = await visitsApi(token).nearbyStadiums(pos.coords.latitude, pos.coords.longitude);
      setResults(list);
      const withGames = list.filter((x) => x.upcoming?.length).length;
      setState({
        loading: false,
        error: list.length ? null : "Nenhum estádio do catálogo a até 50 km. Busque pelo nome.",
        label: `Estádios perto de você${withGames ? ` · ${withGames} com ${withGames === 1 ? "jogo" : "jogos"} em 14 dias` : ""}`,
      });
    } catch {
      setState({ loading: false, error: "Não foi possível obter sua localização. Busque pelo nome.", label: null });
    }
  }

  if (stadium) {
    return (
      <View style={styles.selected}>
        <StadiumThumb url={stadium.thumbUrl} size={72} />
        <View style={styles.flex}>
          <Text style={[type.titulo, styles.selectedName]} numberOfLines={2}>
            {stadium.name}
          </Text>
          <Text style={type.suave} numberOfLines={1}>
            {place(stadium)} · {stadium.country}
          </Text>
          {stadium.capacity != null && <Text style={type.suave}>Capacidade: {number.format(stadium.capacity)}</Text>}
        </View>
        <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel="Trocar estádio" hitSlop={8} style={styles.change}>
          <Text style={styles.link}>Trocar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.label}>Estádio</Text>
      <View style={styles.searchBox}>
        <KitIcon name="search" size={22} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
          placeholder="Ex.: Maracanã, Bombonera…"
          placeholderTextColor={colors.suave}
          accessibilityLabel="Nome do estádio ou cidade"
          style={styles.searchInput}
        />
      </View>
      <View style={styles.row}>
        <Button onPress={search} disabled={state.loading} style={[styles.flex, styles.dark]} icon={<KitIcon name="search" size={20} />}>
          <Text style={styles.darkText}>Buscar</Text>
        </Button>
        <Button variant="secundario" onPress={locate} disabled={state.loading} style={styles.flex} icon={<KitIcon name="location-pin" size={20} />}>
          GPS
        </Button>
      </View>
      {state.loading && <ActivityIndicator color={colors.estadio} />}
      {state.error && <Text style={styles.error}>{state.error}</Text>}
      {results && !state.loading && (
        <View style={styles.gap}>
          {state.label && <Text style={[type.rotulo, styles.small]}>{state.label}</Text>}
          {results.length === 0 && !state.error && <Text style={type.suave}>Nenhum estádio encontrado. Tente outro nome ou a cidade.</Text>}
          {results.slice(0, 12).map((s) => (
            <View key={s.id} style={styles.resultCard}>
              <Pressable
                onPress={() => onChange(s)}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${place(s)}${s.upcoming?.length ? `, ${s.upcoming.length} ${s.upcoming.length === 1 ? "jogo" : "jogos"} nos próximos 14 dias` : ""}`}
                style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.85 }]}
              >
                <StadiumThumb url={s.thumbUrl} size={44} />
                <View style={styles.flex}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={type.suave} numberOfLines={1}>
                    {place(s)} · {s.country}
                  </Text>
                </View>
                <Text style={type.suave}>
                  {s.distanceKm != null ? `${number.format(s.distanceKm)} km` : s.capacity ? number.format(s.capacity) : ""}
                </Text>
              </Pressable>
              {s.upcoming && s.upcoming.length > 0 && <UpcomingMatches matches={s.upcoming} />}
            </View>
          ))}
          {nearby && results.length > 0 && (
            <Text style={[type.suave, styles.small]}>Jogos das principais ligas (football-data.org) nos próximos 14 dias, no estádio do mandante.</Text>
          )}
        </View>
      )}
    </View>
  );
}

function MatchStep({
  stadium,
  date,
  selected,
  manual,
  onPick,
  onManual,
}: {
  stadium: StadiumSummary;
  date: string | null;
  selected: MatchResult | null;
  manual: Manual | null;
  onPick: (m: MatchResult) => void;
  onManual: (m: Manual) => void;
}) {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [competition, setCompetition] = useState("");
  const [onlyStadium, setOnlyStadium] = useState(true);
  const [useDate, setUseDate] = useState(!!date);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
  const [mode, setMode] = useState<"busca" | "manual">(manual ? "manual" : "busca");

  useEffect(() => {
    visitsApi(token).competitions().then(setCompetitions, () => {});
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ loading: true, error: null });
      try {
        const list = await visitsApi(token).searchMatches(
          { q: q.trim(), competicao: competition, data: useDate && date ? date : "", estadio: onlyStadium ? stadium.id : "" },
          controller.signal,
        );
        setResults(list);
        setState({ loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ loading: false, error: (error as Error).message });
      }
    }, q ? 400 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, q, competition, onlyStadium, useDate, date, stadium.id]);

  return (
    <>
      <View style={styles.row}>
        <Chip label="Buscar partida" active={mode === "busca"} onPress={() => setMode("busca")} />
        <Chip label="Preencher à mão" active={mode === "manual"} onPress={() => setMode("manual")} />
      </View>

      {mode === "busca" ? (
        <>
          <View style={styles.searchBox}>
            <KitIcon name="search" size={22} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Ex.: Flamengo x Botafogo"
              placeholderTextColor={colors.suave}
              accessibilityLabel="Times da partida"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label={`Só no ${stadium.name.length > 22 ? "estádio" : stadium.name}`} active={onlyStadium} onPress={() => setOnlyStadium((v) => !v)} />
            {date && <Chip label={`± 3 dias de ${formatDay(date)}`} active={useDate} onPress={() => setUseDate((v) => !v)} />}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="Todas as competições" active={!competition} onPress={() => setCompetition("")} />
            {competitions.map((c) => (
              <Chip key={c.code} label={c.name} active={competition === c.code} onPress={() => setCompetition(c.code)} />
            ))}
          </ScrollView>

          <View style={styles.matches}>
            {state.loading && !results && <ActivityIndicator color={colors.estadio} />}
            {state.error && <Text style={styles.error}>{state.error}</Text>}
            {results && results.length === 0 && !state.error && (
              <View style={styles.matchCard}>
                <Text style={styles.resultName}>Nenhuma partida encontrada com esses filtros.</Text>
                <Text style={type.suave}>
                  {onlyStadium ? "Desmarque “Só no estádio”, tire a data ou " : "Mude os filtros ou "}use “Preencher à mão”.
                </Text>
              </View>
            )}
            {results?.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => onPick(m)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.matchCard, selected?.id === m.id && styles.matchSelected, pressed && { opacity: 0.85 }, state.loading && { opacity: 0.6 }]}
              >
                <Scoreline home={m.home} away={m.away} homeScore={m.homeScore} awayScore={m.awayScore} size={36} />
                <Text style={[type.suave, styles.center]}>
                  {m.competition.name} · {formatDay(m.utcDate)}
                </Text>
              </Pressable>
            ))}
            <Text style={[type.rotulo, styles.small, styles.center]}>Dados: football-data.org · principais ligas</Text>
          </View>
        </>
      ) : (
        <ManualForm initial={manual} competitions={competitions} onSubmit={onManual} />
      )}
    </>
  );
}

function ManualForm({ initial, competitions, onSubmit }: { initial: Manual | null; competitions: CompetitionOption[]; onSubmit: (m: Manual) => void }) {
  const [value, setValue] = useState<Manual>(initial ?? { home: emptyTeam, away: emptyTeam, homeScore: "", awayScore: "", competition: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const next: Record<string, string> = {};
    if (!value.home.name.trim()) next.home = "Informe o mandante.";
    if (!value.away.name.trim()) next.away = "Informe o visitante.";
    if (!/^\d{1,2}$/.test(value.homeScore) || !/^\d{1,2}$/.test(value.awayScore)) next.score = "Informe o placar (ex.: 2 e 1).";
    if (value.home.name.trim() && value.home.name.trim().toLowerCase() === value.away.name.trim().toLowerCase()) next.away = "Mandante e visitante precisam ser diferentes.";
    setErrors(next);
    if (!Object.keys(next).length) onSubmit({ ...value, competition: value.competition.trim() });
  }

  return (
    <Ticket innerStyle={styles.gap}>
      <Text style={[type.titulo, styles.manualTitle]}>Preencher manualmente</Text>
      <Text style={type.corpo}>Não encontrou a partida? Registre à mão.</Text>
      <TeamInput label="Mandante" value={value.home} onChange={(home) => setValue((v) => ({ ...v, home }))} error={errors.home} />
      <TeamInput label="Visitante" value={value.away} onChange={(away) => setValue((v) => ({ ...v, away }))} error={errors.away} />
      <Text style={styles.label}>Placar</Text>
      <View style={styles.scoreRow}>
        <ScoreInput label="Gols do mandante" value={value.homeScore} onChange={(homeScore) => setValue((v) => ({ ...v, homeScore }))} invalid={!!errors.score} />
        <Text style={styles.times}>×</Text>
        <ScoreInput label="Gols do visitante" value={value.awayScore} onChange={(awayScore) => setValue((v) => ({ ...v, awayScore }))} invalid={!!errors.score} />
      </View>
      {errors.score && <Text style={styles.error}>{errors.score}</Text>}
      <TextField
        label="Competição (opcional)"
        value={value.competition}
        onChangeText={(competition) => setValue((v) => ({ ...v, competition }))}
        placeholder="Ex.: Copa do Brasil"
        maxLength={80}
      />
      {competitions.length > 0 && !value.competition && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {competitions.map((c) => (
            <Chip key={c.code} label={c.name} active={false} onPress={() => setValue((v) => ({ ...v, competition: c.name }))} />
          ))}
        </ScrollView>
      )}
      <Button onPress={submit}>Usar preenchimento manual</Button>
    </Ticket>
  );
}

function ScoreInput({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 2))}
      keyboardType="number-pad"
      maxLength={2}
      style={[styles.scoreInput, invalid && { borderColor: colors.erro }]}
    />
  );
}

function PhotoPicker({ photos, onChange, disabled }: { photos: PickedPhoto[]; onChange: (p: PickedPhoto[]) => void; disabled: boolean }) {
  const free = PHOTO_LIMITS.maxPerVisit - photos.length;

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: free,
      quality: 1,
    });
    if (result.canceled) return;
    onChange([...photos, ...result.assets.slice(0, free).map((a) => ({ uri: a.uri, width: a.width, height: a.height }))]);
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.label}>Adicionar fotos (opcional)</Text>
      <Pressable
        onPress={pick}
        disabled={disabled || free <= 0}
        accessibilityRole="button"
        accessibilityLabel="Adicionar fotos"
        style={({ pressed }) => [styles.photoBox, pressed && { opacity: 0.8 }, (disabled || free <= 0) && { opacity: 0.5 }]}
      >
        <KitIcon name="camera-ai" size={40} />
        <Text style={styles.resultName}>Adicionar fotos</Text>
        <Text style={type.suave}>Até {PHOTO_LIMITS.maxPerVisit} por registro</Text>
      </Pressable>
      {photos.length > 0 && (
        <View style={styles.thumbs}>
          {photos.map((p, i) => (
            <View key={p.uri}>
              <Image source={{ uri: p.uri }} style={styles.thumb} accessibilityLabel={`Foto ${i + 1}`} />
              <Pressable
                onPress={() => onChange(photos.filter((_, j) => j !== i))}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Remover foto ${i + 1}`}
                hitSlop={6}
                style={styles.remove}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Text style={type.suave}>As fotos são reduzidas antes do envio e a localização (GPS) delas é removida.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.marfim },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 18 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  backText: { fontFamily: font.sansSemi, fontSize: 15, color: colors.estadio },
  title: { fontSize: 38, lineHeight: 44 },
  subtitle: { fontFamily: font.displayMedium, fontSize: 18, color: colors.tinta, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepLine: { width: 32, height: 2 },
  stepDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.estadio, backgroundColor: colors.marfim },
  stepDotOn: { backgroundColor: colors.ingresso, borderColor: colors.ingresso },
  stepText: { fontFamily: font.displayMedium, fontSize: 15, color: colors.tinta, marginLeft: 12 },
  toggle: { flexDirection: "row", borderRadius: radius.campo, borderWidth: 2, borderColor: "rgba(18,58,50,0.2)", backgroundColor: colors.branco, overflow: "hidden" },
  toggleItem: { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  toggleActive: { backgroundColor: colors.ingresso },
  toggleText: { fontFamily: font.displaySemi, fontSize: 20, color: colors.estadio },
  label: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  gap: { gap: 10 },
  gapSm: { gap: 4 },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: "center" },
  small: { fontSize: 11 },
  searchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: font.sans, fontSize: 16, color: colors.tinta },
  dark: { backgroundColor: colors.estadio, borderBottomColor: colors.estadio },
  darkText: { color: colors.marfim },
  resultCard: { padding: 10, borderRadius: radius.campo, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultName: { fontFamily: font.displaySemi, fontSize: 17, color: colors.estadio },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.marfim,
  },
  selectedName: { fontSize: 22 },
  change: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  link: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio, textDecorationLine: "underline" },
  error: { fontFamily: font.sans, fontSize: 14, color: colors.erro },
  errorBox: { fontFamily: font.sans, fontSize: 15, color: colors.erro, padding: 12, borderRadius: radius.campo, borderWidth: 1, borderColor: colors.erro, backgroundColor: colors.branco },
  matches: { gap: 10, padding: 12, borderRadius: radius.ingresso, backgroundColor: colors.ingresso },
  matchCard: { gap: 6, padding: 14, borderRadius: radius.cartao, backgroundColor: colors.marfim },
  matchSelected: { borderWidth: 2, borderColor: colors.estadio },
  manualTitle: { fontSize: 24 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreInput: {
    width: 64,
    height: 56,
    textAlign: "center",
    fontFamily: font.display,
    fontSize: 28,
    color: colors.estadio,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  times: { fontFamily: font.display, fontSize: 24, color: colors.suave },
  options: { borderRadius: radius.campo, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, minHeight: 44 },
  preview: { alignItems: "center", gap: 8 },
  badge: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  previewDate: { fontFamily: font.displayMedium, fontSize: 18, color: colors.estadio },
  resultBox: { gap: 6, padding: 14, borderRadius: radius.cartao, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  warn: { fontFamily: font.sans, fontSize: 14, color: colors.tinta, padding: 10, borderRadius: 8, backgroundColor: colors.partida },
  photoBox: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 20,
    borderRadius: radius.cartao,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.linha,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: 10 },
  remove: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.branco,
    borderWidth: 1,
    borderColor: colors.linha,
  },
  removeText: { fontSize: 18, lineHeight: 20, color: colors.estadio },
  note: { minHeight: 80, textAlignVertical: "top" },
});

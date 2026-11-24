import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CompetitionOption, MatchResult, NearbyStadium, StadiumSummary, UpcomingMatch, VisitDetail } from "@shared/api-types";
import { PHOTO_LIMITS, type VisitInput } from "@shared/schemas";
import { hasMatchSource, scoreDigits, scoreFieldLabel, SPORT_COPY, venueWord } from "@shared/sport-copy";
import { predictionError, scoreError, SPORT_INFO, SPORTS, type Sport, type VenueType } from "@shared/sports";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { place, StadiumThumb } from "@/components/stadium-bits";
import { Stamp } from "@/components/stamp";
import { TextField } from "@/components/text-field";
import { Ticket } from "@/components/ticket";
import { TeamInput, type ManualTeam } from "@/components/team-input";
import { ScoreInput } from "@/components/score-input";
import { formatKickoff, UpcomingMatches } from "@/components/upcoming-matches";
import { Chip, Scoreline } from "@/components/visit-bits";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { catalogApi } from "@/lib/catalog";
import { remoteImage } from "@/lib/remote-image";
import { formatDay, maskBrDate, parseBrDate, photoErrorMessage, todayIso, toBrDate, visitsApi, type PickedPhoto } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";

type Kind = "visit" | "match";
type Step = 1 | 2 | 3;
/** pending: o jogo ainda não terminou — homeScore/awayScore viram palpite (opcional) e kickoff é o início ("HH:MM"). */
type Manual = {
  home: ManualTeam;
  away: ManualTeam;
  homeScore: string;
  awayScore: string;
  competition: string;
  pending: boolean;
  kickoff: string;
  /** Preenchido a partir do próximo jogo do estádio: com os mesmos times, o carimbo é ligado a essa partida. */
  fromMatch?: UpcomingMatch;
};
/** Palpite digitado (texto dos campos). */
type Guess = { home: string; away: string };

const emptyTeam: ManualTeam = { id: null, name: "", crestUrl: null };
const emptyGuess: Guess = { home: "", away: "" };
/** Placar digitado (até 3 dígitos: basquete). */
const isGoals = (s: string) => /^\d{1,3}$/.test(s);
const guessFilled = (g: Guess) => isGoals(g.home) && isGoals(g.away);
/** Partida escolhida que ainda não terminou (hoje/ao vivo): o placar vira palpite. */
const isOpenMatch = (m: MatchResult | null) => Boolean(m?.status && m.status !== "FINISHED");
const isLive = (m: MatchResult) => m.status === "IN_PLAY" || m.status === "PAUSED";
/** "21:30" agora (fuso do aparelho). */
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
/** Máscara HH:MM. */
const maskTime = (t: string) => {
  const digits = t.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};
const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const pad = (n: number) => String(n).padStart(2, "0");
/** "AAAA-MM-DD" e "HH:MM" de um horário ISO, no fuso do aparelho. */
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const localTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const emptyManual: Manual = { home: emptyTeam, away: emptyTeam, homeScore: "", awayScore: "", competition: "", pending: false, kickoff: "" };

/** Preenchimento manual a partir do próximo jogo do estádio (times, competição e início; palpite vazio). */
function manualFromUpcoming(m: UpcomingMatch): Manual {
  return { home: m.home, away: m.away, homeScore: "", awayScore: "", competition: m.competition.name, pending: true, kickoff: localTime(m.utcDate), fromMatch: m };
}

/** Próximo jogo do estádio que serve para preencher: só sem data escolhida ou com a data do próprio jogo. */
function prefillMatch(stadium: StadiumSummary, date: string | null) {
  const next = stadium.upcoming?.[0];
  return next && (!date || date === localDay(next.utcDate)) ? next : null;
}

/** O usuário manteve os times do jogo preenchido? Então o carimbo vai ligado à partida (resultado automático). */
const keepsMatch = (m: Manual) =>
  Boolean(m.fromMatch && m.home.id && m.home.id === m.fromMatch.home.id && m.away.id && m.away.id === m.fromMatch.away.id);

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
  const [sport, setSport] = useState<Sport>("futebol");
  const [stadium, setStadium] = useState<StadiumSummary | null>(null);
  const [dateText, setDateText] = useState("");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [manual, setManual] = useState<Manual | null>(null);
  const [guess, setGuess] = useState<Guess>(emptyGuess);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ busy: boolean; message: string | null; error: string | null }>({ busy: false, message: null, error: null });

  // Estádio vindo da página do estádio
  useEffect(() => {
    if (!estadio) return;
    catalogApi.stadium(estadio).then(
      (s) => {
        // Local vindo da página dele: começa no esporte do local (ginásio → vôlei)
        if (!s.sports.includes("futebol")) setSport(s.sports[0]);
        setStadium({
          id: s.id,
          name: s.name,
          city: s.city,
          state: s.state,
          country: s.country,
          capacity: s.capacity,
          capacityNeedsReview: s.capacityNeedsReview,
          thumbUrl: s.thumbUrl,
          sports: s.sports,
          venueType: s.venueType,
          upcoming: s.upcoming,
        });
      },
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
    const body: VisitInput = { kind, sport, stadiumId: stadium.id, date: date ?? null, note: note.trim() || null };
    if (kind === "match" && match) {
      body.matchId = match.id;
      // Palpite inválido para o esporte (ex.: 3×3 no vôlei) não vai: o aviso já aparece no campo
      if (isOpenMatch(match) && guessFilled(guess) && !predictionError(match.sport, Number(guess.home), Number(guess.away))) {
        Object.assign(body, { predictedHomeScore: Number(guess.home), predictedAwayScore: Number(guess.away) });
      }
    }
    if (kind === "match" && !match && manual && keepsMatch(manual)) {
      // Mesmo jogo do preenchimento automático: ligado à partida, o resultado chega sozinho
      body.matchId = manual.fromMatch!.id;
      const typed = { home: manual.homeScore, away: manual.awayScore };
      if (guessFilled(typed)) Object.assign(body, { predictedHomeScore: Number(typed.home), predictedAwayScore: Number(typed.away) });
    } else if (kind === "match" && !match && manual) {
      Object.assign(body, {
        homeTeamId: manual.home.id,
        homeTeamName: manual.home.name,
        awayTeamId: manual.away.id,
        awayTeamName: manual.away.name,
        competition: manual.competition || null,
      });
      if (manual.pending) {
        const typed = { home: manual.homeScore, away: manual.awayScore };
        const [h, min] = (manual.kickoff || nowTime()).split(":").map(Number);
        const [y, mo, d] = (date ?? todayIso()).split("-").map(Number);
        Object.assign(body, {
          resultPending: true,
          // Início no fuso do aparelho, no dia escolhido (ou hoje)
          // Horário do jogo preenchido mantido: usa o dele (pode ser outro dia)
          kickoffAt:
            manual.fromMatch && manual.kickoff === localTime(manual.fromMatch.utcDate)
              ? manual.fromMatch.utcDate
              : new Date(y, mo - 1, d, h, min).toISOString(),
          ...(guessFilled(typed) ? { predictedHomeScore: Number(typed.home), predictedAwayScore: Number(typed.away) } : {}),
        });
      } else {
        Object.assign(body, { homeScore: Number(manual.homeScore), awayScore: Number(manual.awayScore) });
      }
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
    let reason = "";
    for (const [i, photo] of photos.entries()) {
      setStatus({ busy: true, message: `Enviando foto ${i + 1} de ${photos.length}…`, error: null });
      try {
        await api.addPhoto(visit.id, photo);
      } catch (error) {
        failed++;
        reason ||= photoErrorMessage(error);
      }
    }
    router.replace({ pathname: "/carimbo/[id]", params: { id: visit.id, ...(failed ? { fotos_falharam: String(failed), motivo: reason } : {}) } });
  }

  const guessError = match && guessFilled(guess) ? predictionError(match.sport, Number(guess.home), Number(guess.away)) : null;
  const effectiveDate = date ?? (match ? match.utcDate.slice(0, 10) : manual?.fromMatch ? localDay(manual.fromMatch.utcDate) : null);

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
            <SportPicker
              value={sport}
              onChange={(s) => {
                setSport(s);
                setMatch(null);
                setManual(null);
                setGuess(emptyGuess);
                // Local que não recebe o esporte novo: escolhe de novo
                if (stadium && !stadium.sports.includes(s)) setStadium(null);
              }}
            />
            <KindToggle
              sport={sport}
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
              key={sport}
              sport={sport}
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
            {!stadium && <Text style={[type.suave, styles.center]}>Escolha o {venueWord(sport)} para continuar.</Text>}
          </>
        )}

        {step === 2 && stadium && (
          <MatchStep
            stadium={stadium}
            sport={sport}
            date={date}
            selected={match}
            manual={manual}
            onPick={(m) => {
              setMatch(m);
              setManual(null);
              setGuess(emptyGuess);
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
                {kind === "match" ? `Partida · ${SPORT_INFO[sport].label}` : "Visita"}
              </Text>
              <Text style={styles.previewDate}>{effectiveDate ? formatDay(effectiveDate).toUpperCase() : "SEM DATA"}</Text>
            </Ticket>

            {kind === "match" && (match || manual) && (
              <View style={styles.resultBox}>
                <Scoreline
                  home={match ? match.home : manual!.home}
                  away={match ? match.away : manual!.away}
                  homeScore={match ? match.homeScore : manual!.pending ? null : Number(manual!.homeScore)}
                  awayScore={match ? match.awayScore : manual!.pending ? null : Number(manual!.awayScore)}
                />
                <Text style={[type.suave, styles.center]}>
                  {match
                    ? `${match.competition.name}${isOpenMatch(match) ? ` · começa ${formatKickoff(match.utcDate)}` : ""}`
                    : `${manual!.competition || "Competição não informada"} · preenchido à mão`}
                </Text>
                {isOpenMatch(match) && (
                  <View style={styles.guessBox}>
                    <Text style={styles.label}>Seu palpite (opcional)</Text>
                    <View style={styles.scoreRow}>
                      <ScoreInput
                        label={`Palpite: ${scoreFieldLabel(match!.sport, "home").toLowerCase()}`}
                        digits={scoreDigits(match!.sport)}
                        value={guess.home}
                        onChange={(home) => setGuess((g) => ({ ...g, home }))}
                        invalid={guessError != null}
                      />
                      <Text style={styles.times}>×</Text>
                      <ScoreInput
                        label={`Palpite: ${scoreFieldLabel(match!.sport, "away").toLowerCase()}`}
                        digits={scoreDigits(match!.sport)}
                        value={guess.away}
                        onChange={(away) => setGuess((g) => ({ ...g, away }))}
                        invalid={guessError != null}
                      />
                    </View>
                    {guessError && <Text style={styles.error}>{guessError} O palpite não será salvo assim.</Text>}
                    <Text style={[type.suave, styles.small, styles.center]}>
                      O jogo ainda não terminou: o resultado chega sozinho depois do fim e é comparado com o palpite.
                    </Text>
                  </View>
                )}
                {!match && manual?.pending && (
                  <Text style={styles.warn}>
                    {guessFilled({ home: manual.homeScore, away: manual.awayScore }) ? `Seu palpite: ${manual.homeScore} × ${manual.awayScore}. ` : "Sem palpite. "}
                    O resultado chega depois do jogo (ou informe no carimbo).
                  </Text>
                )}
                {match?.stadiumId && match.stadiumId !== stadium.id && (
                  <Text style={styles.warn}>Pelo nosso catálogo, essa partida foi em outro local. Confira se é o jogo certo ou volte e troque.</Text>
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

/** Escolha do esporte (chips com ícone) no topo do registro. */
function SportPicker({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <View style={styles.gap}>
      <Text style={styles.label}>Esporte</Text>
      <View style={styles.sportGrid} accessibilityRole="radiogroup">
        {SPORTS.map((s) => {
          const active = value === s;
          return (
            <Pressable
              key={s}
              onPress={() => onChange(s)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.sportItem, active && styles.toggleActive]}
            >
              <KitIcon name={SPORT_INFO[s].icon} size={24} />
              <Text style={styles.sportText}>{SPORT_INFO[s].label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function KindToggle({ value, onChange, sport }: { value: Kind; onChange: (k: Kind) => void; sport: Sport }) {
  const options: Array<{ value: Kind; label: string; icon: "stadium" | "arena" | (typeof SPORT_INFO)[Sport]["icon"] }> = [
    { value: "visit", label: "Visita", icon: sport === "futebol" ? "stadium" : "arena" },
    { value: "match", label: "Partida", icon: SPORT_INFO[sport].icon },
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

function StadiumPicker({ sport, stadium, onChange }: { sport: Sport; stadium: StadiumSummary | null; onChange: (s: StadiumSummary | null) => void }) {
  const { token } = useAuth();
  const word = venueWord(sport);
  const football = sport === "futebol";
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<StadiumSummary & Partial<Pick<NearbyStadium, "distanceKm" | "upcoming">>> | null>(null);
  const nearby = results?.some((r) => r.distanceKm != null) ?? false;
  const [state, setState] = useState<{ loading: boolean; error: string | null; label: string | null }>({ loading: false, error: null, label: null });

  async function search() {
    const q = query.trim();
    if (q.length < 2) return setState({ loading: false, error: `Digite ao menos 2 letras do ${word} ou da cidade.`, label: null });
    setState({ loading: true, error: null, label: null });
    try {
      setResults(await visitsApi(token).searchStadiums(q, sport));
      setState({ loading: false, error: null, label: `Resultados para “${q}”` });
    } catch (error) {
      setState({ loading: false, error: (error as Error).message, label: null });
    }
  }

  async function locate() {
    setState({ loading: true, error: null, label: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return setState({ loading: false, error: `Permissão de localização negada. Busque o ${word} pelo nome.`, label: null });
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const list = await visitsApi(token).nearbyStadiums(pos.coords.latitude, pos.coords.longitude, 50, sport);
      setResults(list);
      const withGames = list.filter((x) => x.upcoming?.length).length;
      setState({
        loading: false,
        error: list.length ? null : `Nenhum ${word} do catálogo a até 50 km. Busque pelo nome ou cadastre o local.`,
        label: `${football ? "Estádios" : "Locais"} perto de você${withGames ? ` · ${withGames} com ${withGames === 1 ? "jogo" : "jogos"} em 14 dias` : ""}`,
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
          {stadium.pending && <Text style={type.suave}>Cadastrado por você · em análise</Text>}
        </View>
        <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel={`Trocar ${word}`} hitSlop={8} style={styles.change}>
          <Text style={styles.link}>Trocar</Text>
        </Pressable>
      </View>
    );
  }

  if (creating) {
    return (
      <NewVenueForm
        sport={sport}
        initialName={query.trim()}
        onCancel={() => setCreating(false)}
        onCreated={(s) => {
          setCreating(false);
          onChange(s);
        }}
      />
    );
  }

  return (
    <View style={styles.gap}>
      <Text style={styles.label}>{SPORT_INFO[sport].venueNoun}</Text>
      <View style={styles.searchBox}>
        <KitIcon name="search" size={22} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
          placeholder={football ? "Ex.: Maracanã, Bombonera…" : "Ex.: Maracanãzinho, Gigantinho…"}
          placeholderTextColor={colors.suave}
          accessibilityLabel={`Nome do ${word} ou cidade`}
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
          {results.length === 0 && !state.error && <Text style={type.suave}>Nenhum {word} encontrado. Tente outro nome ou a cidade, ou cadastre o local.</Text>}
          {results.slice(0, 12).map((s) => (
            <View key={s.id} style={styles.resultCard}>
              <Pressable
                onPress={() => onChange(s)}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${place(s)}${s.upcoming?.length ? `, ${s.upcoming.length} ${s.upcoming.length === 1 ? "jogo" : "jogos"} nos próximos ${nearby ? 14 : 30} dias` : ""}`}
                style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.85 }]}
              >
                <StadiumThumb url={s.thumbUrl} size={44} />
                <View style={styles.flex}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={type.suave} numberOfLines={1}>
                    {place(s)} · {s.country}
                    {s.pending ? " · cadastrado por você" : ""}
                  </Text>
                </View>
                <Text style={type.suave}>
                  {s.distanceKm != null ? `${number.format(s.distanceKm)} km` : s.capacity ? number.format(s.capacity) : ""}
                </Text>
              </Pressable>
              {s.upcoming && s.upcoming.length > 0 && <UpcomingMatches matches={s.upcoming} />}
            </View>
          ))}
          {nearby && results.some((s) => s.upcoming?.length) && (
            <Text style={[type.suave, styles.small]}>Jogos ({SPORT_COPY[sport].source ?? "principais ligas"}) nos próximos 14 dias, no local do mandante.</Text>
          )}
          {!nearby && results.some((s) => s.upcoming?.length) && (
            <Text style={[type.suave, styles.small]}>Próximo jogo ({SPORT_COPY[sport].source ?? "principais ligas"}) nos próximos 30 dias, no local do mandante.</Text>
          )}
        </View>
      )}
      <Pressable onPress={() => setCreating(true)} accessibilityRole="button" hitSlop={8}>
        <Text style={type.suave}>
          Não achou o {word}? <Text style={styles.link}>Cadastrar local</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const VENUE_TYPE_LABEL: Record<VenueType, string> = { ginasio: "Ginásio", arena: "Arena", estadio: "Estádio" };

/** Local que falta no catálogo: entra em análise e já pode receber o carimbo (só o autor vê até aprovar). */
function NewVenueForm({
  sport,
  initialName,
  onCancel,
  onCreated,
}: {
  sport: Sport;
  initialName: string;
  onCancel: () => void;
  onCreated: (s: StadiumSummary) => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [venueType, setVenueType] = useState<VenueType>(sport === "futebol" ? "estadio" : "ginasio");
  const [sports, setSports] = useState<Sport[]>([sport]);
  const [here, setHere] = useState(false);
  const [state, setState] = useState<{ busy: boolean; error: string | null; fields: Record<string, string> }>({ busy: false, error: null, fields: {} });

  async function submit() {
    const fields: Record<string, string> = {};
    if (name.trim().length < 3) fields.name = "Informe o nome do local.";
    if (city.trim().length < 2) fields.city = "Informe a cidade.";
    if (!sports.length) fields.sports = "Escolha pelo menos um esporte.";
    if (Object.keys(fields).length) return setState({ busy: false, error: null, fields });
    setState({ busy: true, error: null, fields: {} });
    try {
      let coords: { lat: number; lng: number } | null = null;
      if (here) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      }
      onCreated(await visitsApi(token).createVenue({ name: name.trim(), city: city.trim(), state: uf.trim() || null, sports, venueType, ...(coords ?? {}) }));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? (Object.values(error.body.fields ?? {}).flat()[0] ?? error.message) : "Não foi possível cadastrar o local.";
      setState({ busy: false, error: message, fields: {} });
    }
  }

  return (
    <Ticket innerStyle={styles.gap}>
      <Text style={[type.titulo, styles.manualTitle]}>Cadastrar local</Text>
      <Text style={type.corpo}>Ele entra em análise e já pode receber seu carimbo. Só você vê até a aprovação.</Text>
      <TextField label="Nome do local" value={name} onChangeText={setName} placeholder="Ex.: Ginásio Municipal" maxLength={120} error={state.fields.name} />
      <TextField label="Cidade" value={city} onChangeText={setCity} placeholder="Ex.: Bauru" maxLength={80} error={state.fields.city} />
      <TextField label="UF (opcional)" value={uf} onChangeText={setUf} placeholder="SP" maxLength={40} autoCapitalize="characters" />
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.wrap}>
        {(Object.keys(VENUE_TYPE_LABEL) as VenueType[]).map((t) => (
          <Chip key={t} label={VENUE_TYPE_LABEL[t]} active={venueType === t} onPress={() => setVenueType(t)} />
        ))}
      </View>
      <Text style={styles.label}>Esportes jogados aqui</Text>
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
      {state.fields.sports && <Text style={styles.error}>{state.fields.sports}</Text>}
      <Pressable onPress={() => setHere((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: here }} style={styles.pendingToggle}>
        <View style={[styles.checkbox, here && styles.checkboxOn]}>{here && <Text style={styles.check}>✓</Text>}</View>
        <View style={styles.flex}>
          <Text style={styles.label}>Estou no local agora</Text>
          <Text style={[type.suave, styles.small]}>Usa sua localização para marcar o local no mapa. Sem isso, usamos o centro da cidade.</Text>
        </View>
      </Pressable>
      {state.error && <Text style={styles.error}>{state.error}</Text>}
      <Button loading={state.busy} onPress={submit}>
        Cadastrar e usar
      </Button>
      <Button variant="secundario" onPress={onCancel} disabled={state.busy}>
        Cancelar
      </Button>
    </Ticket>
  );
}

function MatchStep({
  stadium,
  sport,
  date,
  selected,
  manual,
  onPick,
  onManual,
}: {
  stadium: StadiumSummary;
  sport: Sport;
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
  const prefill = prefillMatch(stadium, date);
  // Com o próximo jogo do estádio conhecido, abre no preenchimento (já com os times)
  // Futsal não tem fonte de jogos: só o preenchimento manual
  const searchable = hasMatchSource(sport);
  const [mode, setMode] = useState<"busca" | "manual">(manual || prefill || !searchable ? "manual" : "busca");

  useEffect(() => {
    visitsApi(token).competitions(sport).then(setCompetitions, () => {});
  }, [token, sport]);

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ loading: true, error: null });
      try {
        const list = await visitsApi(token).searchMatches(
          { q: q.trim(), competicao: competition, data: useDate && date ? date : "", estadio: onlyStadium ? stadium.id : "", esporte: sport },
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
  }, [token, q, competition, onlyStadium, useDate, date, stadium.id, sport, searchable]);

  return (
    <>
      {searchable ? (
        <View style={styles.row}>
          <Chip label="Buscar partida" active={mode === "busca"} onPress={() => setMode("busca")} />
          <Chip label="Preencher à mão" active={mode === "manual"} onPress={() => setMode("manual")} />
        </View>
      ) : (
        <Text style={styles.warn}>
          Ainda não temos uma fonte de jogos de {SPORT_INFO[sport].label.toLowerCase()}. Preencha os times e o placar; se o jogo ainda não terminou, deixe
          seu palpite e informe o resultado depois, no carimbo.
        </Text>
      )}

      {mode === "busca" ? (
        <>
          <View style={styles.searchBox}>
            <KitIcon name="search" size={22} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={SPORT_COPY[sport].matchExample}
              placeholderTextColor={colors.suave}
              accessibilityLabel="Times da partida"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label={`Só em ${stadium.name.length > 22 ? `este ${venueWord(sport)}` : stadium.name}`} active={onlyStadium} onPress={() => setOnlyStadium((v) => !v)} />
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
                  {onlyStadium ? "Desmarque “Só em…”, tire a data ou " : "Mude os filtros ou "}use “Preencher à mão”.
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
                {isOpenMatch(m) && <Text style={[type.rotulo, styles.openBadge]}>{isLive(m) ? "Ao vivo" : "Ainda não começou"}</Text>}
                <Text style={[type.suave, styles.center]}>
                  {m.competition.name} · {isOpenMatch(m) ? formatKickoff(m.utcDate) : formatDay(m.utcDate)}
                </Text>
              </Pressable>
            ))}
            <Text style={[type.rotulo, styles.small, styles.center]}>Dados: {SPORT_COPY[sport].source}</Text>
          </View>
        </>
      ) : (
        <ManualForm
          sport={sport}
          initial={manual ?? (prefill ? manualFromUpcoming(prefill) : null)}
          stadiumName={stadium.name}
          competitions={competitions}
          onSubmit={onManual}
        />
      )}
    </>
  );
}

function ManualForm({
  sport,
  initial,
  stadiumName,
  competitions,
  onSubmit,
}: {
  sport: Sport;
  initial: Manual | null;
  stadiumName: string;
  competitions: CompetitionOption[];
  onSubmit: (m: Manual) => void;
}) {
  const [value, setValue] = useState<Manual>(initial ?? emptyManual);
  const from = value.fromMatch;
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const next: Record<string, string> = {};
    if (!value.home.name.trim()) next.home = "Informe o mandante.";
    if (!value.away.name.trim()) next.away = "Informe o visitante.";
    if (value.pending) {
      // Palpite opcional, mas com os dois lados
      if ((value.homeScore !== "" || value.awayScore !== "") && !guessFilled({ home: value.homeScore, away: value.awayScore })) {
        next.score = "Preencha os dois lados do palpite (ou deixe os dois vazios).";
      } else if (guessFilled({ home: value.homeScore, away: value.awayScore })) {
        const error = predictionError(sport, Number(value.homeScore), Number(value.awayScore));
        if (error) next.score = error;
      }
      if (!validTime(value.kickoff)) next.kickoff = "Informe o horário de início (ex.: 21:30).";
    } else if (!isGoals(value.homeScore) || !isGoals(value.awayScore)) {
      next.score = sport === "volei" ? "Informe os sets (ex.: 3 e 1)." : "Informe o placar (ex.: 2 e 1).";
    } else {
      const error = scoreError(sport, Number(value.homeScore), Number(value.awayScore));
      if (error) next.score = error;
    }
    if (value.home.name.trim() && value.home.name.trim().toLowerCase() === value.away.name.trim().toLowerCase()) next.away = "Mandante e visitante precisam ser diferentes.";
    setErrors(next);
    if (!Object.keys(next).length) onSubmit({ ...value, competition: value.competition.trim() });
  }

  return (
    <Ticket innerStyle={styles.gap}>
      <Text style={[type.titulo, styles.manualTitle]}>Preencher manualmente</Text>
      <Text style={type.corpo}>Não encontrou a partida? Registre à mão.</Text>
      {from && (
        <View style={styles.prefill} accessibilityLiveRegion="polite">
          <KitIcon name="calendar" size={16} />
          <View style={styles.flex}>
            <Text style={styles.prefillText}>
              Preenchido com o próximo jogo do {stadiumName} · {from.competition.name} · {formatKickoff(from.utcDate)}. Pode alterar.
            </Text>
            {keepsMatch(value) && <Text style={[type.suave, styles.small]}>Com esses times, o resultado chega sozinho depois do jogo.</Text>}
          </View>
          <Pressable
            onPress={() => {
              setValue(emptyManual);
              setErrors({});
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.link}>Limpar</Text>
          </Pressable>
        </View>
      )}
      <TeamInput label="Mandante" sport={sport} value={value.home} onChange={(home) => setValue((v) => ({ ...v, home }))} error={errors.home} />
      <TeamInput label="Visitante" sport={sport} value={value.away} onChange={(away) => setValue((v) => ({ ...v, away }))} error={errors.away} />
      <Pressable
        onPress={() => {
          setValue((v) => ({ ...v, pending: !v.pending, kickoff: !v.pending && !v.kickoff ? nowTime() : v.kickoff }));
          setErrors({});
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value.pending }}
        style={styles.pendingToggle}
      >
        <View style={[styles.checkbox, value.pending && styles.checkboxOn]}>{value.pending && <Text style={styles.check}>✓</Text>}</View>
        <View style={styles.flex}>
          <Text style={styles.label}>O jogo ainda não terminou</Text>
          <Text style={[type.suave, styles.small]}>
            {hasMatchSource(sport)
              ? "O placar vira seu palpite. O resultado é buscado depois do jogo, ou você informa no carimbo."
              : "O placar vira seu palpite. Depois do jogo, informe o resultado no carimbo."}
          </Text>
        </View>
      </Pressable>
      {value.pending && (
        <TextField
          label="Horário de início"
          icon="calendar"
          value={value.kickoff}
          onChangeText={(t) => setValue((v) => ({ ...v, kickoff: maskTime(t) }))}
          placeholder="HH:MM"
          keyboardType="number-pad"
          maxLength={5}
          error={errors.kickoff}
        />
      )}
      <Text style={styles.label}>{value.pending ? "Seu palpite (opcional)" : sport === "volei" ? "Placar em sets" : "Placar"}</Text>
      <View style={styles.scoreRow}>
        <ScoreInput
          label={scoreFieldLabel(sport, "home")}
          digits={scoreDigits(sport)}
          value={value.homeScore}
          onChange={(homeScore) => setValue((v) => ({ ...v, homeScore }))}
          invalid={!!errors.score}
        />
        <Text style={styles.times}>×</Text>
        <ScoreInput
          label={scoreFieldLabel(sport, "away")}
          digits={scoreDigits(sport)}
          value={value.awayScore}
          onChange={(awayScore) => setValue((v) => ({ ...v, awayScore }))}
          invalid={!!errors.score}
        />
      </View>
      {sport === "volei" && <Text style={[type.suave, styles.small]}>Melhor de 5 sets: o vencedor tem 3.</Text>}
      {errors.score && <Text style={styles.error}>{errors.score}</Text>}
      <TextField
        label="Competição (opcional)"
        value={value.competition}
        onChangeText={(competition) => setValue((v) => ({ ...v, competition }))}
        placeholder={SPORT_COPY[sport].competitionExample}
        maxLength={80}
      />
      {competitions.length > 0 && !value.competition && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {competitions.map((c) => (
            <Chip key={c.code} label={c.name} active={false} onPress={() => setValue((v) => ({ ...v, competition: c.name }))} />
          ))}
        </ScrollView>
      )}
      <Button onPress={submit}>{keepsMatch(value) ? "Usar este jogo" : "Usar preenchimento manual"}</Button>
    </Ticket>
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
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sportItem: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.campo,
    borderWidth: 2,
    borderColor: "rgba(18,58,50,0.2)",
    backgroundColor: colors.branco,
  },
  sportText: { fontFamily: font.displaySemi, fontSize: 18, color: colors.estadio },
  flex: { flex: 1, minWidth: 0 },
  prefill: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 8, backgroundColor: colors.partida },
  prefillText: { fontFamily: font.sans, fontSize: 14, color: colors.tinta },
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
  guessBox: { alignItems: "center", gap: 8, marginTop: 4, padding: 12, borderRadius: 8, backgroundColor: colors.partida },
  openBadge: { alignSelf: "center", fontSize: 11, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: "hidden", backgroundColor: colors.partida },
  pendingToggle: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: radius.campo, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  checkbox: { width: 22, height: 22, marginTop: 1, borderRadius: 5, borderWidth: 2, borderColor: colors.estadio, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.estadio },
  check: { color: colors.marfim, fontSize: 14, lineHeight: 16, fontFamily: font.sansSemi },
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

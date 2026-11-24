"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { CompetitionOption, MatchResult, NearbyStadium, StadiumSummary, TeamRef, UpcomingMatch, VisitDetail } from "@shared/api-types";
import { PHOTO_LIMITS } from "@shared/schemas";
import { predictionError, scoreError, SPORT_INFO, type Sport, type VenueType } from "@shared/sports";
import { place, StadiumThumb } from "@/components/catalog/stadium-bits";
import { Button } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { Stamp } from "@/components/ui/stamp";
import { Ticket } from "@/components/ui/ticket";
import { api, ApiFailure, formatDay, todayIso, uploadPhoto } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { Scoreline, TeamCrest } from "./team-crest";
import { formatKickoff, UpcomingMatches } from "./upcoming-matches";
import { hasMatchSource, scoreDigits, scoreFieldLabel, SPORT_COPY, SportPicker, venueWord } from "./sport-bits";

type Kind = "visit" | "match";
type Step = 1 | 2 | 3;
export type ManualTeam = { id: string | null; name: string; crestUrl: string | null };
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
const nowTime = () => new Date().toTimeString().slice(0, 5);
const number = new Intl.NumberFormat("pt-BR");
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

/** Preenchimento manual a partir do próximo jogo do estádio (times, competição e início; palpite vazio). */
function manualFromUpcoming(m: UpcomingMatch): Manual {
  return {
    home: m.home,
    away: m.away,
    homeScore: "",
    awayScore: "",
    competition: m.competition.name,
    pending: true,
    kickoff: localTime(m.utcDate),
    fromMatch: m,
  };
}

/** Próximo jogo do estádio que serve para preencher: só sem data escolhida ou com a data do próprio jogo. */
function prefillMatch(stadium: StadiumSummary, date: string) {
  const next = stadium.upcoming?.[0];
  return next && (!date || date === localDay(next.utcDate)) ? next : null;
}

/** O usuário manteve os times do jogo preenchido? Então o carimbo vai ligado à partida (resultado automático). */
const keepsMatch = (m: Manual) =>
  Boolean(m.fromMatch && m.home.id && m.home.id === m.fromMatch.home.id && m.away.id && m.away.id === m.fromMatch.away.id);

/**
 * Registro de visita ou partida (telas 01 e 02 do kit v06):
 * 1. tipo, estádio (busca ou GPS) e data · 2. encontre a partida ou preencha à mão · 3. fotos e criar carimbo.
 */
export function RegistroForm({ initialStadium }: { initialStadium: StadiumSummary | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<Kind>("match");
  // Local vindo da página dele: começa no esporte do local (ginásio → vôlei)
  const [sport, setSport] = useState<Sport>(initialStadium && !initialStadium.sports.includes("futebol") ? initialStadium.sports[0] : "futebol");
  const [stadium, setStadium] = useState<StadiumSummary | null>(initialStadium);
  const [date, setDate] = useState("");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [manual, setManual] = useState<Manual | null>(null);
  const [guess, setGuess] = useState<Guess>(emptyGuess);
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ busy: boolean; message: string | null; error: string | null }>({ busy: false, message: null, error: null });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const steps: Step[] = kind === "match" ? [1, 2, 3] : [1, 3];
  const position = steps.indexOf(step) + 1;

  // Ao trocar de etapa (não na abertura), leva o foco e a rolagem para o título
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  // Libera as prévias das fotos
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function goNext() {
    setStatus((s) => ({ ...s, error: null }));
    if (step === 1) setStep(kind === "match" ? 2 : 3);
    else if (step === 2) setStep(3);
  }

  function goBack() {
    setStatus((s) => ({ ...s, error: null }));
    if (step === 3) setStep(kind === "match" ? 2 : 1);
    else if (step === 2) setStep(1);
  }

  async function submit() {
    if (!stadium) return;
    setStatus({ busy: true, message: "Criando carimbo…", error: null });
    const body: Record<string, unknown> = { kind, sport, stadiumId: stadium.id, date: date || null, note: note || null };
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
        Object.assign(body, {
          resultPending: true,
          // Início no fuso do aparelho, no dia escolhido (ou hoje)
          // Horário do jogo preenchido mantido: usa o dele (pode ser outro dia)
          kickoffAt:
            manual.fromMatch && manual.kickoff === localTime(manual.fromMatch.utcDate)
              ? manual.fromMatch.utcDate
              : new Date(`${date || todayIso()}T${manual.kickoff || nowTime()}`).toISOString(),
          ...(guessFilled(typed) ? { predictedHomeScore: Number(typed.home), predictedAwayScore: Number(typed.away) } : {}),
        });
      } else {
        Object.assign(body, { homeScore: Number(manual.homeScore), awayScore: Number(manual.awayScore) });
      }
    }

    let visit: VisitDetail;
    try {
      visit = await api<VisitDetail>("/api/visits", { method: "POST", json: body });
    } catch (error) {
      const message =
        error instanceof ApiFailure ? Object.values(error.fields).flat()[0] ?? error.message : "Não foi possível criar o carimbo.";
      setStatus({ busy: false, message: null, error: message });
      return;
    }

    const failed: string[] = [];
    for (const [i, p] of photos.entries()) {
      setStatus({ busy: true, message: `Enviando foto ${i + 1} de ${photos.length}…`, error: null });
      try {
        await uploadPhoto(visit.id, p.file);
      } catch {
        failed.push(p.file.name);
      }
    }
    router.push(`/app/passaporte/${visit.id}${failed.length ? `?fotos_falharam=${failed.length}` : ""}`);
    router.refresh();
  }

  const preview = (
    <PreviewCard
      stadium={stadium}
      sport={sport}
      kind={kind}
      date={date || (match ? match.utcDate.slice(0, 10) : manual?.fromMatch ? localDay(manual.fromMatch.utcDate) : "")}
      match={match}
      manual={manual}
      guess={guess}
    />
  );

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="titulo-display scroll-mt-28 text-5xl text-estadio outline-none lg:text-6xl">
            {step === 2 ? "Encontre a partida" : "Registrar experiência"}
          </h1>
          <p className="mt-1 font-display text-xl tracking-wide text-tinta lg:text-2xl">
            {step === 2 ? "Confirme o jogo para completar seu carimbo." : "Suas visitas, suas histórias."}
          </p>
        </div>
        <Stepper total={steps.length} current={position} />
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className={cn("flex flex-col gap-6", step === 2 ? "lg:col-span-12" : "lg:col-span-8")}>
          {step === 1 && (
            <StepStadium
              sport={sport}
              onSport={(s) => {
                setSport(s);
                setMatch(null);
                setManual(null);
                setGuess(emptyGuess);
                // Local que não recebe o esporte novo: escolhe de novo
                if (stadium && !stadium.sports.includes(s)) setStadium(null);
              }}
              kind={kind}
              onKind={(k) => {
                setKind(k);
                if (k === "visit") {
                  setMatch(null);
                  setManual(null);
                }
              }}
              stadium={stadium}
              onStadium={(s) => {
                setStadium(s);
                setMatch(null);
              }}
              date={date}
              onDate={setDate}
              onNext={goNext}
            />
          )}
          {step === 2 && stadium && (
            <StepMatch
              stadium={stadium}
              sport={sport}
              date={date}
              selected={match}
              manual={manual}
              onPick={(m) => {
                setMatch(m);
                setManual(null);
                setGuess(emptyGuess);
                if (!date) setDate(m.utcDate.slice(0, 10));
                goNext();
              }}
              onManual={(m) => {
                setManual(m);
                setMatch(null);
                goNext();
              }}
              onBack={goBack}
            />
          )}
          {step === 3 && stadium && (
            <StepPhotos
              stadium={stadium}
              sport={sport}
              kind={kind}
              date={date}
              match={match}
              manual={manual}
              guess={guess}
              onGuess={setGuess}
              photos={photos}
              onPhotos={setPhotos}
              note={note}
              onNote={setNote}
              status={status}
              onBack={goBack}
              onSubmit={submit}
            />
          )}
        </div>
        {/* Na etapa 2 a busca e o preenchimento manual usam a largura toda */}
        {step !== 2 && <aside className="hidden lg:sticky lg:top-28 lg:col-span-4 lg:block">{preview}</aside>}
      </div>
    </div>
  );
}

// ── Etapas ──────────────────────────────────────────────────────────────────

function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex flex-col items-start gap-2 lg:items-center" aria-label={`Etapa ${current} de ${total}`}>
      <ol className="flex items-center" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className="flex items-center">
            {i > 0 && <span className={cn("h-0.5 w-12 lg:w-20", i < current ? "bg-ingresso" : "bg-estadio")} />}
            <span
              className={cn(
                "size-6 rounded-full border-2",
                i + 1 <= current ? "border-ingresso bg-ingresso" : "border-estadio bg-marfim",
              )}
            />
          </li>
        ))}
      </ol>
      <p className="font-display text-lg text-tinta">
        Etapa {current} de {total}
      </p>
    </div>
  );
}

function StepStadium({
  sport,
  onSport,
  kind,
  onKind,
  stadium,
  onStadium,
  date,
  onDate,
  onNext,
}: {
  sport: Sport;
  onSport: (s: Sport) => void;
  kind: Kind;
  onKind: (k: Kind) => void;
  stadium: StadiumSummary | null;
  onStadium: (s: StadiumSummary | null) => void;
  date: string;
  onDate: (d: string) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<StadiumSummary & Partial<Pick<NearbyStadium, "distanceKm" | "upcoming">>> | null>(null);
  const nearby = results?.some((r) => r.distanceKm != null) ?? false;
  const [state, setState] = useState<{ loading: boolean; error: string | null; label: string | null }>({ loading: false, error: null, label: null });
  const [creating, setCreating] = useState(false);
  const dateId = useId();
  const word = venueWord(sport);
  const football = sport === "futebol";

  // Trocou o esporte: a lista anterior não vale mais
  const [listedSport, setListedSport] = useState(sport);
  if (listedSport !== sport) {
    setListedSport(sport);
    setResults(null);
    setState({ loading: false, error: null, label: null });
  }

  async function search(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setState({ loading: false, error: `Digite ao menos 2 letras do ${word} ou da cidade.`, label: null });
      return;
    }
    setState({ loading: true, error: null, label: null });
    try {
      const list = await api<StadiumSummary[]>(`/api/catalog/stadiums/search?q=${encodeURIComponent(q)}&esporte=${sport}`);
      setResults(list);
      setState({ loading: false, error: null, label: `Resultados para “${q}”` });
    } catch (error) {
      setState({ loading: false, error: (error as Error).message, label: null });
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setState({ loading: false, error: "Seu navegador não informa a localização. Busque pelo nome.", label: null });
      return;
    }
    setState({ loading: true, error: null, label: null });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const list = await api<NearbyStadium[]>(
            `/api/catalog/stadiums/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&raio=50&esporte=${sport}`,
          );
          setResults(list);
          const withGames = list.filter((s) => s.upcoming?.length).length;
          setState({
            loading: false,
            error: list.length ? null : `Nenhum ${word} do catálogo a até 50 km. Busque pelo nome ou cadastre o local.`,
            label: `${football ? "Estádios" : "Locais"} perto de você${withGames ? ` · ${withGames} com ${withGames === 1 ? "jogo" : "jogos"} nos próximos 14 dias` : ""}`,
          });
        } catch (error) {
          setState({ loading: false, error: (error as Error).message, label: null });
        }
      },
      (err) =>
        setState({
          loading: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? `Permissão de localização negada. Busque o ${word} pelo nome.`
              : "Não foi possível obter sua localização. Busque pelo nome.",
          label: null,
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <>
      <SportPicker value={sport} onChange={onSport} />
      <KindToggle value={kind} onChange={onKind} sport={sport} />

      <section aria-labelledby="estadio-titulo" className="flex flex-col gap-3">
        <h2 id="estadio-titulo" className="font-display text-xl font-semibold text-estadio">
          {SPORT_INFO[sport].venueNoun}
        </h2>

        {stadium ? (
          <SelectedStadium stadium={stadium} onClear={() => onStadium(null)} />
        ) : creating ? (
          <NewVenueForm
            sport={sport}
            initialName={query.trim()}
            onCancel={() => setCreating(false)}
            onCreated={(s) => {
              setCreating(false);
              onStadium(s);
            }}
          />
        ) : (
          <>
            <form onSubmit={search} role="search" className="flex flex-col gap-3">
              <label className="flex min-h-14 items-center gap-3 rounded-xl border border-linha bg-white px-4 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30">
                <KitIcon name="search" size={24} />
                <span className="sr-only">Nome do {word} ou cidade</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={football ? "Ex.: Maracanã, Bombonera, Madri…" : "Ex.: Maracanãzinho, Gigantinho, Bauru…"}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent py-3 text-lg text-tinta outline-none placeholder:text-suave"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={state.loading}
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-estadio px-5 font-display text-lg font-semibold text-marfim transition-colors hover:bg-estadio-claro disabled:opacity-60"
                >
                  <KitIcon name="search" size={22} className="invert" />
                  Buscar {word}
                </button>
                <button
                  type="button"
                  onClick={locate}
                  disabled={state.loading}
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border-2 border-estadio bg-white/60 px-5 font-display text-lg font-semibold text-estadio transition-colors hover:bg-white disabled:opacity-60"
                >
                  <KitIcon name="location-pin" size={22} />
                  Usar minha localização
                </button>
              </div>
            </form>

            <div aria-live="polite" className="flex flex-col gap-2">
              {state.loading && <p className="text-suave">Procurando {football ? "estádios" : "locais"}…</p>}
              {state.error && <p className="text-sm text-erro">{state.error}</p>}
              {results && !state.loading && (
                <>
                  {state.label && <p className="rotulo-display text-xs text-suave">{state.label}</p>}
                  {results.length === 0 && !state.error ? (
                    <p className="rounded-xl border border-dashed border-linha p-4 text-suave">
                      Nenhum {word} encontrado. Tente outro nome ou a cidade, ou cadastre o local abaixo.
                    </p>
                  ) : (
                    <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
                      {results.map((s) => (
                        <li key={s.id} className="rounded-xl border border-linha bg-white p-3 transition-shadow hover:shadow-md">
                          <button
                            type="button"
                            onClick={() => onStadium(s)}
                            className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-estadio"
                          >
                            <StadiumThumb url={s.thumbUrl} className="size-12 rounded-lg" sizes="48px" />
                            <span className="min-w-0">
                              <span className="titulo-display block truncate text-lg text-estadio">{s.name}</span>
                              <span className="block truncate text-sm text-suave">
                                {place(s)} · {s.country}
                                {s.pending && " · cadastrado por você"}
                              </span>
                            </span>
                            <span className="text-right text-sm text-suave">
                              {s.distanceKm != null ? `${number.format(Math.round(s.distanceKm * 10) / 10)} km` : s.capacity ? `${number.format(s.capacity)} lugares` : ""}
                            </span>
                          </button>
                          {s.upcoming && s.upcoming.length > 0 && <UpcomingMatches matches={s.upcoming} />}
                        </li>
                      ))}
                    </ul>
                  )}
                  {nearby && results.some((s) => s.upcoming?.length) && (
                    <p className="text-xs text-suave">
                      Jogos ({SPORT_COPY[sport].source ?? "principais ligas"}) nos próximos 14 dias, no local do mandante.
                    </p>
                  )}
                  {!nearby && results.some((s) => s.upcoming?.length) && (
                    <p className="text-xs text-suave">
                      Próximo jogo ({SPORT_COPY[sport].source ?? "principais ligas"}) nos próximos 30 dias, no local do mandante.
                    </p>
                  )}
                </>
              )}
            </div>
            <p className="text-sm text-suave">
              Não achou o {word}?{" "}
              <button type="button" onClick={() => setCreating(true)} className="min-h-8 font-semibold text-estadio underline underline-offset-4">
                Cadastrar local
              </button>
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 sm:max-w-sm">
        <label htmlFor={dateId} className="font-display text-xl font-semibold text-estadio">
          {kind === "match" ? "Data da partida" : "Data da visita"} <span className="text-base font-normal text-suave">(opcional)</span>
        </label>
        <div className="flex min-h-14 items-center gap-3 rounded-xl border border-linha bg-white px-4 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30">
          <KitIcon name="calendar" size={24} />
          <input
            id={dateId}
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => onDate(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-3 text-lg text-tinta outline-none"
          />
        </div>
        <p className="text-sm text-suave">
          {kind === "match" ? "Ajuda a encontrar o jogo. Se escolher a partida, a data dela é usada." : "Pode registrar sem data."}
        </p>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={onNext} disabled={!stadium} className="w-full sm:w-auto sm:min-w-64">
          {kind === "match" ? "Continuar: partida" : "Continuar: fotos"}
          <KitIcon name="arrow-right" size={22} />
        </Button>
      </div>
      {!stadium && <p className="-mt-4 text-right text-sm text-suave">Escolha o {word} para continuar.</p>}
    </>
  );
}

function KindToggle({ value, onChange, sport }: { value: Kind; onChange: (k: Kind) => void; sport: Sport }) {
  const options: Array<{ value: Kind; label: string; icon: "stadium" | "arena" | (typeof SPORT_INFO)[Sport]["icon"] }> = [
    { value: "visit", label: "Visita", icon: sport === "futebol" ? "stadium" : "arena" },
    { value: "match", label: "Partida", icon: SPORT_INFO[sport].icon },
  ];
  return (
    <fieldset>
      <legend className="sr-only">Tipo de registro</legend>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border-2 border-estadio/20 bg-white">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-center gap-3 font-display text-xl font-semibold text-estadio transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-estadio",
                active ? "bg-ingresso" : "hover:bg-partida/50",
              )}
            >
              <input type="radio" name="tipo" value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
              <KitIcon name={o.icon} size={30} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function SelectedStadium({ stadium, onClear }: { stadium: StadiumSummary; onClear?: () => void }) {
  return (
    <div className="papel grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-linha p-3 sm:p-4">
      <StadiumThumb url={stadium.thumbUrl} className="size-20 rounded-full sm:size-24" sizes="96px" />
      <div className="min-w-0">
        <p className="titulo-display truncate text-2xl text-estadio">{stadium.name}</p>
        <p className="mt-1 flex items-center gap-1 text-suave">
          <KitIcon name="location-pin" size={18} />
          <span className="truncate">
            {place(stadium)} · {stadium.country}
          </span>
        </p>
        {stadium.capacity != null && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-suave">
            <KitIcon name={stadium.venueType === "estadio" ? "stadium" : "arena"} size={18} /> Capacidade: {number.format(stadium.capacity)}
          </p>
        )}
        {stadium.pending && <p className="mt-0.5 text-sm text-suave">Cadastrado por você · em análise</p>}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 rounded-lg px-3 text-sm font-semibold text-estadio underline underline-offset-4"
        >
          Trocar
        </button>
      )}
    </div>
  );
}

function StepMatch({
  stadium,
  sport,
  date,
  selected,
  manual,
  onPick,
  onManual,
  onBack,
}: {
  stadium: StadiumSummary;
  sport: Sport;
  date: string;
  selected: MatchResult | null;
  manual: Manual | null;
  onPick: (m: MatchResult) => void;
  onManual: (m: Manual) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");
  const [competition, setCompetition] = useState("");
  const [day, setDay] = useState(date);
  const [onlyStadium, setOnlyStadium] = useState(true);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null });
  const prefill = prefillMatch(stadium, date);
  const searchable = hasMatchSource(sport);

  useEffect(() => {
    api<CompetitionOption[]>(`/api/competitions?esporte=${sport}`).then(setCompetitions, () => setCompetitions([]));
  }, [sport]);

  // Busca ao abrir e sempre que um filtro muda (texto com pequena espera)
  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ esporte: sport });
      if (q.trim()) params.set("q", q.trim());
      if (competition) params.set("competicao", competition);
      if (day) params.set("data", day);
      if (onlyStadium) params.set("estadio", stadium.id);
      setState({ loading: true, error: null });
      try {
        const list = await api<MatchResult[]>(`/api/matches/search?${params}`, { signal: controller.signal });
        setResults(list);
        setState({ loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ loading: false, error: (error as Error).message });
      }
    }, q ? 350 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, competition, day, onlyStadium, stadium.id, sport, searchable]);

  const filterBox = "flex min-h-12 items-center gap-2 rounded-xl border border-linha bg-white px-3 focus-within:border-estadio";

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start xl:grid-cols-[1fr_26rem]">
      {!searchable ? (
        <section aria-label="Partidas" className="perfurado flex flex-col gap-2 rounded-ticket bg-ingresso p-4">
          <div className="papel rounded-xl p-4 text-tinta">
            <p className="flex items-center gap-2 font-semibold text-estadio">
              <KitIcon name={SPORT_INFO[sport].icon} size={26} /> {SPORT_INFO[sport].label}: registro manual
            </p>
            <p className="mt-1 text-sm text-suave">
              Ainda não temos uma fonte de jogos de {SPORT_INFO[sport].label.toLowerCase()}. Preencha os times e o placar ao lado; se o jogo ainda não
              terminou, deixe seu palpite e informe o resultado depois, no carimbo.
            </p>
          </div>
        </section>
      ) : (
      <section aria-label="Buscar partida" className="flex flex-col gap-3">
        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-linha bg-white px-4 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30">
          <KitIcon name="search" size={24} />
          <span className="sr-only">Times da partida</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={SPORT_COPY[sport].matchExample}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-3 text-lg text-tinta outline-none placeholder:text-suave"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className={filterBox}>
            <KitIcon name="trophy" size={20} />
            <span className="sr-only">Competição</span>
            <select
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2 text-tinta outline-none"
            >
              <option value="">Todas as competições</option>
              {competitions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={filterBox}>
            <KitIcon name="calendar" size={20} />
            <span className="sr-only">Data (± 3 dias)</span>
            <input
              type="date"
              value={day}
              max={todayIso()}
              onChange={(e) => setDay(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2 text-tinta outline-none"
            />
          </label>
          <label className={cn(filterBox, "cursor-pointer")}>
            <input
              type="checkbox"
              checked={onlyStadium}
              onChange={(e) => setOnlyStadium(e.target.checked)}
              className="size-5 accent-[var(--color-estadio)]"
            />
            <span className="truncate text-sm text-tinta">Só em {stadium.name}</span>
          </label>
        </div>

        <div aria-live="polite" className="perfurado flex flex-col gap-3 rounded-ticket bg-ingresso p-3 sm:p-4">
          {state.loading && !results && <p className="papel rounded-xl p-4 text-suave">Procurando partidas…</p>}
          {state.error && <p className="papel rounded-xl p-4 text-erro">{state.error}</p>}
          {results && results.length === 0 && !state.error && (
            <div className="papel rounded-xl p-4 text-tinta">
              <p className="font-semibold">Nenhuma partida encontrada com esses filtros.</p>
              <p className="mt-1 text-sm text-suave">
                {onlyStadium ? `Desmarque “Só em ${stadium.name}”, mude a data ou ` : "Mude os filtros ou "}
                use o preenchimento manual ao lado.
              </p>
            </div>
          )}
          {results && results.length > 0 && (
            <ul className={cn("flex max-h-[34rem] flex-col gap-3 overflow-y-auto", state.loading && "opacity-60")}>
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onPick(m)}
                    aria-label={`${m.home.name} ${m.homeScore ?? ""} x ${m.awayScore ?? ""} ${m.away.name}, ${m.competition.name}, ${isOpenMatch(m) ? `${isLive(m) ? "ao vivo, " : ""}começa ${formatKickoff(m.utcDate)}` : formatDay(m.utcDate)}`}
                    className={cn(
                      "papel grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-xl px-3 py-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-estadio sm:px-5",
                      selected?.id === m.id && "ring-2 ring-estadio",
                    )}
                  >
                    <span className="flex flex-col gap-1">
                      <Scoreline home={m.home} away={m.away} homeScore={m.homeScore} awayScore={m.awayScore} size="sm" />
                      <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-suave">
                        {isOpenMatch(m) && (
                          <span className="rotulo-display rounded bg-partida px-1.5 text-xs text-estadio">
                            {isLive(m) ? "Ao vivo" : "Ainda não começou"}
                          </span>
                        )}
                        {m.competition.name} · {isOpenMatch(m) ? formatKickoff(m.utcDate) : formatDay(m.utcDate)}
                      </span>
                    </span>
                    <KitIcon name="arrow-right" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="rotulo-display text-center text-xs text-estadio">Dados: {SPORT_COPY[sport].source}</p>
        </div>
      </section>
      )}

      <ManualForm
        key={sport}
        sport={sport}
        initial={manual ?? (prefill ? manualFromUpcoming(prefill) : null)}
        stadiumName={stadium.name}
        onSubmit={onManual}
        competitions={competitions}
      />

      <div className="lg:col-span-2">
        <Button type="button" variant="secundario" onClick={onBack} className="w-full sm:w-auto">
          <KitIcon name="back" size={22} /> Voltar
        </Button>
      </div>
    </div>
  );
}

const emptyManual: Manual = { home: emptyTeam, away: emptyTeam, homeScore: "", awayScore: "", competition: "", pending: false, kickoff: "" };

function ManualForm({
  sport,
  initial,
  stadiumName,
  onSubmit,
  competitions,
}: {
  sport: Sport;
  initial: Manual | null;
  stadiumName: string;
  onSubmit: (m: Manual) => void;
  competitions: CompetitionOption[];
}) {
  const [value, setValue] = useState<Manual>(initial ?? emptyManual);
  const from = value.fromMatch;
  const timeId = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const listId = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
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
      if (!/^\d{2}:\d{2}$/.test(value.kickoff)) next.kickoff = "Informe o horário de início.";
    } else if (!isGoals(value.homeScore) || !isGoals(value.awayScore)) {
      next.score = sport === "volei" ? "Informe os sets (ex.: 3 e 1)." : "Informe o placar (ex.: 2 e 1).";
    } else {
      const error = scoreError(sport, Number(value.homeScore), Number(value.awayScore));
      if (error) next.score = error;
    }
    if (value.home.name.trim() && value.home.name.trim().toLowerCase() === value.away.name.trim().toLowerCase()) {
      next.away = "Mandante e visitante precisam ser diferentes.";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit({ ...value, competition: value.competition.trim() });
  }

  return (
    <Ticket innerClassName="flex flex-col gap-4">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div>
          <h2 className="titulo-display text-2xl text-estadio">Preencher manualmente</h2>
          <p className="text-sm text-tinta">Não encontrou a partida? Registre à mão.</p>
        </div>
        {from && (
          <div role="status" className="flex items-start gap-2 rounded-xl bg-partida px-3 py-2 text-sm text-tinta">
            <KitIcon name="calendar" size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1">
              Preenchido com o próximo jogo do {stadiumName} · {from.competition.name} · {formatKickoff(from.utcDate)}. Pode alterar.
              {keepsMatch(value) && <span className="block text-suave">Com esses times, o resultado chega sozinho depois do jogo.</span>}
            </p>
            <button
              type="button"
              onClick={() => {
                setValue(emptyManual);
                setErrors({});
              }}
              className="min-h-8 shrink-0 font-semibold text-estadio underline underline-offset-4"
            >
              Limpar
            </button>
          </div>
        )}
        <TeamInput label="Mandante" sport={sport} value={value.home} onChange={(home) => setValue((v) => ({ ...v, home }))} error={errors.home} />
        <TeamInput label="Visitante" sport={sport} value={value.away} onChange={(away) => setValue((v) => ({ ...v, away }))} error={errors.away} />
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-linha bg-white p-3">
          <input
            type="checkbox"
            checked={value.pending}
            onChange={(e) => {
              const pending = e.target.checked;
              setValue((v) => ({ ...v, pending, kickoff: pending && !v.kickoff ? nowTime() : v.kickoff }));
              setErrors({});
            }}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-estadio)]"
          />
          <span>
            <span className="block font-semibold text-estadio">O jogo ainda não terminou</span>
            <span className="block text-sm text-suave">{hasMatchSource(sport) ? "O placar vira seu palpite. O resultado é buscado depois do jogo, ou você informa no carimbo." : "O placar vira seu palpite. Depois do jogo, informe o resultado no carimbo."}</span>
          </span>
        </label>
        {value.pending && (
          <label htmlFor={timeId} className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-estadio">Horário de início</span>
            <input
              id={timeId}
              type="time"
              value={value.kickoff}
              aria-invalid={!!errors.kickoff || undefined}
              onChange={(e) => setValue((v) => ({ ...v, kickoff: e.target.value }))}
              className={cn(
                "min-h-12 w-40 rounded-xl border bg-white px-3 text-tinta outline-none focus:border-estadio focus:ring-2 focus:ring-estadio/30",
                errors.kickoff ? "border-erro" : "border-linha",
              )}
            />
            {errors.kickoff && <span className="text-sm text-erro">{errors.kickoff}</span>}
          </label>
        )}
        <fieldset>
          <legend className="text-sm font-semibold text-estadio">
            {value.pending ? (
              <>
                Seu palpite <span className="font-normal text-suave">(opcional)</span>
              </>
            ) : sport === "volei" ? (
              "Placar em sets"
            ) : (
              "Placar"
            )}
          </legend>
          <div className="mt-1 flex items-center gap-3">
            <ScoreInput
              label={scoreFieldLabel(sport, "home")}
              digits={scoreDigits(sport)}
              value={value.homeScore}
              onChange={(homeScore) => setValue((v) => ({ ...v, homeScore }))}
              invalid={!!errors.score}
            />
            <span className="font-display text-2xl text-suave">×</span>
            <ScoreInput
              label={scoreFieldLabel(sport, "away")}
              digits={scoreDigits(sport)}
              value={value.awayScore}
              onChange={(awayScore) => setValue((v) => ({ ...v, awayScore }))}
              invalid={!!errors.score}
            />
          </div>
          {sport === "volei" && <p className="mt-1 text-xs text-suave">Melhor de 5 sets: o vencedor tem 3.</p>}
          {errors.score && <p className="mt-1 text-sm text-erro">{errors.score}</p>}
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-estadio">
            Competição <span className="font-normal text-suave">(opcional)</span>
          </span>
          <input
            list={listId}
            value={value.competition}
            maxLength={80}
            onChange={(e) => setValue((v) => ({ ...v, competition: e.target.value }))}
            placeholder={SPORT_COPY[sport].competitionExample}
            className="min-h-12 rounded-xl border border-linha bg-white px-3 text-tinta outline-none placeholder:text-suave focus:border-estadio focus:ring-2 focus:ring-estadio/30"
          />
          <datalist id={listId}>
            {competitions.map((c) => (
              <option key={c.code} value={c.name} />
            ))}
          </datalist>
        </label>
        <Button type="submit" className="w-full text-lg">
          {keepsMatch(value) ? "Usar este jogo" : "Usar preenchimento manual"}
        </Button>
      </form>
    </Ticket>
  );
}

export function ScoreInput({
  label,
  value,
  onChange,
  invalid,
  digits = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  /** 3 no basquete (placar passa de 99); 1 no vôlei (sets). */
  digits?: number;
}) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={digits}
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, digits))}
      className={cn(
        "titulo-display h-14 rounded-xl border bg-white text-center text-3xl text-estadio outline-none focus:border-estadio focus:ring-2 focus:ring-estadio/30",
        digits > 2 ? "w-20" : "w-16",
        invalid ? "border-erro" : "border-linha",
      )}
    />
  );
}

/** Campo de time com sugestões do catálogo; texto livre cria um time novo (vai para moderação). */
export function TeamInput({
  label,
  value,
  onChange,
  error,
  sport,
}: {
  label: string;
  value: ManualTeam;
  onChange: (t: ManualTeam) => void;
  error?: string;
  /** Só times desse esporte ("Minas" do vôlei ≠ "Minas" do basquete). */
  sport?: Sport;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TeamRef[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const q = value.name.trim();
    if (value.id || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<TeamRef[]>(`/api/teams/search?q=${encodeURIComponent(q)}${sport ? `&esporte=${sport}` : ""}`, { signal: controller.signal }).then(
        (list) => {
          setOptions(list);
          setActive(-1);
        },
        () => {},
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value.name, value.id, sport]);

  function choose(t: TeamRef) {
    onChange({ id: t.id, name: t.name, crestUrl: t.crestUrl });
    setOpen(false);
  }

  const showList = open && !value.id && value.name.trim().length >= 2 && options.length > 0;

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-estadio">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-xl border bg-white px-3 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30",
          error ? "border-erro" : "border-linha",
        )}
      >
        <TeamCrest team={value.id ? value : null} size={26} />
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${id}-op-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          maxLength={80}
          value={value.name}
          placeholder={SPORT_COPY[sport ?? "futebol"].teamExample}
          onChange={(e) => {
            onChange({ id: null, name: e.target.value, crestUrl: null });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              choose(options[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-tinta outline-none placeholder:text-suave"
        />
      </div>
      {showList && (
        <ul id={`${id}-lista`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-linha bg-white py-1 shadow-lg">
          {options.map((t, i) => (
            <li
              key={t.id ?? t.name}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(t);
              }}
              className={cn("flex cursor-pointer items-center gap-2 px-3 py-2 text-tinta", i === active ? "bg-partida" : "hover:bg-partida/50")}
            >
              <TeamCrest team={t} size={24} />
              {t.name}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-erro">{error}</p>}
    </div>
  );
}

function StepPhotos({
  stadium,
  sport,
  kind,
  date,
  match,
  manual,
  guess,
  onGuess,
  photos,
  onPhotos,
  note,
  onNote,
  status,
  onBack,
  onSubmit,
}: {
  stadium: StadiumSummary;
  sport: Sport;
  kind: Kind;
  date: string;
  match: MatchResult | null;
  manual: Manual | null;
  guess: Guess;
  onGuess: (g: Guess) => void;
  photos: Array<{ file: File; preview: string }>;
  onPhotos: (p: Array<{ file: File; preview: string }>) => void;
  note: string;
  onNote: (n: string) => void;
  status: { busy: boolean; message: string | null; error: string | null };
  onBack: () => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const noteId = useId();
  const free = PHOTO_LIMITS.maxPerVisit - photos.length;
  const effectiveDate = date || (match ? match.utcDate.slice(0, 10) : "");

  function add(files: FileList | null) {
    if (!files?.length) return;
    const accepted = [...files].filter((f) => f.type.startsWith("image/"));
    const skipped = files.length - accepted.length;
    const taken = accepted.slice(0, free);
    setPhotoError(
      skipped
        ? "Alguns arquivos não são imagens e foram ignorados."
        : accepted.length > free
          ? `Cada registro aceita até ${PHOTO_LIMITS.maxPerVisit} fotos.`
          : null,
    );
    onPhotos([...photos, ...taken.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(i: number) {
    URL.revokeObjectURL(photos[i].preview);
    onPhotos(photos.filter((_, j) => j !== i));
  }

  return (
    <>
      <section aria-label="Resumo" className="flex flex-col gap-4">
        <SelectedStadium stadium={stadium} />
        <dl className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <Summary label={kind === "match" ? "Data da partida" : "Data da visita"}>
            <span className="flex items-center gap-2 font-display text-xl text-estadio">
              <KitIcon name="calendar" size={22} /> {effectiveDate ? formatDay(effectiveDate) : "Sem data"}
            </span>
          </Summary>
          {kind === "match" && (
            <Summary label={isOpenMatch(match) || manual?.pending ? "Partida" : "Resultado da partida"}>
              <div className="rounded-xl border border-linha bg-white p-3">
                {match ? (
                  <>
                    <Scoreline home={match.home} away={match.away} homeScore={match.homeScore} awayScore={match.awayScore} />
                    <p className="mt-1 text-center text-sm text-suave">
                      {match.competition.name}
                      {isOpenMatch(match) && ` · começa ${formatKickoff(match.utcDate)}`}
                    </p>
                    {isOpenMatch(match) && <GuessFields sport={sport} guess={guess} onGuess={onGuess} />}
                    {match.stadiumId && match.stadiumId !== stadium.id && (
                      <p className="mt-2 rounded-lg bg-partida px-3 py-2 text-sm text-tinta">
                        Pelo nosso catálogo, essa partida foi em outro local. Confira se é o jogo certo ou volte e troque.
                      </p>
                    )}
                  </>
                ) : manual ? (
                  <>
                    <Scoreline
                      home={manual.home}
                      away={manual.away}
                      homeScore={manual.pending ? null : Number(manual.homeScore)}
                      awayScore={manual.pending ? null : Number(manual.awayScore)}
                    />
                    <p className="mt-1 text-center text-sm text-suave">{manual.competition || "Competição não informada"} · preenchido à mão</p>
                    {manual.pending && (
                      <p className="mt-2 rounded-lg bg-partida px-3 py-2 text-center text-sm text-tinta">
                        {guessFilled({ home: manual.homeScore, away: manual.awayScore })
                          ? `Seu palpite: ${manual.homeScore} × ${manual.awayScore}. `
                          : "Sem palpite. "}
                        O resultado chega depois do jogo (ou informe no carimbo).
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-suave">Partida não escolhida.</p>
                )}
              </div>
            </Summary>
          )}
        </dl>
      </section>

      <section aria-labelledby="fotos-titulo" className="flex flex-col gap-3">
        <h2 id="fotos-titulo" className="font-display text-xl font-semibold text-estadio">
          Adicionar fotos <span className="text-base font-normal text-suave">(opcional)</span>
        </h2>
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-linha bg-white/60 p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={free <= 0 || status.busy}
            className="flex items-center gap-4 rounded-xl p-2 text-left hover:bg-partida/40 disabled:opacity-50"
          >
            <KitIcon name="camera-ai" size={48} />
            <span>
              <span className="block font-display text-xl font-semibold text-estadio">Adicionar fotos</span>
              <span className="block text-sm text-suave">
                JPG, PNG ou WebP · até {PHOTO_LIMITS.maxPerVisit} por registro
              </span>
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_LIMITS.types.join(",")}
            multiple
            hidden
            onChange={(e) => add(e.target.files)}
          />
          {photos.length > 0 && (
            <ul className="flex flex-wrap gap-2 sm:ml-auto">
              {photos.map((p, i) => (
                <li key={p.preview} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
                  <img src={p.preview} alt={`Foto ${i + 1}`} className="size-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={status.busy}
                    aria-label={`Remover foto ${i + 1}`}
                    className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full border border-linha bg-white shadow"
                  >
                    <span aria-hidden className="text-lg leading-none text-estadio">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {photoError && <p className="text-sm text-erro">{photoError}</p>}
        <p className="text-sm text-suave">As fotos são reduzidas antes do envio e a localização (GPS) delas é removida.</p>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor={noteId} className="font-display text-xl font-semibold text-estadio">
          Anotação <span className="text-base font-normal text-suave">(opcional)</span>
        </label>
        <textarea
          id={noteId}
          value={note}
          maxLength={1000}
          rows={3}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Com quem foi, o que marcou o dia…"
          className="rounded-xl border border-linha bg-white p-3 text-tinta outline-none placeholder:text-suave focus:border-estadio focus:ring-2 focus:ring-estadio/30"
        />
      </section>

      <div aria-live="polite">
        {status.error && <p className="mb-3 rounded-xl border border-erro/40 bg-white p-3 text-erro">{status.error}</p>}
        {status.busy && status.message && <p className="mb-3 text-suave">{status.message}</p>}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="secundario" onClick={onBack} disabled={status.busy}>
          <KitIcon name="back" size={22} /> Voltar
        </Button>
        <Button type="button" onClick={onSubmit} disabled={status.busy} className="sm:min-w-72" icon={<KitIcon name="stamp-partida" size={28} />}>
          {status.busy ? "Aguarde…" : "Criar carimbo"}
        </Button>
      </div>
    </>
  );
}

function Summary({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-display text-lg font-semibold text-estadio">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Palpite para a partida escolhida que ainda não terminou. */
function GuessFields({ sport, guess, onGuess }: { sport: Sport; guess: Guess; onGuess: (g: Guess) => void }) {
  const error = guessFilled(guess) ? predictionError(sport, Number(guess.home), Number(guess.away)) : null;
  return (
    <fieldset className="mt-3 flex flex-col items-center gap-2 rounded-lg bg-partida px-3 py-3">
      <legend className="sr-only">Seu palpite</legend>
      <p className="text-sm font-semibold text-estadio">
        Seu palpite <span className="font-normal text-suave">(opcional)</span>
      </p>
      <div className="flex items-center gap-3">
        <ScoreInput
          label={`Palpite: ${scoreFieldLabel(sport, "home").toLowerCase()}`}
          digits={scoreDigits(sport)}
          value={guess.home}
          onChange={(home) => onGuess({ ...guess, home })}
          invalid={!!error}
        />
        <span className="font-display text-2xl text-suave">×</span>
        <ScoreInput
          label={`Palpite: ${scoreFieldLabel(sport, "away").toLowerCase()}`}
          digits={scoreDigits(sport)}
          value={guess.away}
          onChange={(away) => onGuess({ ...guess, away })}
          invalid={!!error}
        />
      </div>
      {error && <p className="text-sm text-erro">{error} O palpite não será salvo assim.</p>}
      <p className="text-center text-xs text-suave">O jogo ainda não terminou: o resultado chega sozinho depois do fim e é comparado com o palpite.</p>
    </fieldset>
  );
}

function PreviewCard({
  stadium,
  sport,
  kind,
  date,
  match,
  manual,
  guess,
}: {
  stadium: StadiumSummary | null;
  sport: Sport;
  kind: Kind;
  date: string;
  match: MatchResult | null;
  manual: Manual | null;
  guess: Guess;
}) {
  // Jogo em andamento: mostra o palpite (ou nada) no lugar do placar
  const pending = isOpenMatch(match) || (!match && manual?.pending);
  const shownGuess = match ? guess : { home: manual?.homeScore ?? "", away: manual?.awayScore ?? "" };
  const where = stadium ? [stadium.city, stadium.state && stadium.state !== stadium.city ? stadium.state : null].filter(Boolean).join(" - ") || stadium.country : "";
  return (
    <Ticket innerClassName="flex flex-col items-center gap-5 text-center">
      <h2 className="titulo-display self-start text-3xl text-estadio">Prévia do carimbo</h2>
      {stadium ? (
        <Stamp name={stadium.name} place={where} photoUrl={stadium.thumbUrl} size={240} tone={kind === "match" ? "azul" : "verde"} />
      ) : (
        <div className="grid size-60 place-items-center rounded-full border-4 border-dashed border-estadio/30 p-6 text-suave">
          Escolha o {venueWord(sport)} para ver o carimbo
        </div>
      )}
      <div className="flex w-full flex-col items-center gap-2 border-t border-dashed border-linha pt-4">
        <span className={cn("rotulo-display rounded-md px-2 py-0.5 text-sm text-estadio", kind === "match" ? "bg-partida" : "bg-visita")}>
          {kind === "match" ? `Partida · ${SPORT_INFO[sport].label}` : "Visita"}
        </span>
        <span className="font-display text-lg text-estadio">{date ? formatDay(date).toUpperCase() : "SEM DATA"}</span>
        {kind === "match" && (match || manual) && (
          <div className="mt-1 flex items-center gap-2 text-tinta">
            <TeamCrest team={match ? match.home : manual!.home} size={24} />
            <span className="titulo-display text-xl tabular-nums text-estadio">
              {pending
                ? guessFilled(shownGuess)
                  ? `Palpite ${shownGuess.home} × ${shownGuess.away}`
                  : "Aguardando o jogo"
                : match
                  ? `${match.homeScore ?? "–"} × ${match.awayScore ?? "–"}`
                  : `${manual!.homeScore} × ${manual!.awayScore}`}
            </span>
            <TeamCrest team={match ? match.away : manual!.away} size={24} />
          </div>
        )}
      </div>
    </Ticket>
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
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [venueType, setVenueType] = useState<VenueType>(sport === "futebol" ? "estadio" : "ginasio");
  const [sports, setSports] = useState<Sport[]>([sport]);
  const [here, setHere] = useState(false);
  const [state, setState] = useState<{ busy: boolean; error: string | null; fields: Record<string, string> }>({ busy: false, error: null, fields: {} });
  const nameId = useId();
  const cityId = useId();
  const ufId = useId();

  async function position(): Promise<{ lat: number; lng: number } | null> {
    if (!here || !("geolocation" in navigator)) return null;
    return new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      ),
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fields: Record<string, string> = {};
    if (name.trim().length < 3) fields.name = "Informe o nome do local.";
    if (city.trim().length < 2) fields.city = "Informe a cidade.";
    if (sports.length === 0) fields.sports = "Escolha pelo menos um esporte.";
    if (Object.keys(fields).length) {
      setState({ busy: false, error: null, fields });
      return;
    }
    setState({ busy: true, error: null, fields: {} });
    try {
      const coords = await position();
      const created = await api<StadiumSummary>("/api/catalog/stadiums", {
        method: "POST",
        json: { name: name.trim(), city: city.trim(), state: uf.trim() || null, sports, venueType, ...(coords ?? {}) },
      });
      onCreated(created);
    } catch (error) {
      const message = error instanceof ApiFailure ? Object.values(error.fields).flat()[0] ?? error.message : "Não foi possível cadastrar o local.";
      setState({ busy: false, error: message, fields: {} });
    }
  }

  const input =
    "min-h-12 rounded-xl border bg-white px-3 text-tinta outline-none placeholder:text-suave focus:border-estadio focus:ring-2 focus:ring-estadio/30";
  const chip =
    "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 font-semibold text-estadio has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-estadio";
  return (
    <form onSubmit={submit} noValidate className="papel flex flex-col gap-4 rounded-2xl border border-linha p-4">
      <div>
        <h3 className="titulo-display text-2xl text-estadio">Cadastrar local</h3>
        <p className="text-sm text-suave">Ele entra em análise e já pode receber seu carimbo. Só você vê até a aprovação.</p>
      </div>
      <label htmlFor={nameId} className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-estadio">Nome do local</span>
        <input
          id={nameId}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Ginásio Municipal Panela de Pressão"
          aria-invalid={!!state.fields.name || undefined}
          className={cn(input, state.fields.name ? "border-erro" : "border-linha")}
        />
        {state.fields.name && <span className="text-sm text-erro">{state.fields.name}</span>}
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <label htmlFor={cityId} className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-estadio">Cidade</span>
          <input
            id={cityId}
            value={city}
            maxLength={80}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex.: Bauru"
            aria-invalid={!!state.fields.city || undefined}
            className={cn(input, state.fields.city ? "border-erro" : "border-linha")}
          />
          {state.fields.city && <span className="text-sm text-erro">{state.fields.city}</span>}
        </label>
        <label htmlFor={ufId} className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-estadio">
            UF <span className="font-normal text-suave">(opcional)</span>
          </span>
          <input id={ufId} value={uf} maxLength={40} onChange={(e) => setUf(e.target.value)} placeholder="SP" className={cn(input, "border-linha")} />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-estadio">Tipo</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(VENUE_TYPE_LABEL) as VenueType[]).map((t) => (
            <label key={t} className={cn(chip, venueType === t ? "border-estadio bg-ingresso" : "border-estadio/20 bg-white")}>
              <input type="radio" name="tipo-local" checked={venueType === t} onChange={() => setVenueType(t)} className="sr-only" />
              {VENUE_TYPE_LABEL[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-estadio">Esportes jogados aqui</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(SPORT_INFO) as Sport[]).map((s) => {
            const checked = sports.includes(s);
            return (
              <label key={s} className={cn(chip, checked ? "border-estadio bg-ingresso" : "border-estadio/20 bg-white")}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSports((list) => (checked ? list.filter((x) => x !== s) : [...list, s]))}
                  className="sr-only"
                />
                <KitIcon name={SPORT_INFO[s].icon} size={20} />
                {SPORT_INFO[s].label}
              </label>
            );
          })}
        </div>
        {state.fields.sports && <p className="mt-1 text-sm text-erro">{state.fields.sports}</p>}
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-linha bg-white p-3">
        <input type="checkbox" checked={here} onChange={(e) => setHere(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-estadio)]" />
        <span>
          <span className="block font-semibold text-estadio">Estou no local agora</span>
          <span className="block text-sm text-suave">Usa sua localização para marcar o local no mapa. Sem isso, usamos o centro da cidade.</span>
        </span>
      </label>
      <div aria-live="polite">{state.error && <p className="text-sm text-erro">{state.error}</p>}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secundario" onClick={onCancel} disabled={state.busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={state.busy}>
          {state.busy ? "Cadastrando…" : "Cadastrar e usar"}
        </Button>
      </div>
    </form>
  );
}

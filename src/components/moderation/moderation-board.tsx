"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { ModerationQueue, PendingTeam, PendingVenue } from "@shared/api-types";
import { SPORT_INFO, SPORTS, type Sport, type VenueType } from "@shared/sports";
import { Button } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { TeamCrest } from "@/components/visits/team-crest";
import { api, ApiFailure, formatDay } from "@/lib/client-api";
import { cn } from "@/lib/cn";

type Target = { id: string; name: string; city?: string | null; crestUrl?: string | null };

const VENUE_TYPE_LABEL: Record<VenueType, string> = { ginasio: "Ginásio", arena: "Arena", estadio: "Estádio" };
const input =
  "min-h-11 w-full rounded-xl border border-linha bg-white px-3 text-tinta outline-none placeholder:text-suave focus:border-estadio focus:ring-2 focus:ring-estadio/30";
const chip = "flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-2 px-3 text-sm font-semibold text-estadio has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-estadio";

/** Fila da moderação: abas Locais | Times, um cartão por cadastro pendente. */
export function ModerationBoard({ queue }: { queue: ModerationQueue }) {
  const [tab, setTab] = useState<"locais" | "times">(queue.venues.length || !queue.teams.length ? "locais" : "times");
  const [notice, setNotice] = useState<string | null>(null);
  const tabs = [
    { value: "locais" as const, label: "Locais", count: queue.venues.length },
    { value: "times" as const, label: "Times", count: queue.teams.length },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Tipo de cadastro" className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "inline-flex min-h-12 items-center gap-2 rounded-full border px-5 font-display text-lg text-estadio",
              tab === t.value ? "border-ingresso bg-ingresso font-semibold" : "border-estadio/30 bg-white hover:bg-partida/50",
            )}
          >
            {t.label}
            <span className="rounded-full bg-white px-2 text-sm tabular-nums">{t.count}</span>
          </button>
        ))}
      </div>
      <div aria-live="polite">{notice && <p className="rounded-xl bg-partida px-4 py-2 text-tinta">{notice}</p>}</div>
      {tab === "locais" ? (
        queue.venues.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {queue.venues.map((v) => (
              <li key={v.id}>
                <VenueCard venue={v} onDone={setNotice} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Nenhum local aguardando moderação." />
        )
      ) : queue.teams.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {queue.teams.map((t) => (
            <li key={t.id}>
              <TeamCard team={t} onDone={setNotice} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty text="Nenhum time aguardando moderação." />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="papel flex flex-col items-center gap-2 rounded-2xl border border-dashed border-linha p-8 text-center">
      <KitIcon name="stamp-visita" size={48} />
      <p className="titulo-display text-2xl text-estadio">Tudo em dia</p>
      <p className="text-suave">{text}</p>
    </div>
  );
}

/** Envia a ação e recarrega a fila (o cartão some quando o cadastro deixa de estar pendente). */
function useModerate(path: string, onDone: (msg: string) => void) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  async function send(json: unknown, success: string) {
    setState({ busy: true, error: null });
    try {
      const r = await api<{ warning: string | null }>(path, { method: "POST", json });
      onDone(r.warning ? `${success} ${r.warning}` : success);
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiFailure ? (Object.values(error.fields).flat()[0] ?? error.message) : "Não foi possível salvar.";
      setState({ busy: false, error: message });
    }
  }
  return { ...state, send };
}

function Meta({ author, createdAt, uses }: { author: string | null; createdAt: string; uses: number }) {
  return (
    <p className="text-sm text-suave">
      Cadastrado por {author ?? "conta apagada"} em {formatDay(createdAt.slice(0, 10))} · usado em {uses} {uses === 1 ? "carimbo" : "carimbos"}
    </p>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return <article className="papel flex h-full flex-col gap-4 rounded-2xl border border-linha p-4 lg:p-5">{children}</article>;
}

function Actions({
  busy,
  error,
  onApprove,
  onReject,
}: {
  busy: boolean;
  error: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-auto flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-sm text-erro">
          {error}
        </p>
      )}
      {confirming ? (
        <div className="flex flex-col gap-2 rounded-xl border border-erro/40 bg-white p-3">
          <p className="text-sm text-tinta">Recusar? O cadastro some para os outros usuários; os carimbos do autor continuam funcionando.</p>
          <div className="flex gap-2">
            <Button type="button" variant="secundario" onClick={() => setConfirming(false)} disabled={busy}>
              Voltar
            </Button>
            <Button type="button" onClick={onReject} disabled={busy}>
              Sim, recusar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={onApprove} disabled={busy} className="sm:flex-1">
            {busy ? "Salvando…" : "Aprovar"}
          </Button>
          <Button type="button" variant="secundario" onClick={() => setConfirming(true)} disabled={busy}>
            Recusar
          </Button>
        </div>
      )}
    </div>
  );
}

/** "Possíveis duplicados" + busca de outro cadastro aprovado para mesclar. */
function MergeBox({
  kind,
  pendingId,
  duplicates,
  busy,
  onMerge,
}: {
  kind: "local" | "time";
  pendingId: string;
  duplicates: Target[];
  busy: boolean;
  onMerge: (t: Target) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Target[]>([]);
  const id = useId();
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<Target[]>(`/api/moderation/targets?tipo=${kind}&pendente=${pendingId}&q=${encodeURIComponent(term)}`, { signal: controller.signal }).then(
        setResults,
        () => {},
      );
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, kind, pendingId]);

  const row = (t: Target) => (
    <li key={t.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
      {kind === "time" && <TeamCrest team={t.crestUrl ? { name: t.name, crestUrl: t.crestUrl } : null} size={22} />}
      <span className="min-w-0 flex-1 truncate text-tinta">
        {t.name}
        {t.city ? <span className="text-suave"> · {t.city}</span> : null}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => onMerge(t)}
        className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-semibold text-estadio underline underline-offset-4 disabled:opacity-50"
      >
        Mesclar
      </button>
    </li>
  );
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-linha bg-partida/40 p-3">
      <p className="text-sm font-semibold text-estadio">{duplicates.length ? "Possíveis duplicados" : "É duplicado de outro cadastro?"}</p>
      {duplicates.length > 0 && <ul className="flex flex-col gap-1">{duplicates.map(row)}</ul>}
      <label htmlFor={id} className="sr-only">
        Buscar {kind === "local" ? "local" : "time"} aprovado para mesclar
      </label>
      <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mesclar com outro… (busque pelo nome)" className={input} />
      {q.trim().length >= 2 && results.length > 0 && <ul className="flex flex-col gap-1">{results.filter((r) => !duplicates.some((d) => d.id === r.id)).map(row)}</ul>}
      <p className="text-xs text-suave">Mesclar move os carimbos para o cadastro escolhido e apaga este.</p>
    </div>
  );
}

function VenueCard({ venue: v, onDone }: { venue: PendingVenue; onDone: (msg: string) => void }) {
  const { busy, error, send } = useModerate(`/api/moderation/venues/${v.id}`, onDone);
  const [name, setName] = useState(v.name);
  const [city, setCity] = useState(v.city);
  const [uf, setUf] = useState(v.state ?? "");
  const [venueType, setVenueType] = useState<VenueType>(v.venueType);
  const [sports, setSports] = useState<Sport[]>(v.sports);
  const ids = { name: useId(), city: useId(), uf: useId() };

  function approve() {
    const edits: Record<string, unknown> = {};
    if (name.trim() !== v.name) edits.name = name.trim();
    if (city.trim() !== v.city) edits.city = city.trim();
    if ((uf.trim() || null) !== v.state) edits.state = uf.trim() || null;
    if (venueType !== v.venueType) edits.venueType = venueType;
    if (sports.join() !== v.sports.join()) edits.sports = sports;
    send({ action: "approve", edits }, `“${name.trim()}” aprovado.`);
  }

  return (
    <CardShell>
      <div className="flex items-start gap-3">
        <KitIcon name={v.venueType === "estadio" ? "stadium" : "arena"} size={40} />
        <div className="min-w-0">
          <h2 className="titulo-display text-2xl text-estadio">{v.name}</h2>
          <p className="text-suave">
            {[v.city, v.state].filter(Boolean).join(" - ")} · {v.country}
            {v.lat != null && v.lng != null && (
              <>
                {" · "}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=17/${v.lat}/${v.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-estadio underline underline-offset-4"
                >
                  ver no mapa
                </a>
              </>
            )}
          </p>
          <Meta author={v.author} createdAt={v.createdAt} uses={v.uses} />
          {v.lat == null && <p className="text-sm text-erro">Sem localização: aprovado, não aparece nas listas até ganhar uma.</p>}
        </div>
      </div>

      <details className="rounded-xl border border-linha bg-white/70 p-3">
        <summary className="cursor-pointer font-semibold text-estadio">Corrigir antes de aprovar</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label htmlFor={ids.name} className="flex flex-col gap-1 text-sm font-semibold text-estadio">
            Nome
            <input id={ids.name} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
            <label htmlFor={ids.city} className="flex flex-col gap-1 text-sm font-semibold text-estadio">
              Cidade
              <input id={ids.city} value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} className={input} />
            </label>
            <label htmlFor={ids.uf} className="flex flex-col gap-1 text-sm font-semibold text-estadio">
              UF
              <input id={ids.uf} value={uf} maxLength={40} onChange={(e) => setUf(e.target.value)} className={input} />
            </label>
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm font-semibold text-estadio">Tipo</legend>
            {(Object.keys(VENUE_TYPE_LABEL) as VenueType[]).map((t) => (
              <label key={t} className={cn(chip, venueType === t ? "border-estadio bg-ingresso" : "border-estadio/20 bg-white")}>
                <input type="radio" name={`tipo-${v.id}`} checked={venueType === t} onChange={() => setVenueType(t)} className="sr-only" />
                {VENUE_TYPE_LABEL[t]}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm font-semibold text-estadio">Esportes</legend>
            {SPORTS.map((s) => {
              const on = sports.includes(s);
              return (
                <label key={s} className={cn(chip, on ? "border-estadio bg-ingresso" : "border-estadio/20 bg-white")}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setSports((list) => (on ? list.filter((x) => x !== s) : [...list, s]))}
                    className="sr-only"
                  />
                  <KitIcon name={SPORT_INFO[s].icon} size={18} />
                  {SPORT_INFO[s].label}
                </label>
              );
            })}
          </fieldset>
        </div>
      </details>

      <MergeBox
        kind="local"
        pendingId={v.id}
        duplicates={v.duplicates}
        busy={busy}
        onMerge={(t) => send({ action: "merge", targetId: t.id }, `“${v.name}” mesclado com “${t.name}”.`)}
      />
      <Actions busy={busy} error={error} onApprove={approve} onReject={() => send({ action: "reject" }, `“${v.name}” recusado.`)} />
    </CardShell>
  );
}

function TeamCard({ team: t, onDone }: { team: PendingTeam; onDone: (msg: string) => void }) {
  const { busy, error, send } = useModerate(`/api/moderation/teams/${t.id}`, onDone);
  const [name, setName] = useState(t.name);
  const [shortName, setShortName] = useState(t.shortName ?? "");
  const ids = { name: useId(), short: useId() };

  function approve() {
    const edits: Record<string, unknown> = {};
    if (name.trim() !== t.name) edits.name = name.trim();
    if ((shortName.trim() || null) !== t.shortName) edits.shortName = shortName.trim() || null;
    send({ action: "approve", edits }, `“${name.trim()}” aprovado.`);
  }

  return (
    <CardShell>
      <div className="flex items-start gap-3">
        <TeamCrest team={t.crestUrl ? { name: t.name, crestUrl: t.crestUrl } : null} size={40} />
        <div className="min-w-0">
          <h2 className="titulo-display text-2xl text-estadio">{t.name}</h2>
          <p className="flex items-center gap-1 text-suave">
            <KitIcon name={SPORT_INFO[t.sport].icon} size={18} /> {SPORT_INFO[t.sport].label}
          </p>
          <Meta author={t.author} createdAt={t.createdAt} uses={t.uses} />
        </div>
      </div>
      <details className="rounded-xl border border-linha bg-white/70 p-3">
        <summary className="cursor-pointer font-semibold text-estadio">Corrigir antes de aprovar</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label htmlFor={ids.name} className="flex flex-col gap-1 text-sm font-semibold text-estadio">
            Nome
            <input id={ids.name} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label htmlFor={ids.short} className="flex flex-col gap-1 text-sm font-semibold text-estadio">
            Nome curto (opcional)
            <input id={ids.short} value={shortName} maxLength={40} onChange={(e) => setShortName(e.target.value)} className={input} />
          </label>
        </div>
      </details>
      <MergeBox
        kind="time"
        pendingId={t.id}
        duplicates={t.duplicates}
        busy={busy}
        onMerge={(x) => send({ action: "merge", targetId: x.id }, `“${t.name}” mesclado com “${x.name}”.`)}
      />
      <Actions busy={busy} error={error} onApprove={approve} onReject={() => send({ action: "reject" }, `“${t.name}” recusado.`)} />
    </CardShell>
  );
}

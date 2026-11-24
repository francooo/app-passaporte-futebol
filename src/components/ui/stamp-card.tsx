import Link from "next/link";
import type { TeamRef } from "@shared/api-types";
import { TeamCrest } from "@/components/visits/team-crest";
import { cn } from "@/lib/cn";
import { KitIcon } from "./kit-icon";
import { Stamp } from "./stamp";

export type VisitKind = "visit" | "match";

/** Confronto do carimbo de partida: escudos e placar final (null enquanto o jogo não termina). */
export type StampMatch = {
  home: Pick<TeamRef, "name" | "crestUrl"> | null;
  away: Pick<TeamRef, "name" | "crestUrl"> | null;
  homeScore: number | null;
  awayScore: number | null;
};

type Props = {
  href: string;
  stadium: string;
  city: string;
  stateCode?: string;
  kind: VisitKind;
  /** null = registro sem data */
  date: Date | null;
  photoUrl?: string | null;
  tone?: "verde" | "azul";
  /** "row": linha do mobile (padrão). "tile": cartão vertical para grids no desktop. "list": linha compacta da listagem. */
  layout?: "row" | "tile" | "list";
  /** Etiqueta curta sob a cidade (ex.: "Aguardando resultado", "Na mosca!"). */
  tag?: string | null;
  match?: StampMatch | null;
  competition?: string | null;
  className?: string;
};

function Tag({ text }: { text: string }) {
  return <span className="rotulo-display mt-1 inline-block rounded bg-ingresso px-1.5 text-xs text-estadio">{text}</span>;
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function formatStampDate(date: Date | null) {
  if (!date) return "SEM DATA";
  return dateFormat.format(date).replace(/\./g, "").replace(/ de /g, " ").toUpperCase();
}

/** Ícone, tipo escrito e data (sem `date`, só o tipo: a listagem já mostra a data à esquerda). */
function KindBadge({ kind, date, icon = true }: { kind: VisitKind; date?: Date | null; icon?: boolean }) {
  const isMatch = kind === "match";
  return (
    <>
      {icon && <KitIcon name={isMatch ? "football" : "stadium"} size={34} />}
      <span
        className={cn(
          "rotulo-display rounded-md px-2 py-0.5 text-sm text-estadio",
          isMatch ? "bg-partida" : "bg-visita",
        )}
      >
        {isMatch ? "Partida" : "Visita"}
      </span>
      {date !== undefined && <span className="font-display text-sm font-medium text-estadio">{formatStampDate(date)}</span>}
    </>
  );
}

const scoreLabel = (m: StampMatch) =>
  m.homeScore != null && m.awayScore != null
    ? `${m.home?.name ?? "Mandante"} ${m.homeScore} a ${m.awayScore} ${m.away?.name ?? "Visitante"}`
    : `${m.home?.name ?? "Mandante"} contra ${m.away?.name ?? "Visitante"}, resultado pendente`;

/** "[escudo] Internacional 2 × 5 Vitória [escudo]"; sem nomes, só escudos e placar (linhas estreitas). */
function MatchLine({ match: m, names = true, crest = 28, className }: { match: StampMatch; names?: boolean; crest?: number; className?: string }) {
  const score = (
    <span className="titulo-display flex shrink-0 items-center gap-1.5 text-2xl tabular-nums text-estadio" aria-hidden>
      <span>{m.homeScore ?? "–"}</span>
      <span className="text-sm text-suave">×</span>
      <span>{m.awayScore ?? "–"}</span>
    </span>
  );
  if (!names) {
    return (
      <p className={cn("flex items-center gap-2", className)} aria-label={scoreLabel(m)}>
        <TeamCrest team={m.home} size={crest} />
        {score}
        <TeamCrest team={m.away} size={crest} />
      </p>
    );
  }
  return (
    <p className={cn("grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2", className)} aria-label={scoreLabel(m)}>
      <span className="flex min-w-0 items-center justify-end gap-1.5" aria-hidden>
        <span className="titulo-display truncate text-base text-estadio">{m.home?.name ?? "Mandante"}</span>
        <TeamCrest team={m.home} size={crest} />
      </span>
      {score}
      <span className="flex min-w-0 items-center gap-1.5" aria-hidden>
        <TeamCrest team={m.away} size={crest} />
        <span className="titulo-display truncate text-base text-estadio">{m.away?.name ?? "Visitante"}</span>
      </span>
    </p>
  );
}

const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short" });

/** Data empilhada da listagem: "23" / "NOV 2026". */
function DateBlock({ date }: { date: Date | null }) {
  if (!date) return <span className="rotulo-display text-center text-xs leading-tight text-suave">Sem data</span>;
  return (
    <time dateTime={date.toISOString().slice(0, 10)} className="flex flex-col items-center leading-none text-estadio">
      <span className="titulo-display text-3xl">{String(date.getDate()).padStart(2, "0")}</span>
      <span className="rotulo-display mt-1 text-xs">
        {shortMonth.format(date).replace(/\./g, "").toUpperCase()} {date.getFullYear()}
      </span>
    </time>
  );
}

/** Carimbo do "Meu Passaporte": selo, estádio/cidade, confronto (partidas), tipo escrito e data. */
export function StampCard({ href, stadium, city, stateCode, kind, date, photoUrl, tone, layout = "row", tag, match, competition, className }: Props) {
  const place = stateCode ? `${city} - ${stateCode}` : city;
  const card = "papel rounded-2xl border border-estadio/10 shadow-sm transition-transform hover:-translate-y-0.5";

  if (layout === "list") {
    return (
      <Link
        href={href}
        className={cn(
          card,
          "grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 md:grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_auto] md:gap-5 md:px-5",
          className,
        )}
      >
        <DateBlock date={date} />
        <div className="min-w-0">
          {match ? (
            <>
              <MatchLine match={match} crest={26} className="hidden md:grid" />
              <MatchLine match={match} names={false} crest={26} className="justify-center md:hidden" />
              <p className="mt-0.5 truncate text-center font-display text-base font-semibold text-estadio md:hidden">
                {match.home?.name ?? "Mandante"} × {match.away?.name ?? "Visitante"}
              </p>
            </>
          ) : (
            <span className="flex min-w-0 items-center gap-3">
              <Stamp name={stadium} place={place} photoUrl={photoUrl} tone={tone} size={52} />
              <span className="titulo-display truncate text-xl text-estadio">{stadium}</span>
            </span>
          )}
          {/* No celular, local (e etiqueta) logo abaixo do confronto */}
          <p className="mt-1 truncate text-center text-sm text-suave md:hidden">
            {match ? `${stadium} · ${city}` : city}
          </p>
          {tag && <p className="text-center md:hidden"><Tag text={tag} /></p>}
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="truncate font-semibold text-estadio">{match ? stadium : city}</p>
          <p className="truncate text-sm text-suave">{match ? (competition ?? city) : "Visita ao estádio"}</p>
          {tag && <Tag text={tag} />}
        </div>
        <div className="hidden flex-col items-center gap-1 md:flex">
          <KindBadge kind={kind} icon={false} />
        </div>
        <KitIcon name="arrow-right" size={20} />
      </Link>
    );
  }

  if (layout === "tile") {
    return (
      <Link href={href} className={cn(card, "flex h-full flex-col items-center gap-4 p-6 text-center", className)}>
        <Stamp name={stadium} place={place} photoUrl={photoUrl} tone={tone} size={150} />
        <div className="w-full">
          <h3 className="titulo-display text-2xl text-estadio">{stadium}</h3>
          <p className="mt-1 flex items-center justify-center gap-1 text-suave">
            <KitIcon name="location-pin" size={18} />
            {city}
          </p>
          {match && <MatchLine match={match} className="mt-3 rounded-xl bg-white/70 px-2 py-2" />}
          {tag && <Tag text={tag} />}
        </div>
        <div className="mt-auto flex w-full items-center justify-center gap-3 border-t border-dashed border-linha pt-4">
          <KindBadge kind={kind} date={date} />
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className={cn(card, "grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-3", className)}>
      <Stamp name={stadium} place={place} photoUrl={photoUrl} tone={tone} size={80} />
      <div className="min-w-0 border-r border-linha pr-2">
        <h3 className="titulo-display text-xl text-estadio">{stadium}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-suave">
          <KitIcon name="location-pin" size={16} />
          <span className="truncate">{city}</span>
        </p>
        {tag && <Tag text={tag} />}
      </div>
      <div className="flex w-[5.5rem] flex-col items-center gap-1 text-center">
        <KindBadge kind={kind} date={date} />
      </div>
      <KitIcon name="arrow-right" size={20} />
      {match && <MatchLine match={match} crest={24} className="col-span-full border-t border-dashed border-linha pt-2" />}
    </Link>
  );
}

import Link from "next/link";
import { cn } from "@/lib/cn";
import { KitIcon } from "./kit-icon";
import { Stamp } from "./stamp";

export type VisitKind = "visit" | "match";

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
  /** "row": linha do mobile (padrão). "tile": cartão vertical para grids no desktop. */
  layout?: "row" | "tile";
  className?: string;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function formatStampDate(date: Date | null) {
  if (!date) return "SEM DATA";
  return dateFormat.format(date).replace(/\./g, "").replace(/ de /g, " ").toUpperCase();
}

function KindBadge({ kind, date }: { kind: VisitKind; date: Date | null }) {
  const isMatch = kind === "match";
  return (
    <>
      <KitIcon name={isMatch ? "football" : "stadium"} size={34} />
      <span
        className={cn(
          "rotulo-display rounded-md px-2 py-0.5 text-sm text-estadio",
          isMatch ? "bg-partida" : "bg-visita",
        )}
      >
        {isMatch ? "Partida" : "Visita"}
      </span>
      <span className="font-display text-sm font-medium text-estadio">{formatStampDate(date)}</span>
    </>
  );
}

/** Carimbo do "Meu Passaporte": selo, estádio/cidade, tipo escrito e data. */
export function StampCard({ href, stadium, city, stateCode, kind, date, photoUrl, tone, layout = "row", className }: Props) {
  const place = stateCode ? `${city} - ${stateCode}` : city;
  const card = "papel rounded-2xl border border-estadio/10 shadow-sm transition-transform hover:-translate-y-0.5";

  if (layout === "tile") {
    return (
      <Link href={href} className={cn(card, "flex h-full flex-col items-center gap-4 p-6 text-center", className)}>
        <Stamp name={stadium} place={place} photoUrl={photoUrl} tone={tone} size={150} />
        <div>
          <h3 className="titulo-display text-2xl text-estadio">{stadium}</h3>
          <p className="mt-1 flex items-center justify-center gap-1 text-suave">
            <KitIcon name="location-pin" size={18} />
            {city}
          </p>
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
      </div>
      <div className="flex w-[5.5rem] flex-col items-center gap-1 text-center">
        <KindBadge kind={kind} date={date} />
      </div>
      <KitIcon name="arrow-right" size={20} />
    </Link>
  );
}

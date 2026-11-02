import Image from "next/image";
import Link from "next/link";
import type { PhotoCredit, StadiumSummary } from "@shared/api-types";
import { KitIcon } from "@/components/ui/kit-icon";
import { cn } from "@/lib/cn";

const number = new Intl.NumberFormat("pt-BR");

export function place(s: Pick<StadiumSummary, "city" | "state">) {
  return [s.city, s.state && s.state !== s.city ? s.state : null].filter(Boolean).join(", ") || "Local não informado";
}

/** Capacidade com o selo "a confirmar" quando a fonte é ambígua. */
export function Capacity({ value, needsReview, size = "md" }: { value: number | null; needsReview: boolean; size?: "md" | "lg" }) {
  if (value == null) return <span className="text-sm text-suave">Capacidade não informada</span>;
  return (
    <span className="inline-flex flex-col items-end">
      <span className={cn("font-display font-bold text-estadio", size === "lg" ? "text-4xl" : "text-xl")}>
        {number.format(value)}
      </span>
      <span className="text-xs text-suave">
        lugares
        {needsReview && (
          <span
            className="rotulo-display ml-1 rounded bg-partida px-1 text-[0.65rem] text-estadio"
            title="A fonte traz valores diferentes para a capacidade"
          >
            a confirmar
          </span>
        )}
      </span>
    </span>
  );
}

/** Miniatura do estádio ou ilustração padrão do kit. */
export function StadiumThumb({ url, className, sizes = "64px" }: { url: string | null; className?: string; sizes?: string }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden bg-partida", className)}>
      {url ? (
        <Image src={url} alt="" fill sizes={sizes} className="object-cover" unoptimized />
      ) : (
        <KitIcon name="stadium" size={28} />
      )}
    </span>
  );
}

/** Linha do ranking/lista: posição, foto, nome, local e capacidade. */
export function StadiumRow({ stadium, position }: { stadium: StadiumSummary; position?: number }) {
  return (
    <Link
      href={`/app/estadios/${stadium.id}`}
      className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-linha bg-white p-3 transition-shadow hover:shadow-md"
    >
      {position != null ? (
        <span className="grid size-10 place-items-center rounded-lg bg-estadio font-display text-lg font-bold text-ingresso">
          {position}º
        </span>
      ) : (
        <span />
      )}
      <StadiumThumb url={stadium.thumbUrl} className="size-12 rounded-lg" />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-estadio">{stadium.name}</span>
        <span className="block truncate text-sm text-suave">{place(stadium)}</span>
      </span>
      <Capacity value={stadium.capacity} needsReview={stadium.capacityNeedsReview} />
    </Link>
  );
}

/** Crédito obrigatório das fotos do Commons (autor + licença + página do arquivo). */
export function PhotoCreditLine({ photo, className }: { photo: PhotoCredit; className?: string }) {
  const license = photo.licenseUrl ? (
    <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {photo.license}
    </a>
  ) : (
    photo.license
  );
  return (
    <p className={cn("text-xs text-suave", className)}>
      Foto: {photo.author ?? "autor não informado"} / {license} ·{" "}
      <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        Wikimedia Commons
      </a>
    </p>
  );
}

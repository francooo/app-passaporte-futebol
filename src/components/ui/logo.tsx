import { cn } from "@/lib/cn";
import { KitIcon } from "./kit-icon";

type Props = {
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Wordmark provisório: o logotipo aprovado está apenas rasterizado nos
 * mockups. Substituir pelo SVG oficial quando for entregue.
 */
export function Logo({ size = "sm", className }: Props) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-2 text-estadio", className)}>
      <span
        className={cn(
          "titulo-display flex flex-col leading-[0.9]",
          large ? "text-4xl" : "text-2xl",
        )}
      >
        <span>Passaporte</span>
        <span className="pl-[0.3em]">Esportivo</span>
      </span>
      <KitIcon name="football-postmark" size={large ? 92 : 64} className="h-auto shrink-0" />
      <span className="sr-only">Passaporte Esportivo</span>
    </div>
  );
}

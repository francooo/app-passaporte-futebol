import { cn } from "@/lib/cn";
import { KitIcon } from "./kit-icon";

type Props = {
  size?: keyof typeof sizes;
  className?: string;
};

const sizes = {
  sm: { text: "text-2xl", mark: 64 },
  md: { text: "text-[1.75rem]", mark: 72 },
  lg: { text: "text-4xl", mark: 92 },
  xl: { text: "text-6xl", mark: 150 },
};

/**
 * Wordmark provisório: o logotipo aprovado está apenas rasterizado nos
 * mockups. Substituir pelo SVG oficial quando for entregue.
 */
export function Logo({ size = "sm", className }: Props) {
  const { text, mark } = sizes[size];
  return (
    <div className={cn("flex items-center gap-2 text-estadio", className)}>
      <span className={cn("titulo-display flex flex-col leading-[0.9]", text)}>
        <span>Passaporte</span>
        <span className="pl-[0.3em]">Esportivo</span>
      </span>
      <KitIcon name="football-postmark" size={mark} className="h-auto shrink-0" />
      <span className="sr-only">Passaporte Esportivo</span>
    </div>
  );
}

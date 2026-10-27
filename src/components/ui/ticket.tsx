import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** "vertical": mordidas nas laterais (padrão). "horizontal": no topo e na base. */
  orientation?: "vertical" | "horizontal";
};

/** Moldura amarela perfurada com cartão marfim e "mordidas", como ingresso físico. */
export function Ticket({ children, className, innerClassName, orientation = "vertical" }: Props) {
  return (
    <div className={cn("perfurado rounded-ticket bg-ingresso px-4 py-3", className)}>
      <div
        className={cn(
          orientation === "vertical" ? "mordida" : "mordida-h",
          "papel rounded-2xl p-5",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

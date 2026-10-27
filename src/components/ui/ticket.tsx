import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

/** Moldura amarela perfurada com cartão marfim e "mordidas" laterais. */
export function Ticket({ children, className, innerClassName }: Props) {
  return (
    <div className={cn("perfurado rounded-ticket bg-ingresso px-4 py-3", className)}>
      <div className={cn("mordida papel rounded-2xl p-5", innerClassName)}>{children}</div>
    </div>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primario" | "secundario" | "texto";

const base =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-5 font-display text-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primario: "bg-ingresso text-estadio shadow-[0_2px_0_var(--color-ingresso-escuro)] hover:bg-ingresso-escuro",
  secundario: "border-2 border-estadio bg-white/60 text-estadio hover:bg-estadio hover:text-marfim",
  texto: "text-estadio underline-offset-4 hover:underline",
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; icon?: ReactNode };

export function Button({ variant = "primario", icon, className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; icon?: ReactNode };

export function ButtonLink({ variant = "primario", icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

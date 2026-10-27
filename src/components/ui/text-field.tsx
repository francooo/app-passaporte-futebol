"use client";

import { useId, useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { KitIcon, type KitIconName } from "./kit-icon";

type Props = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  icon?: KitIconName;
  error?: string;
  hint?: string;
};

/** Campo com rótulo persistente, ícone, erro junto ao campo e olho de senha. */
export function TextField({ label, icon, error, hint, type = "text", className, ...props }: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-erro` : hint ? `${id}-dica` : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-estadio">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-12 items-center gap-3 rounded-xl border bg-white px-3 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30",
          error ? "border-erro" : "border-linha",
        )}
      >
        {icon && <KitIcon name={icon} size={22} />}
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-tinta outline-none placeholder:text-suave"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={revealed}
            className="-mr-1 grid size-10 place-items-center rounded-lg"
          >
            <KitIcon name="eye" size={22} className={revealed ? "opacity-100" : "opacity-60"} />
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-sm text-erro">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-dica`} className="text-sm text-suave">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

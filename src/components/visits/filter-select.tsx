"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { KitIcon, type KitIconName } from "@/components/ui/kit-icon";
import { cn } from "@/lib/cn";

/** Seletor que grava o filtro na URL (?param=valor); "" remove o filtro. */
export function FilterSelect({
  param,
  label,
  icon,
  options,
  allLabel,
  className,
}: {
  param: string;
  label: string;
  icon: KitIconName;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-full border border-estadio/30 bg-white px-4 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30",
        pending && "opacity-60",
        className,
      )}
    >
      <KitIcon name={icon} size={20} />
      <span className="sr-only">{label}</span>
      <select
        value={params.get(param) ?? ""}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
        }}
        className="min-w-0 flex-1 bg-transparent py-2 font-display text-lg text-estadio outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

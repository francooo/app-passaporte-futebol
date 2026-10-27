"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "./button";
import { KitIcon } from "./kit-icon";
import { Logo } from "./logo";
import { isActive, navItems } from "./nav-items";

/** Barra superior do desktop (≥ lg). `account` recebe o avatar, que lê a sessão. */
export function TopNav({ account }: { account: ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 hidden border-b-2 border-[#E5DFAF] bg-[#FFFEF8]/95 shadow-[0_3px_9px_#123A3210] backdrop-blur lg:block">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-8 px-8">
        <Link href="/app" aria-label="Passaporte Esportivo — início" className="shrink-0">
          <Logo size="md" />
        </Link>

        <nav aria-label="Navegação principal" className="h-full">
          <ul className="flex h-full items-stretch gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-full items-center gap-2 px-4 font-display text-lg font-semibold tracking-wide transition-colors",
                      active ? "text-estadio" : "text-suave hover:text-estadio",
                    )}
                  >
                    <KitIcon name={item.icon} size={24} className={active ? "" : "opacity-80"} />
                    {item.label}
                    {active && <span className="absolute inset-x-4 bottom-0 h-1 rounded-t-full bg-ingresso" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form action="/app/mapa" role="search" className="ml-auto hidden w-full max-w-64 xl:block">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-linha bg-white px-3 focus-within:border-estadio">
            <KitIcon name="search" size={18} />
            <span className="sr-only">Buscar país, cidade ou estádio</span>
            <input
              name="q"
              type="search"
              placeholder="País, cidade ou estádio"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-suave"
            />
          </label>
        </form>

        <ButtonLink
          href="/app/passaporte"
          aria-label="Adicionar carimbo"
          className="ml-auto min-h-11 shrink-0 px-3 text-lg xl:ml-0 xl:px-4"
          icon={<KitIcon name="camera-ai" size={24} />}
        >
          <span className="hidden xl:inline">Adicionar carimbo</span>
        </ButtonLink>

        {account}
      </div>
    </header>
  );
}

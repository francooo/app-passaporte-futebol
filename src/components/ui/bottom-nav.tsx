"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { KitIcon, type KitIconName } from "./kit-icon";

const items: Array<{ href: string; label: string; icon: KitIconName }> = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/mapa", label: "Mapa", icon: "map" },
  { href: "/app/passaporte", label: "Passaporte", icon: "passport" },
  { href: "/app/perfil", label: "Perfil", icon: "profile" },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}

/** Barra persistente Home → Mapa → Passaporte → Perfil (navegação v05). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#E5DFAF] bg-[#FFFEF8] pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_9px_#123A3210]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold",
                  active ? "text-estadio" : "text-suave",
                )}
              >
                <KitIcon name={item.icon} size={26} className={active ? "" : "opacity-80"} />
                <span>{item.label}</span>
                {active && <span className="absolute bottom-1 h-1 w-9 rounded-full bg-ingresso" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

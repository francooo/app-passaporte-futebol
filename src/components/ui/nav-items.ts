import type { KitIconName } from "./kit-icon";

/** Abas principais (navegação v05): usadas pela barra inferior e pela superior. */
export const navItems: Array<{ href: string; label: string; icon: KitIconName }> = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/mapa", label: "Mapa", icon: "map" },
  { href: "/app/passaporte", label: "Passaporte", icon: "passport" },
  { href: "/app/perfil", label: "Perfil", icon: "profile" },
];

export function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}

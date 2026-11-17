import type { KitIconName } from "./kit-icon";

/** Abas principais (navegação v06): usadas pela barra inferior e pela superior. */
export const navItems: Array<{ href: string; label: string; icon: KitIconName }> = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/mapa", label: "Mapa", icon: "map" },
  { href: "/app/passaporte", label: "Passaporte", icon: "passport" },
  { href: "/app/estatisticas", label: "Estatísticas", icon: "stats" },
  { href: "/app/perfil", label: "Perfil", icon: "profile" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === href;
  // Lista e detalhe de estádios fazem parte da área do Mapa
  if (href === "/app/mapa") return pathname.startsWith(href) || pathname.startsWith("/app/estadios");
  // O registro de um carimbo faz parte da área do Passaporte
  if (href === "/app/passaporte") return pathname.startsWith(href) || pathname.startsWith("/app/registrar");
  return pathname.startsWith(href);
}

import Image from "next/image";

/** Ícones SVG do kit v05 (public/icons). */
export type KitIconName =
  | "arrow-right"
  | "back"
  | "bandeira-argentina"
  | "camera-ai"
  | "crest-stamp"
  | "email"
  | "eye"
  | "football"
  | "football-postmark"
  | "home"
  | "location-pin"
  | "lock"
  | "map"
  | "menu"
  | "passport"
  | "profile"
  | "search"
  | "stadium"
  | "stamp-partida"
  | "stamp-visita";

type Props = {
  name: KitIconName;
  size?: number;
  className?: string;
  /** Texto alternativo; omitido = decorativo. */
  label?: string;
};

export function KitIcon({ name, size = 24, className, label }: Props) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={className}
      unoptimized
    />
  );
}

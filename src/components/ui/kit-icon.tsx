import Image from "next/image";

/** Ícones SVG do kit v05 (public/icons). */
export type KitIconName =
  | "arrow-right"
  | "back"
  | "bandeira-argentina"
  | "calendar"
  | "camera-ai"
  | "crest-stamp"
  | "email"
  | "eye"
  | "football"
  | "football-postmark"
  | "globe"
  | "home"
  | "location-pin"
  | "lock"
  | "map"
  | "menu"
  | "passport"
  | "plane"
  | "profile"
  | "search"
  | "stadium"
  | "stamp-partida"
  | "stamp-visita"
  | "stats"
  | "trash"
  | "trophy";

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

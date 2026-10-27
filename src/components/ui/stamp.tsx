import { cn } from "@/lib/cn";

type Props = {
  name: string;
  place: string;
  photoUrl?: string | null;
  /** Cor do carimbo como código de coleção; o tipo é sempre escrito ao lado. */
  tone?: "verde" | "azul";
  size?: number;
  className?: string;
};

const tones = { verde: "#123A32", azul: "#1F4E9C" };

/** Selo circular com nome do estádio no arco superior e local no inferior. */
export function Stamp({ name, place, photoUrl, tone = "verde", size = 112, className }: Props) {
  const color = tones[tone];
  const uid = `stamp-${name}-${place}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`Carimbo ${name}, ${place}`}
      className={cn("shrink-0 -rotate-3", className)}
    >
      <defs>
        <path id={`${uid}-top`} d="M 20,60 A 40,40 0 0 1 100,60" />
        <path id={`${uid}-bottom`} d="M 11,60 A 49,49 0 0 0 109,60" />
        <clipPath id={`${uid}-clip`}>
          <circle cx="60" cy="60" r="30" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="57" fill="#FFF9E8" stroke={color} strokeWidth="3" />
      <circle cx="60" cy="60" r="35" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
      {photoUrl ? (
        <image
          href={photoUrl}
          x="30"
          y="30"
          width="60"
          height="60"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${uid}-clip)`}
        />
      ) : (
        <g clipPath={`url(#${uid}-clip)`}>
          <rect x="30" y="30" width="60" height="60" fill="#F6E7B0" />
          <path d="M42 66 60 56l18 10v12H42z" fill="#F7C928" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M46 70h28M50 70v8m10-8v8m10-8v8" stroke={color} strokeWidth="1.6" />
        </g>
      )}
      <text fill={color} fontSize="10" fontWeight="700" letterSpacing="1" fontFamily="var(--font-oswald)">
        <textPath href={`#${uid}-top`} startOffset="50%" textAnchor="middle">
          {name.toUpperCase()}
        </textPath>
      </text>
      <text fill={color} fontSize="9" fontWeight="700" letterSpacing="1" fontFamily="var(--font-oswald)">
        <textPath href={`#${uid}-bottom`} startOffset="50%" textAnchor="middle">
          {place.toUpperCase()}
        </textPath>
      </text>
      <text x="15" y="63" fill={color} fontSize="8" textAnchor="middle">★</text>
      <text x="105" y="63" fill={color} fontSize="8" textAnchor="middle">★</text>
    </svg>
  );
}

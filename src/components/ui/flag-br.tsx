/** Bandeira do Brasil em SVG (emoji de bandeira não renderiza no Windows). */
export function FlagBR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" width={28} height={20} aria-hidden className={className}>
      <rect width="28" height="20" rx="3" fill="#009C3B" />
      <path d="M14 3 25 10 14 17 3 10z" fill="#FFDF00" />
      <circle cx="14" cy="10" r="4.2" fill="#002776" />
    </svg>
  );
}

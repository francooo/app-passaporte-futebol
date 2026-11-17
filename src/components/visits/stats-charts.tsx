import type { FanStats } from "@shared/api-types";

/**
 * Gráficos de "Sua jornada em números": uma série só (registros por ano, cor estádio)
 * e um medidor de % de vitórias. Cada barra tem rótulo direto e dica ao passar o mouse;
 * a tabela oculta repete os números para leitores de tela.
 */
export function YearBars({ data }: { data: FanStats["byYear"] }) {
  // Preenche os anos sem registro entre o primeiro e o último (até 8 anos)
  const last = data.at(-1)!.year;
  const first = Math.max(data[0].year, last - 7);
  const counts = new Map(data.map((d) => [d.year, d.count]));
  const years = Array.from({ length: last - first + 1 }, (_, i) => ({ year: first + i, count: counts.get(first + i) ?? 0 }));
  const max = Math.max(...years.map((y) => y.count), 1);
  // Topo da escala "redondo" (1, 2, 5, 10, 15, 20…)
  const top = max <= 5 ? Math.max(max, 1) : Math.ceil(max / 5) * 5;
  const ticks = top <= 5 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, top / 5, (2 * top) / 5, (3 * top) / 5, (4 * top) / 5, top].map(Math.round);
  const uniqueTicks = [...new Set(ticks)];

  return (
    <figure className="flex flex-col gap-2">
      <div className="grid grid-cols-[auto_1fr] gap-2">
        {/* Eixo Y */}
        <div className="relative h-56 w-6 text-right text-xs text-suave" aria-hidden>
          {uniqueTicks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-56">
          {/* Grade recessiva */}
          {uniqueTicks.map((t) => (
            <span key={t} aria-hidden className="absolute inset-x-0 border-t border-linha/70" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <ul className="absolute inset-0 flex items-end gap-0.5 px-1" aria-hidden>
            {years.map((y) => (
              <li key={y.year} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                {y.count > 0 && <span className="mb-1 font-display text-lg font-semibold text-tinta">{y.count}</span>}
                <span
                  className="w-full max-w-16 rounded-t-sm bg-estadio transition-colors group-hover:bg-estadio-claro"
                  style={{ height: `${(y.count / top) * 100}%`, minHeight: y.count ? 4 : 0 }}
                />
                {/* Dica (área de toque = a coluna inteira) */}
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-tinta px-2 py-1 text-xs text-marfim shadow group-hover:block">
                  {y.year}: {y.count} {y.count === 1 ? "registro" : "registros"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span />
        <div className="flex gap-0.5 px-1 text-center text-sm text-tinta" aria-hidden>
          {years.map((y) => (
            <span key={y.year} className="flex-1">
              {y.year}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Registros por ano</caption>
        <thead>
          <tr>
            <th scope="col">Ano</th>
            <th scope="col">Registros</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year}>
              <th scope="row">{y.year}</th>
              <td>{y.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Medidor circular de % de vitórias (valor sempre escrito no centro). */
export function WinRing({ rate }: { rate: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="size-36 shrink-0 -rotate-90" role="img" aria-label={`${rate}% de vitórias`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-linha)" strokeWidth="10" />
      {rate > 0 && (
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--color-ingresso)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(rate / 100) * c} ${c}`}
      />
      )}
      <text x="50" y="50" transform="rotate(90 50 50)" textAnchor="middle" dominantBaseline="central" fill="var(--color-estadio)" fontSize="22" fontWeight="700" fontFamily="var(--font-oswald)">
        {rate}%
      </text>
    </svg>
  );
}

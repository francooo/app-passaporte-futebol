import type { Metadata } from "next";
import { SPORT_INFO } from "@shared/sports";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { StadiumThumb } from "@/components/catalog/stadium-bits";
import { ButtonLink } from "@/components/ui/button";
import { KitIcon, type KitIconName } from "@/components/ui/kit-icon";
import { FilterSelect } from "@/components/visits/filter-select";
import { YearBars, WinRing } from "@/components/visits/stats-charts";
import { TeamCrest } from "@/components/visits/team-crest";
import { getCurrentUser } from "@/lib/dal";
import { statsForUser } from "@/lib/visits";

export const metadata: Metadata = { title: "Estatísticas" };

const number = new Intl.NumberFormat("pt-BR");

export default function EstatisticasPage({ searchParams }: PageProps<"/app/estatisticas">) {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <h1 className="titulo-display text-5xl text-estadio lg:text-7xl">Sua jornada em números</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-ticket bg-white/60" />}>
        <Stats searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Stats({ searchParams }: Pick<PageProps<"/app/estatisticas">, "searchParams">) {
  const user = await getCurrentUser();
  const { time } = await searchParams;
  const s = await statsForUser(user.id, typeof time === "string" ? time.slice(0, 64) : null);
  const total = s.matches + s.visits;

  if (total === 0) {
    return (
      <div className="papel flex flex-col items-center gap-3 rounded-2xl border border-dashed border-linha p-8 text-center">
        <KitIcon name="stats" size={56} />
        <p className="titulo-display text-2xl text-estadio">Ainda não há números para mostrar</p>
        <p className="max-w-md text-suave">Registre visitas e partidas: países, estádios, km viajados e o desempenho do seu time aparecem aqui.</p>
        <ButtonLink href="/app/registrar" icon={<KitIcon name="camera-ai" size={26} />}>
          Adicionar carimbo
        </ButtonLink>
      </div>
    );
  }

  const multi = s.bySport.some((b) => b.sport !== "futebol");
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <Tile icon="globe" value={s.countries} label={s.countries === 1 ? "país" : "países"} />
        {/* Com outros esportes: "locais" (ginásios e arenas) e as partidas separadas por esporte */}
        <Tile
          icon={multi ? "arena" : "stadium"}
          value={s.stadiums}
          label={multi ? (s.stadiums === 1 ? "local" : "locais") : s.stadiums === 1 ? "estádio" : "estádios"}
        />
        <Tile
          icon={multi ? "trophy" : "football"}
          value={s.matches}
          label={s.matches === 1 ? "partida" : "partidas"}
          hint={multi ? s.bySport.map((b) => `${b.matches} ${SPORT_INFO[b.sport].label.toLowerCase()}`).join(" · ") : undefined}
        />
        {s.km != null ? (
          <Tile icon="plane" value={s.km} label="km viajados" hint={`ida e volta a partir de ${s.homeCity?.split(",")[0]}`} />
        ) : (
          <li className="perfurado rounded-ticket bg-ingresso p-2">
            <Link href="/app/perfil#cidade" className="papel mordida flex h-full flex-col justify-center gap-1 rounded-2xl p-4 hover:bg-white">
              <span className="flex items-center gap-2 font-display text-lg font-semibold text-estadio">
                <KitIcon name="plane" size={28} /> km viajados
              </span>
              <span className="text-sm text-tinta underline underline-offset-4">Informe sua cidade no Perfil para calcular</span>
            </Link>
          </li>
        )}
      </ul>

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <Panel title="Registros por ano">
          {s.byYear.length ? <YearBars data={s.byYear} /> : <p className="text-suave">Seus registros ainda não têm data.</p>}
        </Panel>

        <Panel title="Desempenho do seu time">
          {s.team ? (
            <div className="flex flex-col gap-4">
              {s.teamsSeen.length > 1 && (
                <FilterSelect
                  param="time"
                  label="Time"
                  icon="crest-stamp"
                  allLabel={`${s.team.team.name} (padrão)`}
                  options={s.teamsSeen.filter((t) => t.id !== s.team!.team.id).map((t) => ({ value: t.id!, label: t.name }))}
                  className="rounded-xl"
                />
              )}
              <div className="flex items-center gap-3">
                <TeamCrest team={s.team.team} size={40} />
                <p className="titulo-display text-2xl text-estadio">{s.team.team.name}</p>
              </div>
              {s.team.winRate != null ? (
                <div className="flex items-center gap-5">
                  <WinRing rate={s.team.winRate} />
                  <p className="titulo-display text-5xl text-estadio">
                    {s.team.winRate}%<span className="block font-display text-2xl font-normal">vitórias</span>
                  </p>
                </div>
              ) : (
                <p className="text-suave">Sem placar registrado nas partidas desse time.</p>
              )}
              <p className="font-display text-lg text-tinta">
                {plural(s.team.wins, "vitória", "vitórias")} · {plural(s.team.draws, "empate", "empates")} ·{" "}
                {plural(s.team.losses, "derrota", "derrotas")}
              </p>
              <p className="text-xs text-suave">Nas partidas que você registrou com esse time em campo.</p>
            </div>
          ) : (
            <p className="text-suave">Registre partidas de futebol para ver o desempenho do seu time quando você está no estádio.</p>
          )}
        </Panel>

        <Panel title={multi ? "Maiores locais que você visitou" : "Maiores estádios que você visitou"} subtitle="Ranking por capacidade">
          {s.biggestStadiums.length ? (
            <ol className="flex flex-col gap-2">
              {s.biggestStadiums.map((st, i) => (
                <li key={st.id}>
                  <Link
                    href={`/app/estadios/${st.id}`}
                    className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-linha bg-white p-2 pr-3 transition-shadow hover:shadow-md"
                  >
                    <StadiumThumb url={st.thumbUrl} className="size-12 rounded-full" sizes="48px" />
                    <span className="font-display text-lg text-estadio">{i + 1}.</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg font-semibold text-estadio">{st.name}</span>
                      {st.city && <span className="block truncate text-xs text-suave">{st.city}</span>}
                    </span>
                    <span className="font-display text-lg font-semibold tabular-nums text-tinta">{number.format(st.capacity)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-suave">Os locais que você registrou não têm capacidade informada.</p>
          )}
        </Panel>
      </div>

      {s.predictions.judged > 0 && (
        <section aria-label="Palpites" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-linha bg-white/80 p-4">
          <span className="titulo-display text-2xl text-estadio">Seus palpites</span>
          <span className="font-display text-lg text-tinta">
            {s.predictions.exact + s.predictions.winner} de {s.predictions.judged} certos · {plural(s.predictions.exact, "na mosca", "na mosca")}
          </span>
          <span className="text-xs text-suave">Na mosca = placar exato. Certo = acertou o vencedor ou o empate.</span>
        </section>
      )}

      <p className="text-sm text-suave">
        {plural(total, "registro", "registros")} no total ({plural(s.visits, "visita", "visitas")} e {plural(s.matches, "partida", "partidas")}).
        Distâncias em linha reta, ida e volta.
      </p>
    </>
  );
}

function plural(n: number, one: string, many: string) {
  return `${number.format(n)} ${n === 1 ? one : many}`;
}

function Tile({ icon, value, label, hint }: { icon: KitIconName; value: number; label: string; hint?: string }) {
  return (
    <li className="perfurado rounded-ticket bg-ingresso p-2">
      <div className="papel mordida flex h-full items-center gap-3 rounded-2xl p-4 lg:gap-4 lg:p-5">
        <KitIcon name={icon} size={44} className="hidden shrink-0 sm:block lg:size-14" />
        <div className="min-w-0">
          <p className="titulo-display text-4xl tabular-nums text-estadio lg:text-5xl">{number.format(value)}</p>
          <p className="font-display text-lg text-tinta lg:text-xl">{label}</p>
          {hint && <p className="line-clamp-2 text-xs text-suave">{hint}</p>}
        </div>
      </div>
    </li>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-linha bg-white/80 p-4 lg:p-6">
      <div>
        <h2 className="titulo-display text-2xl text-estadio lg:text-3xl">{title}</h2>
        {subtitle && <p className="text-sm text-suave">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

import type { FanStats, Sport, TeamRef } from "@shared/api-types";

/**
 * Estatísticas do torcedor ("Sua jornada em números"), calculadas a partir dos registros.
 * Funções puras: os dados vêm de src/lib/visits.ts e os testes ficam em stats.test.ts.
 */

export type StatVisit = {
  kind: "visit" | "match";
  /** Ausente = futebol (registros antigos). */
  sport?: Sport;
  date: string | null;
  stadium: {
    id: string;
    name: string;
    city: string | null;
    country: string;
    lat: number | null;
    lng: number | null;
    capacity: number | null;
    thumbUrl: string | null;
  };
  home: TeamRef | null;
  away: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
};

export type StatOptions = {
  home: { city: string; lat: number; lng: number } | null;
  /** Time do "Desempenho do seu time" (padrão: time do coração ou o mais visto). */
  teamId: string | null;
};

const EARTH_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distância em linha reta (km) entre dois pontos. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Resultado do ponto de vista do time: "W" vitória, "D" empate, "L" derrota (null se ele não jogou ou falta placar). */
export function resultFor(teamId: string, v: Pick<StatVisit, "home" | "away" | "homeScore" | "awayScore">) {
  if (v.homeScore == null || v.awayScore == null) return null;
  const isHome = v.home?.id === teamId;
  const isAway = v.away?.id === teamId;
  if (!isHome && !isAway) return null;
  const own = isHome ? v.homeScore : v.awayScore;
  const other = isHome ? v.awayScore : v.homeScore;
  return own > other ? "W" : own === other ? "D" : "L";
}

export function computeStats(visits: StatVisit[], { home, teamId }: StatOptions): Omit<FanStats, "homeCity" | "predictions"> {
  const matches = visits.filter((v) => v.kind === "match");
  // "Desempenho do seu time": um só time do coração, de futebol
  const football = matches.filter((v) => (v.sport ?? "futebol") === "futebol");
  const sports = new Map<Sport, number>();
  for (const v of matches) sports.set(v.sport ?? "futebol", (sports.get(v.sport ?? "futebol") ?? 0) + 1);

  // Km: ida e volta entre a cidade do usuário e o estádio, por registro
  let km: number | null = null;
  if (home) {
    km = 0;
    for (const v of visits) {
      if (v.stadium.lat == null || v.stadium.lng == null) continue;
      km += 2 * haversineKm(home, { lat: v.stadium.lat, lng: v.stadium.lng });
    }
    km = Math.round(km);
  }

  const years = new Map<number, number>();
  for (const v of visits) {
    if (!v.date) continue;
    const year = Number(v.date.slice(0, 4));
    years.set(year, (years.get(year) ?? 0) + 1);
  }

  // Times vistos em partidas de futebol (com id), do mais frequente para o menos
  const seen = new Map<string, { team: TeamRef; count: number }>();
  for (const v of football) {
    for (const t of [v.home, v.away]) {
      if (!t?.id) continue;
      const entry = seen.get(t.id) ?? { team: t, count: 0 };
      entry.count += 1;
      seen.set(t.id, entry);
    }
  }
  const teamsSeen = [...seen.values()].sort((a, b) => b.count - a.count).map((e) => e.team);

  const chosen = (teamId && seen.get(teamId)?.team) || teamsSeen[0] || null;
  let team: FanStats["team"] = null;
  if (chosen?.id) {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (const v of football) {
      const r = resultFor(chosen.id, v);
      if (r === "W") wins++;
      else if (r === "D") draws++;
      else if (r === "L") losses++;
    }
    const played = wins + draws + losses;
    team = { team: chosen, wins, draws, losses, winRate: played ? Math.round((wins / played) * 100) : null };
  }

  const biggest = new Map<string, FanStats["biggestStadiums"][number]>();
  for (const v of visits) {
    if (v.stadium.capacity == null || biggest.has(v.stadium.id)) continue;
    biggest.set(v.stadium.id, {
      id: v.stadium.id,
      name: v.stadium.name,
      city: v.stadium.city,
      capacity: v.stadium.capacity,
      thumbUrl: v.stadium.thumbUrl,
    });
  }

  return {
    countries: new Set(visits.map((v) => v.stadium.country)).size,
    stadiums: new Set(visits.map((v) => v.stadium.id)).size,
    matches: matches.length,
    visits: visits.length - matches.length,
    km,
    byYear: [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })),
    bySport: [...sports.entries()].sort((a, b) => b[1] - a[1]).map(([sport, count]) => ({ sport, matches: count })),
    team,
    teamsSeen,
    biggestStadiums: [...biggest.values()].sort((a, b) => b.capacity - a.capacity).slice(0, 5),
  };
}

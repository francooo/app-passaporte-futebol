/**
 * API-Sports (basquete e vôlei): ligas importadas, leitura dos jogos e status normalizado para o vocabulário
 * do football-data (TIMED, IN_PLAY, FINISHED…), usado pela busca de partidas, "próximo jogo" e resultado.
 * Funções puras, testadas em api-sports.test.ts.
 */
import type { Sport } from "../../../shared/sports";
import { stadiumKey } from "./link";

export type ApiSport = Extract<Sport, "basquete" | "volei">;

export const API_SPORTS: Record<ApiSport, { baseUrl: string; provider: "api-basketball" | "api-volleyball" }> = {
  basquete: { baseUrl: "https://v1.basketball.api-sports.io", provider: "api-basketball" },
  volei: { baseUrl: "https://v1.volleyball.api-sports.io", provider: "api-volleyball" },
};

/** Ligas importadas (ids da API-Sports, conferidos com /leagues?country=Brazil). */
export const API_SPORTS_LEAGUES: Array<{ sport: ApiSport; id: number; code: string; name: string }> = [
  { sport: "basquete", id: 26, code: "bkb-26", name: "NBB" },
  { sport: "volei", id: 25, code: "vlb-25", name: "Superliga Masculina" },
  { sport: "volei", id: 24, code: "vlb-24", name: "Superliga Feminina" },
];

type RawTeam = { id: number; name: string; logo?: string | null };
type RawBasketScore = { total?: number | null } | null;

/** Jogo como vem da API (/games). Basquete: placar por quarto + total; vôlei: sets vencidos. */
export type RawGame = {
  id: number;
  date: string;
  venue?: string | null;
  status: { short: string; long?: string };
  league: { id: number; name: string; logo?: string | null; season?: string | number };
  teams: { home: RawTeam; away: RawTeam };
  scores: { home: number | RawBasketScore | null; away: number | RawBasketScore | null };
};

export type SportGame = {
  id: string;
  utcDate: Date;
  status: string;
  leagueId: number;
  leagueLogo: string | null;
  home: { id: string; name: string; logo: string | null };
  away: { id: string; name: string; logo: string | null };
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
};

const STATUS: Record<string, string> = {
  NS: "TIMED",
  TBD: "SCHEDULED",
  FT: "FINISHED",
  AOT: "FINISHED",
  AWD: "AWARDED",
  AW: "AWARDED",
  POST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
  SUSP: "SUSPENDED",
  INTR: "SUSPENDED",
};

/** Q1–Q4, OT, HT, BT (basquete) e S1–S5 (vôlei) = em andamento. */
export const normalizeStatus = (short: string) => STATUS[short] ?? "IN_PLAY";

const scoreOf = (s: number | RawBasketScore | null) => (typeof s === "number" ? s : (s?.total ?? null));

/** Times femininos vêm com " W" no fim ("Minas W"): na tela, "Minas (F)". */
export const teamDisplayName = (name: string) => (/ W$/.test(name) ? `${name.slice(0, -2)} (F)` : name);

export function parseGame(g: RawGame): SportGame {
  const finished = ["FINISHED", "AWARDED"].includes(normalizeStatus(g.status.short));
  const team = (t: RawTeam) => ({ id: String(t.id), name: teamDisplayName(t.name), logo: t.logo ?? null });
  return {
    id: String(g.id),
    utcDate: new Date(g.date),
    status: normalizeStatus(g.status.short),
    leagueId: g.league.id,
    leagueLogo: g.league.logo ?? null,
    home: team(g.teams.home),
    away: team(g.teams.away),
    // Placar parcial de jogo em andamento não é resultado
    homeScore: finished ? scoreOf(g.scores.home) : null,
    awayScore: finished ? scoreOf(g.scores.away) : null,
    venue: g.venue?.trim() || null,
  };
}

/** Palavras genéricas de ginásios ("Ginásio X" × "X", "Arena X"). */
const VENUE_WORDS = new Set(["ginasio", "arena", "poliesportivo", "esportes", "esportivo", "complexo", "centro", "gymnasium"]);
const venueKey = (name: string) =>
  stadiumKey(name)
    .split(" ")
    .filter((w) => w && !VENUE_WORDS.has(w))
    .join(" ");

/** Ginásio do catálogo pelo nome informado no jogo (basquete): igual sem acentos/prefixos, ou um contém o outro (sem ambiguidade). */
export function findVenue(venue: string | null, pool: Array<{ id: string; name: string }>): string | null {
  if (!venue) return null;
  const key = venueKey(venue);
  if (key.length < 4) return null;
  const exact = pool.find((s) => venueKey(s.name) === key);
  if (exact) return exact.id;
  const partial = pool.filter((s) => {
    const k = venueKey(s.name);
    return k.length >= 4 && (k.includes(key) || key.includes(k));
  });
  return partial.length === 1 ? partial[0].id : null;
}

/** Dias (UTC) que o plano gratuito aceita em /games?date=: ontem, hoje e amanhã. */
export function freePlanDays(now = new Date()) {
  return [-1, 0, 1].map((d) => new Date(now.getTime() + d * 86_400_000).toISOString().slice(0, 10));
}

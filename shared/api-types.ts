import type { FieldErrors } from "./schemas";

/** Contrato da API mobile (src/app/api/mobile/*). */

export type ApiUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  premium: boolean;
};

export type AuthResponse = { token: string; user: ApiUser };

export type MessageResponse = { message: string };

export type ApiError = {
  error: "validation" | "unauthorized" | "not_found" | "too_large" | "conflict" | "rate_limited" | "server";
  message: string;
  fields?: FieldErrors;
};

// ── Catálogo de estádios (src/app/api/catalog/*) ─────────────────────────────

export type CatalogCountry = { iso3: string; iso2: string | null; name: string; stadiumCount: number };

export type StadiumSummary = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  capacity: number | null;
  /** Capacidade incerta na fonte: exibir "a confirmar". */
  capacityNeedsReview: boolean;
  /** Miniatura de 330 px (largura padrão do Wikimedia Commons). */
  thumbUrl: string | null;
};

export type StadiumPage = { items: StadiumSummary[]; nextPage: number | null; total: number };

export type PhotoCredit = {
  url: string;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  /** Página do arquivo no Wikimedia Commons. */
  pageUrl: string;
};

export type StadiumDetail = StadiumSummary & {
  countryName: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  /** "openstreetmap" exige a atribuição "© OpenStreetMap" junto ao endereço. */
  addressSource: string | null;
  openedYear: number | null;
  clubs: string[];
  website: string | null;
  photo: PhotoCredit | null;
  wikidataUrl: string | null;
};

// ── Registros, partidas e estatísticas ───────────────────────────────────────

export type TeamRef = { id: string | null; name: string; crestUrl: string | null };

export type VisitPhoto = { id: string; thumbUrl: string; url: string };

export type VisitSummary = {
  id: string;
  kind: "visit" | "match";
  /** "AAAA-MM-DD" ou null (registro sem data). */
  date: string | null;
  stadium: { id: string; name: string; city: string | null; state: string | null; country: string; thumbUrl: string | null };
  home: TeamRef | null;
  away: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
  /** Primeira foto do registro (miniatura) ou null. */
  coverUrl: string | null;
};

export type VisitDetail = VisitSummary & {
  note: string | null;
  matchId: string | null;
  photos: VisitPhoto[];
};

export type VisitList = {
  items: VisitSummary[];
  /** Totais de todo o histórico (independem dos filtros). */
  totals: { stamps: number; stadiums: number };
  /** Anos e competições com registros, para montar os filtros. */
  years: number[];
  competitions: string[];
};

export type MatchResult = {
  id: string;
  competition: { code: string; name: string };
  /** ISO (UTC). */
  utcDate: string;
  home: TeamRef;
  away: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  stadiumId: string | null;
};

export type CompetitionOption = { code: string; name: string; emblemUrl: string | null };

/** Partida agendada (ainda não jogada) num estádio do catálogo. */
export type UpcomingMatch = {
  id: string;
  /** ISO (UTC); o cliente formata no fuso do aparelho. */
  utcDate: string;
  competition: { code: string; name: string };
  home: TeamRef;
  away: TeamRef;
};

export type NearbyStadium = StadiumSummary & {
  distanceKm: number;
  /** Partidas agendadas nos próximos 14 dias no estádio (até 3). Ausente em versões antigas da API. */
  upcoming?: UpcomingMatch[];
};

export type FanStats = {
  countries: number;
  stadiums: number;
  matches: number;
  visits: number;
  /** null quando o usuário ainda não informou a cidade onde mora. */
  km: number | null;
  homeCity: string | null;
  byYear: Array<{ year: number; count: number }>;
  team: {
    team: TeamRef;
    wins: number;
    draws: number;
    losses: number;
    /** % de vitórias (0–100) entre as partidas com placar em que o time jogou. */
    winRate: number | null;
  } | null;
  /** Times que aparecem nas partidas registradas (seletor "Desempenho do seu time"). */
  teamsSeen: TeamRef[];
  biggestStadiums: Array<{ id: string; name: string; city: string | null; capacity: number; thumbUrl: string | null }>;
};

export type MeProfile = ApiUser & { homeCity: string | null; favoriteTeam: TeamRef | null };

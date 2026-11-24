import type { FieldErrors } from "./schemas";
import type { Sport, VenueType } from "./sports";

export type { Sport, VenueType } from "./sports";

/** Contrato da API mobile (src/app/api/mobile/*). */

export type ApiUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  premium: boolean;
  /** "moderator"/"admin" veem a moderação de locais e times. */
  role: "user" | "moderator" | "admin";
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
  /** Esportes jogados no local e tipo (estádio, arena, ginásio). */
  sports: Sport[];
  venueType: VenueType;
  /** Local cadastrado por usuário, ainda em moderação (só o autor vê). */
  pending?: boolean;
  /**
   * Partidas agendadas no estádio (estádio do mandante), por data. Busca e lista do país: o próximo jogo
   * em 30 dias; estádios perto: até 3 em 14 dias. Ausente nas demais rotas.
   */
  upcoming?: UpcomingMatch[];
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
  sport: Sport;
  /** "AAAA-MM-DD" ou null (registro sem data). */
  date: string | null;
  stadium: { id: string; name: string; city: string | null; state: string | null; country: string; thumbUrl: string | null };
  home: TeamRef | null;
  away: TeamRef | null;
  /** Resultado oficial; null enquanto o jogo não termina. */
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
  /** Palpite do torcedor (carimbo criado antes do fim do jogo). */
  prediction: { home: number; away: number } | null;
  /** Situação do resultado (só partidas). */
  result: VisitResultState | null;
  /** Palpite × resultado: placar exato, vencedor/empate, ou errou. */
  predictionOutcome: "exact" | "winner" | "miss" | null;
};

export type VisitResultState = {
  status: "pending" | "final";
  source: "football-data" | "api-football" | "api-basketball" | "api-volleyball" | "manual" | null;
  /** Início + 2 h (ISO); antes disso a tela mostra "resultado por volta de…". */
  expectedEndAt: string | null;
  /** Pendente e sem busca automática possível (ou ela desistiu): pedir o resultado à mão. */
  needsManual: boolean;
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
  /** Esportes com registros (o filtro de esporte só aparece com mais de um). */
  sports: Sport[];
};

export type MatchResult = {
  id: string;
  sport: Sport;
  competition: { code: string; name: string };
  /** ISO (UTC). */
  utcDate: string;
  home: TeamRef;
  away: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  stadiumId: string | null;
  /** Status do football-data; diferente de FINISHED = ainda não terminou (hoje/ao vivo). */
  status?: string;
};

export type CompetitionOption = { code: string; name: string; emblemUrl: string | null; sport: Sport };

/** Partida agendada (ainda não jogada) num estádio do catálogo. */
export type UpcomingMatch = {
  id: string;
  sport: Sport;
  /** ISO (UTC); o cliente formata no fuso do aparelho. */
  utcDate: string;
  competition: { code: string; name: string };
  home: TeamRef;
  away: TeamRef;
};

export type NearbyStadium = StadiumSummary & {
  distanceKm: number;
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
  /** Partidas por esporte (só os esportes com partidas), da maior para a menor. */
  bySport: Array<{ sport: Sport; matches: number }>;
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
  /** Palpites com resultado: total, placares exatos e vencedor/empate certo (sem contar os exatos). */
  predictions: { judged: number; exact: number; winner: number };
};

// ── Moderação (src/app/api/moderation/*) ──────────────────────────────────────

type PendingBase = {
  id: string;
  /** ISO */
  createdAt: string;
  /** Nome de quem cadastrou (null se a conta foi apagada). */
  author: string | null;
  /** Carimbos que usam o cadastro. */
  uses: number;
};

export type PendingVenue = PendingBase & {
  name: string;
  city: string;
  state: string | null;
  country: string;
  sports: Sport[];
  venueType: VenueType;
  lat: number | null;
  lng: number | null;
  /** Locais aprovados da mesma cidade com nome parecido. */
  duplicates: Array<{ id: string; name: string; city: string | null }>;
};

export type PendingTeam = PendingBase & {
  name: string;
  shortName: string | null;
  sport: Sport;
  crestUrl: string | null;
  /** Times aprovados do mesmo esporte com nome parecido. */
  duplicates: Array<{ id: string; name: string; crestUrl: string | null }>;
};

export type ModerationQueue = { venues: PendingVenue[]; teams: PendingTeam[] };

export type MeProfile = ApiUser & { homeCity: string | null; favoriteTeam: TeamRef | null };

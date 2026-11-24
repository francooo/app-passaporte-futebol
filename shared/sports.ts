/**
 * Esportes do Passaporte: textos, ícone, unidade e regras do placar de cada um.
 * Fonte única para o web, a API e o app (testes em src/lib/sports.test.ts).
 */

export const SPORTS = ["futebol", "volei", "basquete", "futsal"] as const;
export type Sport = (typeof SPORTS)[number];

export const VENUE_TYPES = ["estadio", "arena", "ginasio"] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export type SportIcon = "football" | "volleyball" | "basketball" | "futsal";

export type SportInfo = {
  label: string;
  icon: SportIcon;
  /** Nome do local na tela de registro ("Estádio", "Ginásio ou arena"). */
  venueNoun: string;
  /** Plural do placar: "gols do mandante", "sets do visitante". */
  scoreUnit: "gols" | "pontos" | "sets";
  maxScore: number;
  allowsDraw: boolean;
  /** Duração prevista com folga (intervalos, prorrogação/tie-break): depois disso começa a busca do resultado. */
  durationMs: number;
};

const HOUR = 60 * 60 * 1000;

export const SPORT_INFO: Record<Sport, SportInfo> = {
  futebol: { label: "Futebol", icon: "football", venueNoun: "Estádio", scoreUnit: "gols", maxScore: 99, allowsDraw: true, durationMs: 2 * HOUR },
  volei: { label: "Vôlei", icon: "volleyball", venueNoun: "Ginásio ou arena", scoreUnit: "sets", maxScore: 3, allowsDraw: false, durationMs: 2.5 * HOUR },
  basquete: { label: "Basquete", icon: "basketball", venueNoun: "Ginásio ou arena", scoreUnit: "pontos", maxScore: 250, allowsDraw: false, durationMs: 2.5 * HOUR },
  futsal: { label: "Futsal", icon: "futsal", venueNoun: "Ginásio ou arena", scoreUnit: "gols", maxScore: 99, allowsDraw: true, durationMs: 1.75 * HOUR },
};

export const DEFAULT_SPORT: Sport = "futebol";

export const isSport = (v: unknown): v is Sport => typeof v === "string" && (SPORTS as readonly string[]).includes(v);

/** Parâmetro "?esporte=" das rotas e telas (valor inválido = sem filtro). */
export const parseSport = (v: string | null | undefined): Sport | null => (isSport(v) ? v : null);

/** Esportes que o local recebe por padrão quando a fonte não diz (arena/ginásio poliesportivo). */
export const INDOOR_SPORTS: Sport[] = ["volei", "basquete", "futsal"];

/**
 * Placar válido para o esporte (resultado final). Null = válido; senão, a mensagem do erro.
 * Vôlei: melhor de 5 sets, o vencedor tem 3 e o outro 0 a 2. Sem empate em vôlei e basquete.
 */
export function scoreError(sport: Sport, home: number, away: number): string | null {
  const info = SPORT_INFO[sport];
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > info.maxScore || away > info.maxScore) {
    return "Placar inválido.";
  }
  if (sport === "volei") {
    const ok = (home === 3 && away <= 2) || (away === 3 && home <= 2);
    return ok ? null : "No vôlei, o vencedor tem 3 sets e o outro de 0 a 2.";
  }
  if (!info.allowsDraw && home === away) return `Não existe empate no ${info.label.toLowerCase()}.`;
  return null;
}

/** Palpite: mesmas regras do resultado (no vôlei, também 3×0, 3×1 ou 3×2). */
export const predictionError = scoreError;

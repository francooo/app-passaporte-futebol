import { SPORT_INFO, type Sport } from "./sports";

/** Textos por esporte usados no registro, no carimbo e no resultado (web e app). */
export const SPORT_COPY: Record<Sport, { matchExample: string; teamExample: string; competitionExample: string; source: string | null }> = {
  futebol: { matchExample: "Ex.: Flamengo x Botafogo", teamExample: "Ex.: Flamengo", competitionExample: "Ex.: Copa do Brasil", source: "football-data.org · principais ligas" },
  volei: { matchExample: "Ex.: Sesi Bauru x Minas", teamExample: "Ex.: Sada Cruzeiro", competitionExample: "Ex.: Superliga", source: "API-Sports · Superliga" },
  basquete: { matchExample: "Ex.: Flamengo x Franca", teamExample: "Ex.: Franca", competitionExample: "Ex.: NBB", source: "API-Sports · NBB" },
  futsal: { matchExample: "Ex.: Magnus x Corinthians", teamExample: "Ex.: Magnus Futsal", competitionExample: "Ex.: Liga Nacional de Futsal", source: null },
};

/** "Gols do mandante", "Sets do visitante", "Pontos do mandante". */
export const scoreFieldLabel = (sport: Sport, side: "home" | "away") =>
  `${SPORT_INFO[sport].scoreUnit[0].toUpperCase()}${SPORT_INFO[sport].scoreUnit.slice(1)} do ${side === "home" ? "mandante" : "visitante"}`;

/** Dígitos do campo de placar: basquete passa de 99; vôlei é 0 a 3. */
export const scoreDigits = (sport: Sport) => String(SPORT_INFO[sport].maxScore).length;

/** O esporte tem partidas importadas (busca em "Encontre a partida")? Futsal é só manual. */
export const hasMatchSource = (sport: Sport) => SPORT_COPY[sport].source != null;

/** Título de listas de locais ("Estádios", "Ginásios e arenas"). */
export const venuePlural = (sport: Sport) => (sport === "futebol" ? "Estádios" : "Ginásios e arenas");

/** Nome do local em frases ("estádio", "local"). */
export const venueWord = (sport: Sport) => (sport === "futebol" ? "estádio" : "local");

/**
 * Tokens do kit v05 "Ingresso de arquibancada" — fonte única para web e mobile.
 * O web espelha estas cores em src/app/globals.css (@theme).
 */
export const colors = {
  estadio: "#123A32",
  estadioClaro: "#1D5245",
  estadioEscuro: "#0B2620",
  ingresso: "#F7C928",
  ingressoEscuro: "#E0B416",
  marfim: "#FFF9E8",
  papel: "#F8F3E3",
  tinta: "#172520",
  suave: "#5B6B64",
  linha: "#D8D0B4",
  visita: "#D6E3D6",
  partida: "#F6E7B0",
  erro: "#B3261E",
  branco: "#FFFFFF",
  navFundo: "#FFFEF8",
  navBorda: "#E5DFAF",
  carimboAzul: "#1F4E9C",
} as const;

export const radius = {
  campo: 12,
  cartao: 16,
  ingresso: 20,
} as const;

export const fonts = {
  /** Títulos: display condensada */
  display: "Oswald",
  /** Interface e texto corrido */
  sans: "Inter",
} as const;

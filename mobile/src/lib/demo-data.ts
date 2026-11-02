import type { ImageSourcePropType } from "react-native";

/**
 * Dados fictícios espelhando src/lib/demo-data.ts do web, só até as Fases 3–4
 * trazerem visitas e catálogo pela API. Créditos das fotos: docs/photo-credits.md.
 */
const maracana = require("../../assets/photos/maracana-foto-real.jpg") as ImageSourcePropType;
const allianz = require("../../assets/photos/allianz-parque-foto-real.jpg") as ImageSourcePropType;

export type VisitKind = "visit" | "match";

export const demoVisits: Array<{
  id: string;
  stadium: string;
  city: string;
  stateCode: string;
  kind: VisitKind;
  date: Date | null;
  photo: ImageSourcePropType | null;
  tone: "verde" | "azul";
}> = [
  { id: "demo-1", stadium: "Pacaembu", city: "São Paulo", stateCode: "SP", kind: "visit", date: new Date(2026, 9, 12), photo: null, tone: "verde" },
  { id: "demo-2", stadium: "Maracanã", city: "Rio de Janeiro", stateCode: "RJ", kind: "match", date: new Date(2026, 8, 5), photo: maracana, tone: "azul" },
  { id: "demo-3", stadium: "Allianz Parque", city: "São Paulo", stateCode: "SP", kind: "match", date: new Date(2026, 7, 18), photo: allianz, tone: "verde" },
];

export const demoNearby = [
  { id: "pacaembu", name: "Estádio do Pacaembu", distanceKm: 2.4, photo: null },
  { id: "allianz", name: "Allianz Parque", distanceKm: 4.1, photo: allianz },
  { id: "neo-quimica", name: "Neo Química Arena", distanceKm: 18.9, photo: null },
];

/** Capacidades aproximadas, só para layout (confirmar com fonte oficial antes de publicar). */
export const demoCountryRanking = {
  country: "Brasil",
  stadiums: [
    { id: "maracana", name: "Maracanã", city: "Rio de Janeiro", capacity: 78838 },
    { id: "mane-garrincha", name: "Mané Garrincha", city: "Brasília", capacity: 72788 },
    { id: "morumbis", name: "MorumBIS", city: "São Paulo", capacity: 66795 },
  ],
};

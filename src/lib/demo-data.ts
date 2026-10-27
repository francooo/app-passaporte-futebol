import type { VisitKind } from "@/components/ui/stamp-card";

/**
 * Dados fictícios só para validar o design system (Fase 0).
 * Serão substituídos por consultas ao Neon nas Fases 3–4.
 * Créditos das fotos: docs/photo-credits.md (CC BY-SA).
 */
export const demoVisits: Array<{
  id: string;
  stadium: string;
  city: string;
  stateCode: string;
  kind: VisitKind;
  date: Date | null;
  photoUrl: string | null;
  tone: "verde" | "azul";
}> = [
  {
    id: "demo-1",
    stadium: "Pacaembu",
    city: "São Paulo",
    stateCode: "SP",
    kind: "visit",
    date: new Date(2026, 9, 12),
    photoUrl: null,
    tone: "verde",
  },
  {
    id: "demo-2",
    stadium: "Maracanã",
    city: "Rio de Janeiro",
    stateCode: "RJ",
    kind: "match",
    date: new Date(2026, 8, 5),
    photoUrl: "/photos/maracana-foto-real.jpg",
    tone: "azul",
  },
  {
    id: "demo-3",
    stadium: "Allianz Parque",
    city: "São Paulo",
    stateCode: "SP",
    kind: "match",
    date: new Date(2026, 7, 18),
    photoUrl: "/photos/allianz-parque-foto-real.jpg",
    tone: "verde",
  },
];

export const demoNearby = [
  { id: "pacaembu", name: "Estádio do Pacaembu", distanceKm: 2.4, photoUrl: null },
  { id: "allianz", name: "Allianz Parque", distanceKm: 4.1, photoUrl: "/photos/allianz-parque-foto-real.jpg" },
  { id: "neo-quimica", name: "Neo Química Arena", distanceKm: 18.9, photoUrl: null },
];

/**
 * Ranking demonstrativo do mockup "Mapa". Capacidades aproximadas, só para
 * layout: confirmar com fonte oficial antes de publicar (docs/sources-and-data.md).
 */
export const demoCountryRanking = {
  country: "Brasil",
  stadiums: [
    { id: "maracana", name: "Maracanã", city: "Rio de Janeiro", capacity: 78838 },
    { id: "mane-garrincha", name: "Mané Garrincha", city: "Brasília", capacity: 72788 },
    { id: "morumbis", name: "MorumBIS", city: "São Paulo", capacity: 66795 },
  ],
};

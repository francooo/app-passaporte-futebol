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
  error: "validation" | "unauthorized" | "conflict" | "rate_limited" | "server";
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

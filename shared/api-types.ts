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

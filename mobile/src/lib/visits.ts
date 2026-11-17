import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type {
  CompetitionOption,
  FanStats,
  MatchResult,
  MeProfile,
  NearbyStadium,
  StadiumSummary,
  TeamRef,
  VisitDetail,
  VisitList,
  VisitPhoto,
} from "@shared/api-types";
import { PHOTO_LIMITS, type ProfileInput, type VisitInput } from "@shared/schemas";
import { api, API_URL, ApiRequestError } from "./api";

/**
 * Registros, partidas, estatísticas e perfil (mesmas rotas /api/* do web, com o token Bearer).
 * Contratos em ../shared/api-types.ts.
 */
export function visitsApi(token: string | null) {
  const get = <T,>(path: string, signal?: AbortSignal) => api<T>(path, { token, signal });
  return {
    list: (filters: { tipo?: string; ano?: string; competicao?: string } = {}) =>
      get<VisitList>(`/api/visits?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][])}`),
    get: (id: string) => get<VisitDetail>(`/api/visits/${encodeURIComponent(id)}`),
    create: (input: VisitInput) => api<VisitDetail>("/api/visits", { method: "POST", body: input, token }),
    remove: (id: string) => api<null>(`/api/visits/${encodeURIComponent(id)}`, { method: "DELETE", token }),
    addPhoto: async (visitId: string, photo: PickedPhoto) => {
      const send = async (maxSide: number, compress: number) => {
        const form = new FormData();
        // No React Native o arquivo vai como { uri, name, type }
        form.append("foto", { uri: await shrinkPhoto(photo.uri, maxSide, compress), name: "foto.jpg", type: "image/jpeg" } as unknown as Blob);
        return api<VisitPhoto>(`/api/visits/${encodeURIComponent(visitId)}/photos`, { method: "POST", body: form, token });
      };
      try {
        return await send(PHOTO_LIMITS.clientMaxSide, 0.82);
      } catch (error) {
        // Recusada por tamanho (limite do servidor/Vercel): tenta de novo bem menor
        if (error instanceof ApiRequestError && error.status === 413) return send(1280, 0.7);
        throw error;
      }
    },
    removePhoto: (id: string) => api<null>(`/api/photos/${encodeURIComponent(id)}`, { method: "DELETE", token }),
    stats: (teamId?: string | null) => get<FanStats>(`/api/stats${teamId ? `?time=${encodeURIComponent(teamId)}` : ""}`),
    profile: () => get<MeProfile>("/api/me"),
    updateProfile: (input: ProfileInput) => api<MeProfile>("/api/me", { method: "PATCH", body: input, token }),
    searchMatches: (params: { q?: string; competicao?: string; data?: string; estadio?: string }, signal?: AbortSignal) =>
      get<MatchResult[]>(`/api/matches/search?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])}`, signal),
    searchTeams: (q: string, signal?: AbortSignal) => get<TeamRef[]>(`/api/teams/search?q=${encodeURIComponent(q)}`, signal),
    competitions: () => get<CompetitionOption[]>("/api/competitions"),
    searchStadiums: (q: string) => get<StadiumSummary[]>(`/api/catalog/stadiums/search?q=${encodeURIComponent(q)}`),
    nearbyStadiums: (lat: number, lng: number, radiusKm = 50) =>
      get<NearbyStadium[]>(`/api/catalog/stadiums/nearby?lat=${lat}&lng=${lng}&raio=${radiusKm}`),
  };
}

/** Foto privada do registro (/api/media/…): precisa do token no cabeçalho. */
export function privatePhoto(path: string, token: string | null) {
  return { uri: `${API_URL}${path}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
}

export type PickedPhoto = { uri: string; width: number; height: number };

/**
 * Reduz a foto (lado maior ≤ maxSide) e regrava em JPEG antes do envio, como o web faz no navegador.
 * A redução acontece já na leitura (maxWidth/maxHeight): não depende das dimensões informadas pelo
 * seletor, que podem vir 0 em alguns Android, e evita carregar fotos de 50 MP inteiras na memória.
 * Regravar também converte HEIC (iPhone) para um formato que o servidor aceita.
 */
async function shrinkPhoto(uri: string, maxSide: number, compress: number) {
  const context = ImageManipulator.manipulate(uri, { maxWidth: maxSide, maxHeight: maxSide });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress });
  return result.uri;
}

/** Mensagem para a tela quando uma foto não é enviada. */
export function photoErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) return error.message;
  return "Não foi possível preparar a foto no aparelho. Tente outra imagem.";
}

const dayFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-09-05" → "05 set 2026". */
export function formatDay(isoDate: string | null) {
  if (!isoDate) return "Sem data";
  return dayFormat.format(new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)).replace(/\./g, "").replace(/ de /g, " ");
}

/** "05/09/2026" → "2026-09-05" (ou null se inválida). */
export function parseBrDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

/** "2026-09-05" → "05/09/2026". */
export function toBrDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Máscara de digitação DD/MM/AAAA. */
export function maskBrDate(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

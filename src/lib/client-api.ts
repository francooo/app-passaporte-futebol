import type { ApiError } from "@shared/api-types";
import { PHOTO_LIMITS } from "@shared/schemas";

/** Erro de uma chamada às rotas /api/* (mensagem pronta para a tela e erros por campo). */
export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string[] | undefined> = {},
  ) {
    super(message);
  }
}

/** fetch com a sessão do web (cookie) e o formato de erro compartilhado com o app. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiFailure(0, "Sem conexão. Verifique a internet e tente de novo.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiFailure(res.status, body?.message ?? "Algo deu errado. Tente de novo.", body?.fields ?? {});
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

/** Reduz a foto no navegador (lado maior ≤ 2000 px, JPEG) antes do envio. */
export async function shrinkPhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Não foi possível ler “${file.name}”. Use JPG, PNG ou WebP.`);
  }
  const scale = Math.min(1, PHOTO_LIMITS.clientMaxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error(`Não foi possível preparar “${file.name}”.`);
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Envia uma foto já reduzida para o registro. */
export async function uploadPhoto(visitId: string, file: File) {
  const form = new FormData();
  form.append("foto", await shrinkPhoto(file));
  return api<{ id: string; thumbUrl: string; url: string }>(`/api/visits/${visitId}/photos`, { method: "POST", body: form });
}

const dayFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-09-05" → "05 set 2026". */
export function formatDay(isoDate: string | null) {
  if (!isoDate) return "Sem data";
  return dayFormat.format(new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)).replace(/\./g, "").replace(/ de /g, " ");
}

/** Data de hoje no fuso do usuário, "AAAA-MM-DD" (limite do campo de data). */
export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

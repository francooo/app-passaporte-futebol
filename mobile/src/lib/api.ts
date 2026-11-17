import type { ApiError } from "@shared/api-types";

/** Backend na Vercel. Em desenvolvimento, aponte para o IP da máquina (ex.: http://192.168.0.10:3000). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://app-passaporte-futebol.vercel.app").replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Objeto (vai como JSON) ou FormData (upload de foto). */
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function api<T>(path: string, { method = "GET", body, token, signal }: Options = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiRequestError(0, { error: "server", message: "Sem conexão com o servidor. Verifique sua internet." });
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      data && typeof data === "object" && "message" in data
        ? (data as ApiError)
        : { error: "server", message: "Algo deu errado. Tente de novo em instantes." },
    );
  }
  return data as T;
}

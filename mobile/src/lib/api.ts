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

type Options = { method?: "GET" | "POST"; body?: unknown; token?: string | null };

export async function api<T>(path: string, { method = "GET", body, token }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
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

import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { ApiError } from "@shared/api-types";
import type { FieldErrors } from "@shared/schemas";
import { db } from "@/db";
import { apiTokens, users } from "@/db/schema";
import { hashToken, newToken } from "@/lib/auth-core";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Cria uma sessão do app mobile e devolve o token em claro (só nesta resposta). */
export async function issueApiToken(userId: string) {
  const token = newToken();
  await db.insert(apiTokens).values({
    tokenHash: hashToken(token),
    userId,
    expires: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/** Usuário dono do Bearer token válido (não expirado nem revogado), ou null. */
export async function requireApiUser(request: Request) {
  const token = bearer(request);
  if (!token) return null;
  const tokenHash = hashToken(token);

  const [row] = await db
    .select({ user: users })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt), gt(apiTokens.expires, new Date())))
    .limit(1);
  if (!row) return null;

  await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.tokenHash, tokenHash));
  return row.user;
}

export async function revokeApiToken(request: Request) {
  const token = bearer(request);
  if (!token) return;
  await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.tokenHash, hashToken(token)), isNull(apiTokens.revokedAt)));
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Corpo JSON ou {} quando ausente/inválido (a validação zod responde o erro). */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export function apiError(status: number, error: ApiError["error"], message: string, fields?: FieldErrors) {
  return NextResponse.json<ApiError>({ error, message, ...(fields ? { fields } : {}) }, { status });
}

export const unauthorized = () => apiError(401, "unauthorized", "Sessão inválida ou expirada.");
export const rateLimited = () =>
  apiError(429, "rate_limited", "Muitas tentativas. Aguarde alguns minutos e tente de novo.");

import "server-only";
import type { z } from "zod";
import { fieldErrors } from "@shared/schemas";
import { apiError, readJson, requireUser, type RequestUser, unauthorized } from "@/lib/api-auth";
import { VisitError } from "@/lib/visits";

/**
 * Rota autenticada (Bearer do app ou sessão do web) com erros de domínio
 * convertidos no formato ApiError usado pelos dois clientes.
 */
export async function withUser(request: Request, handler: (user: RequestUser) => Promise<Response>) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    return await handler(user);
  } catch (error) {
    if (error instanceof VisitError) {
      const kind = error.status === 404 ? "not_found" : error.status === 413 ? "too_large" : "validation";
      return apiError(error.status, kind, error.message, error.field ? { [error.field]: [error.message] } : undefined);
    }
    throw error;
  }
}

/** Corpo JSON validado pelo schema compartilhado, ou a resposta 400 com erros por campo. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.output<S> } | { ok: false; error: Response }> {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return { ok: false, error: apiError(400, "validation", "Confira os campos.", fieldErrors(parsed.error)) };
  }
  return { ok: true, data: parsed.data as z.output<S> };
}

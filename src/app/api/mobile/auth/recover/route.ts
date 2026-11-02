import { NextResponse } from "next/server";
import type { MessageResponse } from "@shared/api-types";
import { fieldErrors, recoverSchema } from "@shared/schemas";
import { apiError, clientIp, rateLimited, readJson } from "@/lib/api-auth";
import { hitRateLimit, requestPasswordReset } from "@/lib/auth-core";

export async function POST(request: Request) {
  if (!(await hitRateLimit(`recover:ip:${clientIp(request)}`, 10, 60 * 60))) return rateLimited();

  const parsed = recoverSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "validation", "Confira os campos.", fieldErrors(parsed.error));

  // Resposta neutra: não revela se o e-mail existe.
  await requestPasswordReset(parsed.data.email);
  return NextResponse.json<MessageResponse>({
    message: "Se houver uma conta com este e-mail, enviaremos um link de recuperação.",
  });
}

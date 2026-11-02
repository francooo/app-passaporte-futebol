import { NextResponse } from "next/server";
import type { AuthResponse } from "@shared/api-types";
import { fieldErrors, signupSchema } from "@shared/schemas";
import { apiError, clientIp, issueApiToken, rateLimited, readJson } from "@/lib/api-auth";
import { createUser, hitRateLimit, toApiUser } from "@/lib/auth-core";

export async function POST(request: Request) {
  if (!(await hitRateLimit(`register:ip:${clientIp(request)}`, 10, 60 * 60))) return rateLimited();

  const parsed = signupSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "validation", "Confira os campos.", fieldErrors(parsed.error));
  const { name, email, password } = parsed.data;

  const user = await createUser({ name, email, password });
  if (!user) {
    return apiError(409, "conflict", "Já existe uma conta com este e-mail.", {
      email: ["Já existe uma conta com este e-mail."],
    });
  }

  const token = await issueApiToken(user.id);
  return NextResponse.json<AuthResponse>({ token, user: toApiUser(user) }, { status: 201 });
}

import { NextResponse } from "next/server";
import type { AuthResponse } from "@shared/api-types";
import { fieldErrors, loginSchema } from "@shared/schemas";
import { apiError, clientIp, issueApiToken, rateLimited, readJson } from "@/lib/api-auth";
import { hitRateLimit, toApiUser, verifyCredentials } from "@/lib/auth-core";

const WINDOW = 15 * 60;

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "validation", "Confira os campos.", fieldErrors(parsed.error));
  const { email, password } = parsed.data;

  const allowed =
    (await hitRateLimit(`login:ip:${clientIp(request)}`, 30, WINDOW)) &&
    (await hitRateLimit(`login:email:${email}`, 10, WINDOW));
  if (!allowed) return rateLimited();

  const user = await verifyCredentials(email, password);
  if (!user) return apiError(401, "unauthorized", "E-mail ou senha incorretos.");

  const token = await issueApiToken(user.id);
  return NextResponse.json<AuthResponse>({ token, user: toApiUser(user) });
}

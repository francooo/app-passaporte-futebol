import { NextResponse } from "next/server";
import type { AuthResponse } from "@shared/api-types";
import { fieldErrors, googleLoginSchema } from "@shared/schemas";
import { apiError, clientIp, issueApiToken, rateLimited, readJson } from "@/lib/api-auth";
import { hitRateLimit, toApiUser } from "@/lib/auth-core";
import { GoogleTokenError, signInWithGoogleProfile, verifyGoogleIdToken } from "@/lib/google-auth";

/** Login com Google no app: confere o ID token do Google e devolve um token nosso (Bearer). */
export async function POST(request: Request) {
  if (!process.env.AUTH_GOOGLE_ID) return apiError(503, "server", "Login com Google indisponível no momento.");

  const parsed = googleLoginSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "validation", "Login com Google inválido.", fieldErrors(parsed.error));

  if (!(await hitRateLimit(`login:google:ip:${clientIp(request)}`, 30, 15 * 60))) return rateLimited();

  let profile;
  try {
    profile = await verifyGoogleIdToken(parsed.data.idToken);
  } catch (error) {
    if (error instanceof GoogleTokenError) return apiError(401, "unauthorized", "Não foi possível confirmar sua conta Google.");
    throw error;
  }

  const user = await signInWithGoogleProfile(profile);
  const token = await issueApiToken(user.id);
  return NextResponse.json<AuthResponse>({ token, user: toApiUser(user) });
}

import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

export class GoogleTokenError extends Error {}

const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
let googleKeys: JWTVerifyGetKey | undefined;

/**
 * Confere o ID token que o app recebeu do Google: assinatura (chaves públicas do
 * Google), emissor, validade e se foi emitido para o nosso client ID web.
 * `keys` só é passado nos testes.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  { audience = process.env.AUTH_GOOGLE_ID, keys }: { audience?: string; keys?: JWTVerifyGetKey } = {},
): Promise<GoogleProfile> {
  if (!audience) throw new GoogleTokenError("AUTH_GOOGLE_ID não configurado");
  googleKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, keys ?? googleKeys, { issuer: GOOGLE_ISSUERS, audience }));
  } catch {
    throw new GoogleTokenError("ID token inválido");
  }

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  if (!payload.sub || !email || payload.email_verified !== true) {
    throw new GoogleTokenError("E-mail do Google não verificado");
  }
  return {
    sub: payload.sub,
    email,
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}

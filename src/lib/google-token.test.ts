import { generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { GoogleTokenError, verifyGoogleIdToken } from "./google-token";

const AUD = "web-client.apps.googleusercontent.com";
let privateKey: CryptoKey;
let keys: () => Promise<CryptoKey>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  keys = async () => pair.publicKey;
});

function sign(claims: Record<string, unknown>, { iss = "https://accounts.google.com", aud = AUD, key = privateKey } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject("google-sub-1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

const valid = { email: "Fulano@Gmail.com", email_verified: true, name: "Fulano", picture: "https://x/p.png" };

describe("verifyGoogleIdToken", () => {
  it("aceita token válido e normaliza o e-mail", async () => {
    const profile = await verifyGoogleIdToken(await sign(valid), { audience: AUD, keys });
    expect(profile).toEqual({ sub: "google-sub-1", email: "fulano@gmail.com", name: "Fulano", picture: "https://x/p.png" });
  });

  it("aceita o emissor sem https", async () => {
    await expect(verifyGoogleIdToken(await sign(valid, { iss: "accounts.google.com" }), { audience: AUD, keys })).resolves.toBeTruthy();
  });

  it.each([
    ["outro client ID", () => sign(valid, { aud: "outro-app" })],
    ["outro emissor", () => sign(valid, { iss: "https://evil.example" })],
    ["e-mail não verificado", () => sign({ ...valid, email_verified: false })],
    ["sem e-mail", () => sign({ email_verified: true })],
    ["lixo", async () => "nao.e.jwt"],
  ])("recusa token com %s", async (_, make) => {
    await expect(verifyGoogleIdToken(await make(), { audience: AUD, keys })).rejects.toBeInstanceOf(GoogleTokenError);
  });

  it("recusa token assinado por outra chave", async () => {
    const other = await generateKeyPair("RS256");
    await expect(
      verifyGoogleIdToken(await sign(valid, { key: other.privateKey }), { audience: AUD, keys }),
    ).rejects.toBeInstanceOf(GoogleTokenError);
  });

  it("recusa quando o client ID não está configurado", async () => {
    await expect(verifyGoogleIdToken(await sign(valid), { audience: "", keys })).rejects.toBeInstanceOf(GoogleTokenError);
  });
});

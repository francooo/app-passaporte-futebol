import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { revokeAllSessions } from "@/lib/auth-core";
import type { GoogleProfile } from "@/lib/google-token";

export { GoogleTokenError, verifyGoogleIdToken } from "@/lib/google-token";

/**
 * Login com Google, compartilhado pelo web (Auth.js, src/auth.ts) e pelo app
 * (POST /api/mobile/auth/google).
 *
 * Política "o Google assume a conta": o cadastro com senha não confirma o e-mail,
 * então alguém poderia criar uma conta com o e-mail de outra pessoa antes dela.
 * Quando o dono do e-mail entra com Google (que confirma o e-mail), a senha que
 * nunca foi confirmada é apagada e todas as sessões antigas caem. Se quiser usar
 * senha de novo, o dono cria uma em "Esqueci minha senha".
 */
export async function claimForGoogle(userId: string, googleEmail: string | null | undefined) {
  const [user] = await db
    .select({ email: users.email, emailVerified: users.emailVerified, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  // Só vale quando o Google confirma exatamente o e-mail desta conta (um usuário já
  // logado pode vincular um Google de outro e-mail; aí não mexemos em nada).
  if (!user?.email || !googleEmail || user.email.toLowerCase() !== googleEmail.toLowerCase()) return;
  if (user.emailVerified) return;

  if (user.passwordHash) {
    await db.update(users).set({ passwordHash: null }).where(eq(users.id, userId));
    await revokeAllSessions(userId);
  }
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, userId));
}

/** Encontra (ou cria) o usuário de um perfil Google já verificado, no mesmo formato do Auth.js. */
export async function signInWithGoogleProfile(profile: GoogleProfile) {
  const [linked] = await db
    .select({ user: users })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, profile.sub)))
    .limit(1);
  if (linked) return linked.user;

  const byEmail = () => db.select().from(users).where(eq(users.email, profile.email)).limit(1);
  let [existing] = await byEmail();
  let user = existing;
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ name: profile.name, email: profile.email, image: profile.picture, emailVerified: new Date() })
      .onConflictDoNothing({ target: users.email })
      .returning();
    if (!user) {
      // Corrida com outro cadastro do mesmo e-mail: usa a conta que ganhou.
      [existing] = await byEmail();
      user = existing;
    }
  }

  await db
    .insert(accounts)
    .values({ userId: user.id, type: "oidc", provider: "google", providerAccountId: profile.sub })
    .onConflictDoNothing();
  if (existing) await claimForGoogle(user.id, profile.email);

  const [fresh] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return fresh;
}

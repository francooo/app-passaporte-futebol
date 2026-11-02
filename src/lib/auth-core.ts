import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import type { ApiUser } from "@shared/api-types";
import { db } from "@/db";
import { passwordResetTokens, rateLimits, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";

/**
 * Regras de conta compartilhadas pelas Server Actions do web (src/app/(auth)/actions.ts),
 * pelo Auth.js (src/auth.ts) e pela API mobile (src/app/api/mobile/*).
 */

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

type UserRow = typeof users.$inferSelect;

export function toApiUser(user: Pick<UserRow, "id" | "name" | "email" | "image" | "premiumUntil">): ApiUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    premium: Boolean(user.premiumUntil && user.premiumUntil > new Date()),
  };
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

/** Cria a conta; devolve null se o e-mail já existir. */
export async function createUser({ name, email, password }: { name: string; email: string; password: string }) {
  if (await findUserByEmail(email)) return null;
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await bcrypt.hash(password, 12) })
    .onConflictDoNothing({ target: users.email })
    .returning();
  return user ?? null;
}

/** Confere e-mail e senha; devolve o usuário ou null (sem dizer qual dos dois falhou). */
export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

/** Origem dos links enviados por e-mail. O header Host só é usado em dev. */
async function appOrigin() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `http://${(await headers()).get("host")}`;
}

/** Gera o link de redefinição (1h, uso único) e envia por e-mail. Silencioso se o e-mail não existir. */
export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return;

  const token = newToken();
  await db.insert(passwordResetTokens).values({
    tokenHash: hashToken(token),
    userId: user.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });

  const link = `${await appOrigin()}/redefinir-senha?token=${token}`;
  const hello = `Olá${user.name ? `, ${user.name}` : ""}!`;
  await sendEmail({
    to: email,
    subject: "Redefina sua senha — Passaporte Esportivo",
    text: `${hello} Para criar uma nova senha, acesse: ${link}\nO link expira em 1 hora. Se você não pediu, ignore este e-mail.`,
    html: `<p>${hello}</p><p>Para criar uma nova senha, <a href="${link}">clique aqui</a>.</p><p>O link expira em 1 hora. Se você não pediu, ignore este e-mail.</p>`,
  });
}

/** Troca a senha se o token for válido; devolve false para token inválido, expirado ou usado. */
export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token);
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expires, new Date()),
      ),
    )
    .returning({ userId: passwordResetTokens.userId });
  if (!row) return false;

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 12) })
    .where(eq(users.id, row.userId));
  return true;
}

/**
 * Janela fixa: incrementa o contador da chave e diz se ainda está dentro do limite.
 * Uma única instrução SQL, então é segura entre instâncias serverless.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Valores não sensíveis para repor nos campos (o React limpa o form após a action). */
  values?: { name?: string; email?: string };
};

function keep(formData: FormData): FormState["values"] {
  const pick = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : undefined;
  };
  return { name: pick("name"), email: pick("email") };
}

const email = z
  .email("Informe um e-mail válido.")
  .transform((e) => e.toLowerCase());
const password = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

const loginSchema = z.object({ email, password: z.string().min(1, "Informe sua senha.") });

const newPasswordFields = { password, confirm: z.string() };
const passwordsMatch = (data: { password: string; confirm: string }) => data.password === data.confirm;
const mismatch = { path: ["confirm"], message: "As senhas não conferem." };

const signupSchema = z
  .object({ name: z.string().trim().min(2, "Informe seu nome.").max(80), email, ...newPasswordFields })
  .refine(passwordsMatch, mismatch);

const recoverSchema = z.object({ email });

const resetSchema = z
  .object({ token: z.string().min(1), ...newPasswordFields })
  .refine(passwordsMatch, mismatch);

/** Só aceita caminhos internos do app, para evitar open redirect. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/app") ? value : "/app";
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Origem dos links enviados por e-mail. O header Host só é usado em dev. */
async function appOrigin() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `http://${(await headers()).get("host")}`;
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: keep(formData) };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeNext(formData.get("next")) });
  } catch (error) {
    if (error instanceof AuthError) return { message: "E-mail ou senha incorretos.", values: keep(formData) };
    throw error; // inclui o redirect de sucesso
  }
  return {};
}

export async function signupAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: keep(formData) };
  const { name, email, password } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { errors: { email: ["Já existe uma conta com este e-mail."] }, values: keep(formData) };

  await db.insert(users).values({ name, email, passwordHash: await bcrypt.hash(password, 12) });

  await signIn("credentials", { email, password, redirectTo: "/app" });
  return {};
}

export async function googleSignInAction(formData: FormData) {
  await signIn("google", { redirectTo: safeNext(formData.get("next")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

const NEUTRAL_RECOVER = "Se houver uma conta com este e-mail, enviaremos um link de recuperação.";

export async function recoverAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = recoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: keep(formData) };

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  // Resposta neutra: não revela se o e-mail existe.
  if (!user) return { ok: true, message: NEUTRAL_RECOVER };

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    tokenHash: hashToken(token),
    userId: user.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });

  const link = `${await appOrigin()}/redefinir-senha?token=${token}`;

  await sendEmail({
    to: parsed.data.email,
    subject: "Redefina sua senha — Passaporte Esportivo",
    text: `Olá${user.name ? `, ${user.name}` : ""}! Para criar uma nova senha, acesse: ${link}\nO link expira em 1 hora. Se você não pediu, ignore este e-mail.`,
    html: `<p>Olá${user.name ? `, ${user.name}` : ""}!</p><p>Para criar uma nova senha, <a href="${link}">clique aqui</a>.</p><p>O link expira em 1 hora. Se você não pediu, ignore este e-mail.</p>`,
  });

  return { ok: true, message: NEUTRAL_RECOVER };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: keep(formData) };

  const tokenHash = hashToken(parsed.data.token);
  const [row] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expires, new Date()),
      ),
    )
    .limit(1);
  if (!row) return { message: "Link inválido ou expirado. Peça um novo link de recuperação." };

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.password, 12) })
    .where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  redirect("/login?senha=redefinida");
}

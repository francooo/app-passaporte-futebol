"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { fieldErrors, loginSchema, recoverSchema, resetSchema, signupSchema } from "@shared/schemas";
import { signIn, signOut } from "@/auth";
import { createUser, requestPasswordReset, resetPassword } from "@/lib/auth-core";

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

/** Só aceita caminhos internos do app, para evitar open redirect. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/app") ? value : "/app";
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep(formData) };

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
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep(formData) };
  const { name, email, password } = parsed.data;

  const user = await createUser({ name, email, password });
  if (!user) return { errors: { email: ["Já existe uma conta com este e-mail."] }, values: keep(formData) };

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
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep(formData) };

  // Resposta neutra: não revela se o e-mail existe.
  await requestPasswordReset(parsed.data.email);
  return { ok: true, message: NEUTRAL_RECOVER };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep(formData) };

  if (!(await resetPassword(parsed.data.token, parsed.data.password))) {
    return { message: "Link inválido ou expirado. Peça um novo link de recuperação." };
  }
  redirect("/login?senha=redefinida");
}

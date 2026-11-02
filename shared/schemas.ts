import { z } from "zod";

/** Validações de conta — usadas pelas Server Actions do web, pela API mobile e pelo app. */

export const emailSchema = z
  .email("Informe um e-mail válido.")
  .transform((e) => e.toLowerCase());

export const newPasswordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

const passwordsMatch = (data: { password: string; confirm: string }) => data.password === data.confirm;
const mismatch = { path: ["confirm"], message: "As senhas não conferem." };

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(80),
    email: emailSchema,
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine(passwordsMatch, mismatch);

export const recoverSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ token: z.string().min(1), password: newPasswordSchema, confirm: z.string() })
  .refine(passwordsMatch, mismatch);

export type LoginInput = z.input<typeof loginSchema>;
export type SignupInput = z.input<typeof signupSchema>;
export type RecoverInput = z.input<typeof recoverSchema>;

export type FieldErrors = Record<string, string[] | undefined>;

/** Erros por campo no formato usado pelos formulários (web e mobile). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

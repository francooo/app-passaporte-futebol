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

// ── Registros (visitas e partidas) ───────────────────────────────────────────

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

const score = z.coerce
  .number({ message: "Informe o placar." })
  .int("Placar inválido.")
  .min(0, "Placar inválido.")
  .max(99, "Placar inválido.");

/**
 * Registro de visita ou partida. Partida: vem de "Encontre a partida" (matchId)
 * ou do preenchimento manual (times + placar; competição opcional). Data opcional ("pode registrar sem data").
 */
export const visitSchema = z
  .object({
    kind: z.enum(["visit", "match"], { message: "Escolha Visita ou Partida." }),
    stadiumId: z.string().min(1, "Escolha o estádio."),
    date: z.iso.date({ message: "Data inválida." }).nullish(),
    matchId: z.string().min(1).nullish(),
    homeTeamId: z.string().min(1).nullish(),
    homeTeamName: optionalText(80),
    awayTeamId: z.string().min(1).nullish(),
    awayTeamName: optionalText(80),
    homeScore: score.nullish(),
    awayScore: score.nullish(),
    competition: optionalText(80),
    note: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.date && v.date > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "A data não pode estar no futuro." });
    }
    if (v.kind !== "match" || v.matchId) return;
    if (!v.homeTeamId && !v.homeTeamName) ctx.addIssue({ code: "custom", path: ["homeTeamName"], message: "Informe o mandante." });
    if (!v.awayTeamId && !v.awayTeamName) ctx.addIssue({ code: "custom", path: ["awayTeamName"], message: "Informe o visitante." });
    if (v.homeScore == null || v.awayScore == null) {
      ctx.addIssue({ code: "custom", path: ["homeScore"], message: "Informe o placar." });
    }
  });

export type VisitInput = z.input<typeof visitSchema>;

/** Perfil: cidade onde mora (base dos km viajados) e time do coração. */
export const profileSchema = z.object({
  homeCity: optionalText(120),
  favoriteTeamId: z.string().min(1).nullish(),
});

export type ProfileInput = z.input<typeof profileSchema>;

/** Fotos aceitas por registro (o cliente reduz antes de enviar; o servidor converte para WebP). */
export const PHOTO_LIMITS = {
  maxPerVisit: 10,
  /** Limite do arquivo já reduzido pelo cliente (o corpo das funções da Vercel vai até ~4,5 MB). */
  maxUploadBytes: 4 * 1024 * 1024,
  /** Lado maior que o cliente deve usar ao reduzir. */
  clientMaxSide: 2000,
  types: ["image/jpeg", "image/png", "image/webp"],
} as const;

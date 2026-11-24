import { z } from "zod";
import { DEFAULT_SPORT, predictionError, scoreError, SPORTS, VENUE_TYPES } from "./sports";

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

/** Login com Google no app: ID token devolvido pelo Google Sign-In nativo. */
export const googleLoginSchema = z.object({ idToken: z.string().min(1).max(4096) });

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
  // Teto geral (basquete); o limite de cada esporte vem de scoreError (shared/sports.ts)
  .max(250, "Placar inválido.");

/**
 * Registro de visita ou partida. Partida: vem de "Encontre a partida" (matchId)
 * ou do preenchimento manual (times + placar; competição opcional). Data opcional ("pode registrar sem data").
 * Jogo que ainda não terminou (resultPending, ou partida escolhida ainda não encerrada): o placar vira
 * palpite (predicted*, opcional) e o resultado é buscado depois do fim previsto (kickoffAt + 2 h).
 */
export const visitSchema = z
  .object({
    kind: z.enum(["visit", "match"], { message: "Escolha Visita ou Partida." }),
    sport: z.enum(SPORTS, { message: "Escolha o esporte." }).default(DEFAULT_SPORT),
    stadiumId: z.string().min(1, "Escolha o local."),
    date: z.iso.date({ message: "Data inválida." }).nullish(),
    matchId: z.string().min(1).nullish(),
    homeTeamId: z.string().min(1).nullish(),
    homeTeamName: optionalText(80),
    awayTeamId: z.string().min(1).nullish(),
    awayTeamName: optionalText(80),
    homeScore: score.nullish(),
    awayScore: score.nullish(),
    /** Manual: o jogo ainda não terminou (sem placar; resultado depois). */
    resultPending: z.boolean().optional(),
    predictedHomeScore: score.nullish(),
    predictedAwayScore: score.nullish(),
    /** Manual pendente: início do jogo (ISO). Sem ele, vale a hora do registro. */
    kickoffAt: z.iso.datetime({ offset: true, message: "Horário inválido." }).nullish(),
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
    if (!v.resultPending && (v.homeScore == null || v.awayScore == null)) {
      ctx.addIssue({ code: "custom", path: ["homeScore"], message: "Informe o placar." });
    }
    if (!v.resultPending && v.homeScore != null && v.awayScore != null) {
      const error = scoreError(v.sport, v.homeScore, v.awayScore);
      if (error) ctx.addIssue({ code: "custom", path: ["homeScore"], message: error });
    }
  })
  .superRefine((v, ctx) => {
    if ((v.predictedHomeScore == null) !== (v.predictedAwayScore == null)) {
      ctx.addIssue({ code: "custom", path: ["predictedHomeScore"], message: "Informe os dois lados do palpite." });
    }
    if (v.kind === "match" && v.predictedHomeScore != null && v.predictedAwayScore != null) {
      const error = predictionError(v.sport, v.predictedHomeScore, v.predictedAwayScore);
      if (error) ctx.addIssue({ code: "custom", path: ["predictedHomeScore"], message: error });
    }
  });

export type VisitInput = z.input<typeof visitSchema>;

/** Resultado informado à mão no carimbo (vale sobre a busca automática). */
export const resultSchema = z.object({ homeScore: score, awayScore: score });
export type ResultInput = z.input<typeof resultSchema>;

/** Palpite, editável enquanto o resultado não sai. */
export const predictionSchema = z.object({ predictedHomeScore: score, predictedAwayScore: score });
export type PredictionInput = z.input<typeof predictionSchema>;

/** Local cadastrado pelo usuário quando não está no catálogo (fica em moderação; só o autor vê até aprovar). */
export const venueSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do local.").max(120),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  state: optionalText(40),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "País inválido.")
    .default("BRA"),
  sports: z.array(z.enum(SPORTS)).min(1, "Escolha pelo menos um esporte.").max(SPORTS.length),
  venueType: z.enum(VENUE_TYPES).default("ginasio"),
  /** Localização opcional (GPS do aparelho no local). */
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
});

export type VenueInput = z.input<typeof venueSchema>;

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

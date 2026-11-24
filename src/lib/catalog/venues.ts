import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import type { StadiumSummary } from "@shared/api-types";
import type { venueSchema } from "@shared/schemas";
import type { z } from "zod";
import { db } from "@/db";
import { moderationLog, stadiums } from "@/db/schema";
import { hitRateLimit } from "@/lib/auth-core";
import { geocodeCity, VisitError } from "@/lib/visits";
import { summaryColumns, toSummary } from "./queries";

/** Cadastros de local por usuário por dia (evita abuso; a moderação revisa cada um). */
const DAILY_LIMIT = 10;

/**
 * Local cadastrado pelo usuário (ginásio de futsal do bairro, arena que falta no Wikidata).
 * Entra como "pending": aparece só para o autor (busca, "perto de você", carimbos) até a moderação aprovar.
 * Mesmo nome e cidade de um local que o usuário já vê: devolve o existente (sem duplicar).
 */
export async function createVenue(userId: string, input: z.output<typeof venueSchema>): Promise<StadiumSummary> {
  const sameName = and(
    sql`lower(unaccent(${stadiums.name})) = lower(unaccent(${input.name}))`,
    sql`lower(unaccent(${stadiums.city})) = lower(unaccent(${input.city}))`,
    or(eq(stadiums.status, "approved"), eq(stadiums.createdBy, userId)),
  );
  const [existing] = await db.select(summaryColumns).from(stadiums).where(sameName).limit(1);
  if (existing) return toSummary(existing);

  if (!(await hitRateLimit(`venue:create:${userId}`, DAILY_LIMIT, 24 * 60 * 60))) {
    throw new VisitError(400, "Você já cadastrou muitos locais hoje. Tente amanhã.");
  }

  // Sem GPS: posição aproximada pela cidade (vale para o mapa e os km viajados); falha não impede o cadastro
  let lat = input.lat ?? null;
  let lng = input.lng ?? null;
  if (lat == null || lng == null) {
    const place = await geocodeCity([input.city, input.state].filter(Boolean).join(", ")).catch(() => null);
    lat = place?.lat ?? null;
    lng = place?.lng ?? null;
  }

  const [created] = await db
    .insert(stadiums)
    .values({
      name: input.name,
      city: input.city,
      state: input.state ?? null,
      country: input.country,
      lat,
      lng,
      sports: input.sports,
      venueType: input.venueType,
      source: "user",
      status: "pending",
      createdBy: userId,
    })
    .returning({ id: stadiums.id });
  await db.insert(moderationLog).values({
    kind: "stadium",
    targetId: created.id,
    action: "created",
    actorId: userId,
    data: { name: input.name, city: input.city, state: input.state ?? null, sports: input.sports },
  });

  const [row] = await db.select(summaryColumns).from(stadiums).where(eq(stadiums.id, created.id)).limit(1);
  return toSummary(row);
}

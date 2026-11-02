import "server-only";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { countries, stadiums } from "@/db/schema";
import { fetchPhotoCredits } from "./commons";
import { hasUsefulData } from "./filters";
import { pickCapacity, resolvePlace } from "./rules";
import { fetchCountries, fetchCountryStadiums } from "./wikidata";

/** Atualiza a lista de países (nome em português, ISO2/ISO3, Q-id do Wikidata). */
export async function syncCountryList() {
  const list = await fetchCountries();
  for (const c of list) {
    await db
      .insert(countries)
      .values({ iso3: c.iso3, iso2: c.iso2, namePt: c.name, wikidataId: c.wikidataId })
      .onConflictDoUpdate({
        target: countries.iso3,
        set: { iso2: c.iso2, namePt: c.name, wikidataId: c.wikidataId },
      });
  }
  return list.length;
}

/**
 * Importa os estádios de um país do Wikidata para o Neon.
 * Upsert por wikidata_id; nunca sobrescreve capacity_override nem o endereço já preenchido.
 */
export async function syncCountry(iso3: string) {
  const [country] = await db.select().from(countries).where(eq(countries.iso3, iso3)).limit(1);
  if (!country?.wikidataId) throw new Error(`País ${iso3} sem Q-id; rode syncCountryList antes.`);

  try {
    const { stadiums: raw, places } = await fetchCountryStadiums(country.wikidataId);
    const credits = await fetchPhotoCredits(raw.map((s) => s.imageFile).filter((f): f is string => !!f));
    const today = new Date();

    for (const s of raw) {
      const { capacity, needsReview } = pickCapacity(s.capacities);
      const { city, state } = resolvePlace(s.locationIds, places);
      const photo = s.imageFile ? credits.get(s.imageFile) : undefined;
      const values = {
        name: s.name,
        city: city ?? "",
        state,
        country: iso3,
        lat: s.lat,
        lng: s.lng,
        capacity,
        capacityNeedsReview: needsReview,
        openedOn: s.openedOn ? new Date(`${s.openedOn}T00:00:00Z`) : null,
        clubs: s.clubs.length ? s.clubs.slice(0, 8) : null,
        website: s.website,
        photoUrl: photo?.url ?? null,
        photoAuthor: photo?.author ?? null,
        photoLicense: photo?.license ?? null,
        photoLicenseUrl: photo?.licenseUrl ?? null,
        photoPageUrl: photo?.pageUrl ?? null,
        source: "wikidata",
        sourceUpdatedAt: today,
        status: "approved" as const,
      };
      await db
        .insert(stadiums)
        .values({ ...values, wikidataId: s.wikidataId })
        .onConflictDoUpdate({ target: stadiums.wikidataId, set: values });
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(stadiums)
      .where(and(eq(stadiums.country, iso3), eq(stadiums.status, "approved"), hasUsefulData));
    await db
      .update(countries)
      .set({ stadiumCount: total, lastSyncedAt: today, syncError: null })
      .where(eq(countries.iso3, iso3));
    return { iso3, imported: raw.length, withPhoto: raw.filter((s) => s.imageFile && credits.has(s.imageFile)).length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(countries)
      .set({ lastSyncedAt: new Date(), syncError: message.slice(0, 500) })
      .where(eq(countries.iso3, iso3));
    throw error;
  }
}

/** Próximos países a atualizar: nunca sincronizados primeiro, depois os mais antigos. */
export async function countriesDueForSync(limit: number) {
  return db
    .select({ iso3: countries.iso3 })
    .from(countries)
    .orderBy(sql`${countries.lastSyncedAt} asc nulls first`, asc(countries.iso3))
    .limit(limit);
}

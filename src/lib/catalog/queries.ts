import "server-only";
import { and, asc, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import type { CatalogCountry, StadiumDetail, StadiumPage, StadiumSummary } from "@shared/api-types";
import { db } from "@/db";
import { countries, stadiums } from "@/db/schema";
import { fillAddress } from "./address";
import { commonsThumb } from "./rules";
import { hasUsefulData } from "./filters";

/**
 * Consultas do catálogo usadas pelos Server Components do web e pela API (src/app/api/catalog/*).
 * Só estádios aprovados e com capacidade ou localização (ver hasUsefulData).
 */

export const PAGE_SIZE = 30;

const capacityExpr = sql<number | null>`coalesce(${stadiums.capacityOverride}, ${stadiums.capacity})`;

const summaryColumns = {
  id: stadiums.id,
  name: stadiums.name,
  city: stadiums.city,
  state: stadiums.state,
  country: stadiums.country,
  capacity: capacityExpr,
  capacityOverride: stadiums.capacityOverride,
  capacityNeedsReview: stadiums.capacityNeedsReview,
  photoUrl: stadiums.photoUrl,
};

type SummaryRow = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
  capacity: number | null;
  capacityOverride: number | null;
  capacityNeedsReview: boolean;
  photoUrl: string | null;
};

function toSummary(r: SummaryRow): StadiumSummary {
  return {
    id: r.id,
    name: r.name,
    city: r.city || null,
    state: r.state,
    country: r.country,
    capacity: r.capacity,
    // Corrigida pela moderação → deixa de estar "a confirmar"
    capacityNeedsReview: r.capacityNeedsReview && r.capacityOverride == null,
    thumbUrl: commonsThumb(r.photoUrl, 330),
  };
}

const visible = and(eq(stadiums.status, "approved"), hasUsefulData);

export async function listCountries(): Promise<CatalogCountry[]> {
  const rows = await db
    .select({ iso3: countries.iso3, iso2: countries.iso2, name: countries.namePt, stadiumCount: countries.stadiumCount })
    .from(countries)
    .where(gt(countries.stadiumCount, 0))
    .orderBy(asc(countries.namePt));
  return rows;
}

export async function getCountry(iso3: string) {
  const [row] = await db
    .select({ iso3: countries.iso3, iso2: countries.iso2, name: countries.namePt, stadiumCount: countries.stadiumCount })
    .from(countries)
    .where(eq(countries.iso3, iso3))
    .limit(1);
  return row ?? null;
}

/** Estádios do país do maior para o menor (sem capacidade no fim), com busca por nome/cidade. */
export async function listStadiums({
  country,
  q,
  page = 0,
  pageSize = PAGE_SIZE,
}: {
  country: string;
  q?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<StadiumPage> {
  const term = q?.trim();
  const where = and(
    visible,
    eq(stadiums.country, country),
    term ? or(ilike(stadiums.name, `%${term}%`), ilike(stadiums.city, `%${term}%`)) : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(summaryColumns)
      .from(stadiums)
      .where(where)
      .orderBy(sql`${capacityExpr} desc nulls last`, asc(stadiums.name), asc(stadiums.id))
      .limit(pageSize + 1)
      .offset(page * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(stadiums).where(where),
  ]);

  return {
    items: rows.slice(0, pageSize).map(toSummary),
    nextPage: rows.length > pageSize ? page + 1 : null,
    total,
  };
}

/** Detalhe completo; preenche o endereço pelo OpenStreetMap na primeira consulta (e guarda). */
export async function getStadium(id: string): Promise<StadiumDetail | null> {
  const [row] = await db
    .select({ s: stadiums, countryName: countries.namePt })
    .from(stadiums)
    .leftJoin(countries, eq(countries.iso3, stadiums.country))
    .where(and(eq(stadiums.id, id), eq(stadiums.status, "approved")))
    .limit(1);
  if (!row) return null;
  const s = row.s;

  let address = s.address;
  let addressSource = s.addressSource;
  if (!address && s.lat != null && s.lng != null) {
    const filled = await fillAddress(s.id, s.lat, s.lng);
    if (filled) ({ address, addressSource } = filled);
  }

  return {
    ...toSummary({ ...s, capacity: s.capacityOverride ?? s.capacity }),
    countryName: row.countryName ?? s.country,
    lat: s.lat,
    lng: s.lng,
    address,
    addressSource,
    openedYear: s.openedOn ? s.openedOn.getUTCFullYear() : null,
    clubs: s.clubs ?? [],
    website: s.website,
    photo:
      s.photoUrl && s.photoLicense && s.photoPageUrl
        ? {
            url: commonsThumb(s.photoUrl, 960)!,
            author: s.photoAuthor,
            license: s.photoLicense,
            licenseUrl: s.photoLicenseUrl,
            pageUrl: s.photoPageUrl,
          }
        : null,
    wikidataUrl: s.wikidataId ? `https://www.wikidata.org/wiki/${s.wikidataId}` : null,
  };
}

/** Atribuições das fotos usadas no catálogo (página "Créditos das imagens"). */
export async function listPhotoCredits({ page = 0, pageSize = 100 } = {}) {
  return db
    .select({
      stadium: stadiums.name,
      country: stadiums.country,
      author: stadiums.photoAuthor,
      license: stadiums.photoLicense,
      licenseUrl: stadiums.photoLicenseUrl,
      pageUrl: stadiums.photoPageUrl,
    })
    .from(stadiums)
    .where(and(visible, sql`${stadiums.photoUrl} is not null`))
    .orderBy(asc(stadiums.country), desc(capacityExpr))
    .limit(pageSize)
    .offset(page * pageSize);
}

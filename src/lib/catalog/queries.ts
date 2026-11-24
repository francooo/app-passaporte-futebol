import "server-only";
import { and, asc, desc, eq, gt, or, sql } from "drizzle-orm";
import type { CatalogCountry, NearbyStadium, StadiumDetail, StadiumPage, StadiumSummary } from "@shared/api-types";
import type { Sport, VenueType } from "@shared/sports";
import { db } from "@/db";
import { countries, stadiums } from "@/db/schema";
import { fillAddress } from "./address";
import { commonsThumb } from "./rules";
import { hasUsefulData } from "./filters";
import { upcomingByStadium } from "@/lib/matches/queries";
import { NEXT_MATCH_DAYS } from "@/lib/matches/upcoming";

/**
 * Consultas do catálogo usadas pelos Server Components do web e pela API (src/app/api/catalog/*).
 * Só estádios aprovados e com capacidade ou localização (ver hasUsefulData).
 */

export const PAGE_SIZE = 30;

const capacityExpr = sql<number | null>`coalesce(${stadiums.capacityOverride}, ${stadiums.capacity})`;

export const summaryColumns = {
  id: stadiums.id,
  name: stadiums.name,
  city: stadiums.city,
  state: stadiums.state,
  country: stadiums.country,
  capacity: capacityExpr,
  capacityOverride: stadiums.capacityOverride,
  capacityNeedsReview: stadiums.capacityNeedsReview,
  photoUrl: stadiums.photoUrl,
  sports: stadiums.sports,
  venueType: stadiums.venueType,
  status: stadiums.status,
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
  sports: Sport[];
  venueType: VenueType;
  status?: "approved" | "pending" | "rejected";
};

export function toSummary(r: SummaryRow): StadiumSummary {
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
    sports: r.sports,
    venueType: r.venueType,
    ...(r.status === "pending" ? { pending: true } : {}),
  };
}

/** Locais onde o esporte é jogado (sem esporte = todos). */
export const playsSport = (sport: Sport | null | undefined) =>
  sport ? sql`${stadiums.sports} @> array[${sport}]::sport[]` : undefined;

/** Próximo jogo (30 dias) de um estádio: registro aberto a partir da página do estádio (preenche a partida). */
export async function nextMatchAt(stadiumId: string) {
  return (await upcomingByStadium([stadiumId], { days: NEXT_MATCH_DAYS, perStadium: 1 })).get(stadiumId) ?? [];
}

/** Próximo jogo (30 dias) de cada estádio da lista: ranking do país no mapa e busca do registro. */
async function withNextMatch(items: StadiumSummary[]): Promise<StadiumSummary[]> {
  const upcoming = await upcomingByStadium(items.map((s) => s.id), { days: NEXT_MATCH_DAYS, perStadium: 1 });
  return items.map((s) => ({ ...s, upcoming: upcoming.get(s.id) ?? [] }));
}

const visible = and(eq(stadiums.status, "approved"), hasUsefulData);

/** Catálogo aprovado + os locais que o próprio usuário cadastrou (em moderação). */
const visibleFor = (userId?: string | null) =>
  userId ? or(visible, and(eq(stadiums.status, "pending"), eq(stadiums.createdBy, userId))) : visible;

/** Nome ou cidade, sem diferenciar acentos ("maracana" encontra "Maracanã"). */
const nameOrCity = (term: string) =>
  or(
    sql`unaccent(${stadiums.name}) ilike unaccent(${`%${term}%`})`,
    sql`unaccent(${stadiums.city}) ilike unaccent(${`%${term}%`})`,
  );

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
  sport,
  page = 0,
  pageSize = PAGE_SIZE,
}: {
  country: string;
  q?: string | null;
  sport?: Sport | null;
  page?: number;
  pageSize?: number;
}): Promise<StadiumPage> {
  const term = q?.trim();
  const where = and(
    visible,
    eq(stadiums.country, country),
    term ? nameOrCity(term) : undefined,
    playsSport(sport),
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
    items: await withNextMatch(rows.slice(0, pageSize).map(toSummary)),
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

/** Busca global (todos os países) para escolher o estádio do registro. */
export async function searchStadiums(q: string, limit = 20, sport?: Sport | null, userId?: string | null): Promise<StadiumSummary[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await db
    .select(summaryColumns)
    .from(stadiums)
    .where(and(visibleFor(userId), nameOrCity(term), playsSport(sport)))
    .orderBy(sql`${capacityExpr} desc nulls last`, asc(stadiums.name))
    .limit(limit);
  return withNextMatch(rows.map(toSummary));
}

/**
 * Estádios num raio (km) a partir de uma coordenada, do mais perto para o mais longe.
 * A coordenada do usuário só é usada nesta consulta (não é gravada).
 */
export async function nearbyStadiums(
  lat: number,
  lng: number,
  radiusKm = 100,
  limit = 20,
  sport?: Sport | null,
  userId?: string | null,
): Promise<NearbyStadium[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const distance = sql<number>`6371 * 2 * asin(sqrt(
    power(sin(radians(${stadiums.lat} - ${lat}) / 2), 2) +
    cos(radians(${lat})) * cos(radians(${stadiums.lat})) * power(sin(radians(${stadiums.lng} - ${lng}) / 2), 2)
  ))`;
  const rows = await db
    .select({ ...summaryColumns, distanceKm: distance })
    .from(stadiums)
    .where(
      and(
        visibleFor(userId),
        // Caixa delimitadora antes do cálculo exato (usa só faixas de lat/lng)
        sql`${stadiums.lat} between ${lat - dLat} and ${lat + dLat}`,
        sql`${stadiums.lng} between ${lng - dLng} and ${lng + dLng}`,
        sql`${distance} <= ${radiusKm}`,
        playsSport(sport),
      ),
    )
    .orderBy(distance)
    .limit(limit);
  // Próximos jogos (14 dias) nesses estádios, para a lista do registro
  const upcoming = await upcomingByStadium(rows.map((r) => r.id));
  return rows.map((r) => ({
    ...toSummary(r),
    distanceKm: Math.round(Number(r.distanceKm) * 10) / 10,
    upcoming: upcoming.get(r.id) ?? [],
  }));
}

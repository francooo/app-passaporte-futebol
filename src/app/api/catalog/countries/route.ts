import { NextResponse, type NextRequest } from "next/server";
import { parseSport } from "@shared/sports";
import type { CatalogCountry } from "@shared/api-types";
import { listCountries } from "@/lib/catalog/queries";

/** Países com locais no catálogo (lista e destaque do mapa); ?esporte= só os países com locais daquele esporte. */
export async function GET(request: NextRequest) {
  return NextResponse.json<CatalogCountry[]>(await listCountries(parseSport(request.nextUrl.searchParams.get("esporte"))), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

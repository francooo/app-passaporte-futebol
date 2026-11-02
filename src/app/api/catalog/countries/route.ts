import { NextResponse } from "next/server";
import type { CatalogCountry } from "@shared/api-types";
import { listCountries } from "@/lib/catalog/queries";

/** Países com estádios no catálogo (lista e destaque do mapa). */
export async function GET() {
  return NextResponse.json<CatalogCountry[]>(await listCountries(), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

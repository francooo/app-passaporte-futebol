import { NextResponse, type NextRequest } from "next/server";
import type { StadiumPage } from "@shared/api-types";
import { apiError } from "@/lib/api-auth";
import { listStadiums } from "@/lib/catalog/queries";

/** GET /api/catalog/stadiums?country=BRA&q=&page=0 — do maior para o menor, 30 por página. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const country = params.get("country")?.toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(country)) return apiError(400, "validation", "Informe o país (ISO3, ex.: BRA).");
  const page = Math.max(0, Math.min(1000, Number.parseInt(params.get("page") ?? "0", 10) || 0));
  const q = params.get("q")?.slice(0, 80) ?? null;

  return NextResponse.json<StadiumPage>(await listStadiums({ country, q, page }), {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
  });
}

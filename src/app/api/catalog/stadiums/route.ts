import { NextResponse, type NextRequest } from "next/server";
import type { StadiumPage, StadiumSummary } from "@shared/api-types";
import { venueSchema } from "@shared/schemas";
import { apiError } from "@/lib/api-auth";
import { parseBody, withUser } from "@/lib/api-route";
import { createVenue } from "@/lib/catalog/venues";
import { parseSport } from "@shared/sports";
import { listStadiums } from "@/lib/catalog/queries";

/** GET /api/catalog/stadiums?country=BRA&q=&page=0&esporte= — do maior para o menor, 30 por página. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const country = params.get("country")?.toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(country)) return apiError(400, "validation", "Informe o país (ISO3, ex.: BRA).");
  const page = Math.max(0, Math.min(1000, Number.parseInt(params.get("page") ?? "0", 10) || 0));
  const q = params.get("q")?.slice(0, 80) ?? null;

  return NextResponse.json<StadiumPage>(await listStadiums({ country, q, page, sport: parseSport(params.get("esporte")) }), {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
  });
}

/** POST /api/catalog/stadiums — cadastra um local que falta (em moderação; só o autor vê até aprovar). */
export async function POST(request: NextRequest) {
  return withUser(request, async (user) => {
    const body = await parseBody(request, venueSchema);
    if (!body.ok) return body.error;
    return NextResponse.json<StadiumSummary>(await createVenue(user.id, body.data), { status: 201 });
  });
}

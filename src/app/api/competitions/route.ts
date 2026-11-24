import { NextResponse, type NextRequest } from "next/server";
import type { CompetitionOption } from "@shared/api-types";
import { parseSport } from "@shared/sports";
import { listCompetitions } from "@/lib/matches/queries";

/** GET /api/competitions?esporte= — competições importadas (sem esporte: todas). */
export async function GET(request: NextRequest) {
  return NextResponse.json<CompetitionOption[]>(await listCompetitions(parseSport(request.nextUrl.searchParams.get("esporte"))), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

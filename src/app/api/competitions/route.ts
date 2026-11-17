import { NextResponse } from "next/server";
import type { CompetitionOption } from "@shared/api-types";
import { listCompetitions } from "@/lib/matches/queries";

export async function GET() {
  return NextResponse.json<CompetitionOption[]>(await listCompetitions(), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import type { MatchResult } from "@shared/api-types";
import { withUser } from "@/lib/api-route";
import { searchMatches } from "@/lib/matches/queries";

/** GET /api/matches/search?q=Flamengo x Botafogo&competicao=BSA&data=2026-09-05&estadio=<id> */
export async function GET(request: NextRequest) {
  return withUser(request, async () => {
    const p = request.nextUrl.searchParams;
    const results = await searchMatches({
      q: p.get("q")?.slice(0, 80),
      competition: p.get("competicao"),
      date: p.get("data"),
      stadiumId: p.get("estadio"),
    });
    return NextResponse.json<MatchResult[]>(results, { headers: { "Cache-Control": "private, max-age=60" } });
  });
}

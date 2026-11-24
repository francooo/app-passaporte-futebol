import { NextResponse, type NextRequest } from "next/server";
import type { TeamRef } from "@shared/api-types";
import { withUser } from "@/lib/api-route";
import { parseSport } from "@shared/sports";
import { searchTeams } from "@/lib/matches/queries";

/** GET /api/teams/search?q=&esporte= — times para o preenchimento manual e para o time do coração. */
export async function GET(request: NextRequest) {
  return withUser(request, async (user) => {
    const p = request.nextUrl.searchParams;
    return NextResponse.json<TeamRef[]>(await searchTeams(p.get("q")?.slice(0, 60) ?? "", user.id, 10, parseSport(p.get("esporte"))));
  });
}

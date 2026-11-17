import { NextResponse, type NextRequest } from "next/server";
import type { TeamRef } from "@shared/api-types";
import { withUser } from "@/lib/api-route";
import { searchTeams } from "@/lib/matches/queries";

/** GET /api/teams/search?q= — times para o preenchimento manual e para o time do coração. */
export async function GET(request: NextRequest) {
  return withUser(request, async (user) =>
    NextResponse.json<TeamRef[]>(await searchTeams(request.nextUrl.searchParams.get("q")?.slice(0, 60) ?? "", user.id)),
  );
}

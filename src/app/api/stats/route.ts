import { NextResponse, type NextRequest } from "next/server";
import type { FanStats } from "@shared/api-types";
import { withUser } from "@/lib/api-route";
import { statsForUser } from "@/lib/visits";

/** GET /api/stats?time=<teamId> — "Sua jornada em números". */
export async function GET(request: NextRequest) {
  return withUser(request, async (user) =>
    NextResponse.json<FanStats>(await statsForUser(user.id, request.nextUrl.searchParams.get("time")), {
      headers: { "Cache-Control": "private, no-store" },
    }),
  );
}

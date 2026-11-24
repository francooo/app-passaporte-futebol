import { NextResponse, type NextRequest } from "next/server";
import type { StadiumSummary } from "@shared/api-types";
import { parseSport } from "@shared/sports";
import { searchStadiums } from "@/lib/catalog/queries";

/** GET /api/catalog/stadiums/search?q=&esporte= — busca em todos os países (escolha do local no registro). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
  return NextResponse.json<StadiumSummary[]>(await searchStadiums(q, 20, parseSport(request.nextUrl.searchParams.get("esporte"))), {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
  });
}

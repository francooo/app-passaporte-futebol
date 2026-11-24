import { NextResponse, type NextRequest } from "next/server";
import type { NearbyStadium } from "@shared/api-types";
import { apiError, requireUser } from "@/lib/api-auth";
import { parseSport } from "@shared/sports";
import { nearbyStadiums } from "@/lib/catalog/queries";

/** GET /api/catalog/stadiums/nearby?lat=&lng=&raio=100&esporte= — a localização não é gravada. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  const radius = Math.min(Math.max(Number(p.get("raio")) || 100, 1), 100);
  if (!p.get("lat") || !p.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return apiError(400, "validation", "Coordenadas inválidas.");
  }
  return NextResponse.json<NearbyStadium[]>(await nearbyStadiums(lat, lng, radius, 20, parseSport(p.get("esporte")), (await requireUser(request))?.id), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

import { NextResponse } from "next/server";
import type { StadiumDetail } from "@shared/api-types";
import { apiError } from "@/lib/api-auth";
import { getStadium } from "@/lib/catalog/queries";

export async function GET(_: Request, { params }: RouteContext<"/api/catalog/stadiums/[id]">) {
  const { id } = await params;
  const stadium = await getStadium(id);
  if (!stadium) return apiError(404, "validation", "Estádio não encontrado.");
  return NextResponse.json<StadiumDetail>(stadium, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

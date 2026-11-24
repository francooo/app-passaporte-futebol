import { NextResponse } from "next/server";
import type { StadiumDetail } from "@shared/api-types";
import { apiError } from "@/lib/api-auth";
import { getStadium, nextMatchAt } from "@/lib/catalog/queries";

export async function GET(_: Request, { params }: RouteContext<"/api/catalog/stadiums/[id]">) {
  const { id } = await params;
  const stadium = await getStadium(id);
  if (!stadium) return apiError(404, "validation", "Estádio não encontrado.");
  // Próximo jogo: o registro do app preenche a partida com ele
  return NextResponse.json<StadiumDetail>({ ...stadium, upcoming: await nextMatchAt(stadium.id) }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

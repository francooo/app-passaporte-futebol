import { NextResponse, type NextRequest } from "next/server";
import type { StadiumSummary } from "@shared/api-types";
import { parseSport } from "@shared/sports";
import { requireUser } from "@/lib/api-auth";
import { searchStadiums } from "@/lib/catalog/queries";

/** GET /api/catalog/stadiums/search?q=&esporte= — busca em todos os países (escolha do local no registro). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
  // Logado: inclui os locais que o usuário cadastrou (em moderação), então a resposta não pode ir para o cache público
  const user = await requireUser(request);
  return NextResponse.json<StadiumSummary[]>(await searchStadiums(q, 20, parseSport(request.nextUrl.searchParams.get("esporte")), user?.id), {
    headers: { "Cache-Control": user ? "private, no-store" : "public, s-maxage=600, stale-while-revalidate=86400" },
  });
}

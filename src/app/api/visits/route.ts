import { NextResponse, type NextRequest } from "next/server";
import type { VisitDetail, VisitList } from "@shared/api-types";
import { visitSchema } from "@shared/schemas";
import { parseBody, withUser } from "@/lib/api-route";
import { createVisit, getVisit, listVisits } from "@/lib/visits";

/** GET /api/visits?tipo=partida|visita&ano=2026&competicao=… — carimbos do usuário com filtros. */
export async function GET(request: NextRequest) {
  return withUser(request, async (user) => {
    const p = request.nextUrl.searchParams;
    const tipo = p.get("tipo");
    const ano = Number(p.get("ano"));
    const list = await listVisits(user.id, {
      kind: tipo === "partida" ? "match" : tipo === "visita" ? "visit" : null,
      year: Number.isInteger(ano) && ano > 1800 ? ano : null,
      competition: p.get("competicao") || null,
    });
    return NextResponse.json<VisitList>(list, { headers: { "Cache-Control": "private, no-store" } });
  });
}

export async function POST(request: NextRequest) {
  return withUser(request, async (user) => {
    const body = await parseBody(request, visitSchema);
    if (!body.ok) return body.error;
    const id = await createVisit(user.id, body.data);
    return NextResponse.json<VisitDetail | null>(await getVisit(user.id, id), { status: 201 });
  });
}

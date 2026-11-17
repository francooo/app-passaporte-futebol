import { NextResponse } from "next/server";
import type { VisitDetail } from "@shared/api-types";
import { visitSchema } from "@shared/schemas";
import { apiError } from "@/lib/api-auth";
import { parseBody, withUser } from "@/lib/api-route";
import { deleteVisit, getVisit, updateVisit } from "@/lib/visits";

type Ctx = RouteContext<"/api/visits/[id]">;

export async function GET(request: Request, { params }: Ctx) {
  return withUser(request, async (user) => {
    const visit = await getVisit(user.id, (await params).id);
    if (!visit) return apiError(404, "not_found", "Registro não encontrado.");
    return NextResponse.json<VisitDetail>(visit, { headers: { "Cache-Control": "private, no-store" } });
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  return withUser(request, async (user) => {
    const { id } = await params;
    const body = await parseBody(request, visitSchema);
    if (!body.ok) return body.error;
    await updateVisit(user.id, id, body.data);
    return NextResponse.json<VisitDetail | null>(await getVisit(user.id, id));
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  return withUser(request, async (user) => {
    await deleteVisit(user.id, (await params).id);
    return NextResponse.json({ message: "Registro excluído." });
  });
}

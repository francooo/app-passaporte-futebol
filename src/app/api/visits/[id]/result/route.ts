import { NextResponse } from "next/server";
import type { VisitDetail } from "@shared/api-types";
import { resultSchema } from "@shared/schemas";
import { parseBody, withUser } from "@/lib/api-route";
import { getVisit, setResult } from "@/lib/visits";

type Ctx = RouteContext<"/api/visits/[id]/result">;

/** PATCH /api/visits/:id/result { homeScore, awayScore } — resultado informado à mão (vale sobre a busca automática). */
export async function PATCH(request: Request, { params }: Ctx) {
  return withUser(request, async (user) => {
    const { id } = await params;
    const body = await parseBody(request, resultSchema);
    if (!body.ok) return body.error;
    await setResult(user.id, id, body.data);
    return NextResponse.json<VisitDetail | null>(await getVisit(user.id, id));
  });
}

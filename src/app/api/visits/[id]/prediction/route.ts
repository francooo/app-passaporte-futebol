import { NextResponse } from "next/server";
import type { VisitDetail } from "@shared/api-types";
import { predictionSchema } from "@shared/schemas";
import { parseBody, withUser } from "@/lib/api-route";
import { getVisit, setPrediction } from "@/lib/visits";

type Ctx = RouteContext<"/api/visits/[id]/prediction">;

/** PATCH /api/visits/:id/prediction { predictedHomeScore, predictedAwayScore } — só enquanto o resultado não sai. */
export async function PATCH(request: Request, { params }: Ctx) {
  return withUser(request, async (user) => {
    const { id } = await params;
    const body = await parseBody(request, predictionSchema);
    if (!body.ok) return body.error;
    await setPrediction(user.id, id, body.data);
    return NextResponse.json<VisitDetail | null>(await getVisit(user.id, id));
  });
}

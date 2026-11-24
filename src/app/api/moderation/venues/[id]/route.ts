import { NextResponse } from "next/server";
import { moderationVenueSchema } from "@shared/schemas";
import { parseBody, withModerator } from "@/lib/api-route";
import { moderateVenue } from "@/lib/moderation";

type Ctx = RouteContext<"/api/moderation/venues/[id]">;

/** POST /api/moderation/venues/:id { action: "approve" (edits?) | "merge" (targetId) | "reject" } */
export async function POST(request: Request, { params }: Ctx) {
  return withModerator(request, async (user) => {
    const { id } = await params;
    const body = await parseBody(request, moderationVenueSchema);
    if (!body.ok) return body.error;
    return NextResponse.json(await moderateVenue(user.id, id, body.data));
  });
}

import { NextResponse } from "next/server";
import { moderationTeamSchema } from "@shared/schemas";
import { parseBody, withModerator } from "@/lib/api-route";
import { moderateTeam } from "@/lib/moderation";

type Ctx = RouteContext<"/api/moderation/teams/[id]">;

/** POST /api/moderation/teams/:id { action: "approve" (edits?) | "merge" (targetId) | "reject" } */
export async function POST(request: Request, { params }: Ctx) {
  return withModerator(request, async (user) => {
    const { id } = await params;
    const body = await parseBody(request, moderationTeamSchema);
    if (!body.ok) return body.error;
    return NextResponse.json(await moderateTeam(user.id, id, body.data));
  });
}

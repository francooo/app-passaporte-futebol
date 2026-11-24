import { NextResponse } from "next/server";
import type { ModerationQueue } from "@shared/api-types";
import { withModerator } from "@/lib/api-route";
import { moderationQueue } from "@/lib/moderation";

/** GET /api/moderation — locais e times cadastrados por usuários aguardando moderação (só moderadores). */
export async function GET(request: Request) {
  return withModerator(request, async () =>
    NextResponse.json<ModerationQueue>(await moderationQueue(), { headers: { "Cache-Control": "private, no-store" } }),
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { withModerator } from "@/lib/api-route";
import { mergeTargets } from "@/lib/moderation";

/** GET /api/moderation/targets?tipo=local|time&pendente=<id>&q= — cadastros aprovados para "Mesclar com outro…". */
export async function GET(request: NextRequest) {
  return withModerator(request, async () => {
    const p = request.nextUrl.searchParams;
    const kind = p.get("tipo") === "time" ? "team" : "venue";
    return NextResponse.json(await mergeTargets(kind, p.get("pendente") ?? "", p.get("q")?.slice(0, 60) ?? ""));
  });
}

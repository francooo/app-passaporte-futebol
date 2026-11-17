import { NextResponse } from "next/server";
import type { VisitPhoto } from "@shared/api-types";
import { apiError } from "@/lib/api-auth";
import { withUser } from "@/lib/api-route";
import { addPhoto } from "@/lib/visits";

/** POST multipart (campo "foto"): a foto chega reduzida pelo cliente; o servidor gera WebP e miniatura. */
export async function POST(request: Request, { params }: RouteContext<"/api/visits/[id]/photos">) {
  return withUser(request, async (user) => {
    const form = await request.formData().catch(() => null);
    const file = form?.get("foto");
    if (!(file instanceof File)) return apiError(400, "validation", "Envie a foto no campo 'foto'.");
    return NextResponse.json<VisitPhoto>(await addPhoto(user.id, (await params).id, file), { status: 201 });
  });
}

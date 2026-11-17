import { NextResponse } from "next/server";
import type { MeProfile } from "@shared/api-types";
import { profileSchema } from "@shared/schemas";
import { parseBody, withUser } from "@/lib/api-route";
import { getProfile, updateProfile } from "@/lib/visits";

export async function GET(request: Request) {
  return withUser(request, async (user) =>
    NextResponse.json<MeProfile | null>(await getProfile(user.id), { headers: { "Cache-Control": "private, no-store" } }),
  );
}

/** PATCH { homeCity?, favoriteTeamId? } — a cidade é geocodificada (OpenStreetMap) ao salvar. */
export async function PATCH(request: Request) {
  return withUser(request, async (user) => {
    const body = await parseBody(request, profileSchema);
    if (!body.ok) return body.error;
    return NextResponse.json<MeProfile | null>(await updateProfile(user.id, body.data));
  });
}

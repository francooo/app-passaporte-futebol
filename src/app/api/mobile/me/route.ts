import { NextResponse } from "next/server";
import type { ApiUser } from "@shared/api-types";
import { requireApiUser, unauthorized } from "@/lib/api-auth";
import { toApiUser } from "@/lib/auth-core";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return unauthorized();
  return NextResponse.json<ApiUser>(toApiUser(user));
}

import { NextResponse } from "next/server";
import type { MessageResponse } from "@shared/api-types";
import { revokeApiToken } from "@/lib/api-auth";

export async function POST(request: Request) {
  await revokeApiToken(request);
  return NextResponse.json<MessageResponse>({ message: "Sessão encerrada." });
}

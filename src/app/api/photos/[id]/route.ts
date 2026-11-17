import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { deletePhoto } from "@/lib/visits";

export async function DELETE(request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  return withUser(request, async (user) => {
    await deletePhoto(user.id, (await params).id);
    return NextResponse.json({ message: "Foto removida." });
  });
}

import { apiError } from "@/lib/api-auth";
import { withUser } from "@/lib/api-route";
import { getPhoto } from "@/lib/visits";

/** GET /api/media/[id]?tamanho=thumb — foto do registro (só o dono acessa). */
export async function GET(request: Request, { params }: RouteContext<"/api/media/[id]">) {
  return withUser(request, async (user) => {
    const size = new URL(request.url).searchParams.get("tamanho") === "thumb" ? "thumb" : "full";
    const photo = await getPhoto(user.id, (await params).id, size);
    if (!photo) return apiError(404, "not_found", "Foto não encontrada.");
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.mime,
        // O conteúdo de um id nunca muda (trocar a foto gera outro id)
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  });
}

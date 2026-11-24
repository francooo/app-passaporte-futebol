import type { ModerationQueue } from "@shared/api-types";
import type { ModerationTeamInput, ModerationVenueInput } from "@shared/schemas";
import { api } from "./api";

export type MergeTarget = { id: string; name: string; city?: string | null; crestUrl?: string | null };

/** Moderação de locais e times cadastrados por usuários (mesmas rotas do web; só moderadores). */
export function moderationApi(token: string | null) {
  return {
    queue: () => api<ModerationQueue>("/api/moderation", { token }),
    venue: (id: string, input: ModerationVenueInput) =>
      api<{ warning: string | null }>(`/api/moderation/venues/${encodeURIComponent(id)}`, { method: "POST", body: input, token }),
    team: (id: string, input: ModerationTeamInput) =>
      api<{ warning: string | null }>(`/api/moderation/teams/${encodeURIComponent(id)}`, { method: "POST", body: input, token }),
    targets: (kind: "local" | "time", pendingId: string, q: string, signal?: AbortSignal) =>
      api<MergeTarget[]>(`/api/moderation/targets?tipo=${kind}&pendente=${encodeURIComponent(pendingId)}&q=${encodeURIComponent(q)}`, { token, signal }),
  };
}

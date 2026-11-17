"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { MeProfile } from "@shared/api-types";
import { Button } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { api, ApiFailure } from "@/lib/client-api";
import { TeamInput, type ManualTeam } from "./registro-form";

/** Cidade onde mora (base dos km viajados) e time do coração (padrão do "Desempenho do seu time"). */
export function ProfileSettings({ profile }: { profile: Pick<MeProfile, "homeCity" | "favoriteTeam"> }) {
  const router = useRouter();
  const cityId = useId();
  const [city, setCity] = useState(profile.homeCity ?? "");
  const [team, setTeam] = useState<ManualTeam>(
    profile.favoriteTeam ? { id: profile.favoriteTeam.id, name: profile.favoriteTeam.name, crestUrl: profile.favoriteTeam.crestUrl } : { id: null, name: "", crestUrl: null },
  );
  const [state, setState] = useState<{ busy: boolean; ok: string | null; errors: Record<string, string> }>({ busy: false, ok: null, errors: {} });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (team.name.trim() && !team.id) {
      setState({ busy: false, ok: null, errors: { favoriteTeamId: "Escolha o time na lista de sugestões." } });
      return;
    }
    setState({ busy: true, ok: null, errors: {} });
    try {
      const saved = await api<MeProfile>("/api/me", {
        method: "PATCH",
        json: { homeCity: city.trim() || null, favoriteTeamId: team.name.trim() ? team.id : null },
      });
      setCity(saved.homeCity ?? "");
      setState({ busy: false, ok: "Perfil salvo.", errors: {} });
      router.refresh();
    } catch (error) {
      const fields = error instanceof ApiFailure ? error.fields : {};
      setState({
        busy: false,
        ok: null,
        errors: {
          homeCity: fields.homeCity?.[0] ?? "",
          favoriteTeamId: fields.favoriteTeamId?.[0] ?? "",
          form: Object.keys(fields).length ? "" : (error as Error).message,
        },
      });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-linha bg-white p-5">
      <div className="flex flex-col gap-1" id="cidade">
        <label htmlFor={cityId} className="text-sm font-semibold text-estadio">
          Cidade onde você mora
        </label>
        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-linha bg-white px-3 focus-within:border-estadio focus-within:ring-2 focus-within:ring-estadio/30">
          <KitIcon name="location-pin" size={22} />
          <input
            id={cityId}
            value={city}
            maxLength={120}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex.: Belo Horizonte, MG"
            aria-invalid={state.errors.homeCity ? true : undefined}
            className="min-w-0 flex-1 bg-transparent py-3 text-tinta outline-none placeholder:text-suave"
          />
        </div>
        {state.errors.homeCity ? (
          <p className="text-sm text-erro">{state.errors.homeCity}</p>
        ) : (
          <p className="text-sm text-suave">Usada só para calcular os km viajados nas Estatísticas.</p>
        )}
      </div>

      <TeamInput label="Time do coração" value={team} onChange={setTeam} error={state.errors.favoriteTeamId || undefined} />

      <div aria-live="polite">
        {state.ok && <p className="text-sm font-semibold text-estadio">{state.ok}</p>}
        {state.errors.form && <p className="text-sm text-erro">{state.errors.form}</p>}
      </div>
      <Button type="submit" disabled={state.busy} className="self-start text-lg">
        {state.busy ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

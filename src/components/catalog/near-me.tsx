"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NearbyStadium } from "@shared/api-types";
import { venuePlural, venueWord } from "@shared/sport-copy";
import { SPORT_INFO, type Sport } from "@shared/sports";
import { KitIcon } from "@/components/ui/kit-icon";
import { api } from "@/lib/client-api";
import { StadiumRow } from "./stadium-bits";

const RADIUS_KM = 100;

/**
 * "Perto de mim" no mapa: com a localização do aparelho, lista os locais do esporte escolhido num raio de
 * 100 km (com os próximos jogos) e seleciona no mapa o país do local mais perto. A posição não é gravada.
 */
export function NearMe({ sport, selected }: { sport: Sport; selected: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ loading: boolean; error: string | null; items: NearbyStadium[] | null }>({
    loading: false,
    error: null,
    items: null,
  });
  // Trocou o esporte: a lista anterior não vale mais
  const [listedSport, setListedSport] = useState(sport);
  if (listedSport !== sport) {
    setListedSport(sport);
    setState({ loading: false, error: null, items: null });
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setState({ loading: false, error: "Seu navegador não informa a localização.", items: null });
      return;
    }
    setState({ loading: true, error: null, items: null });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const items = await api<NearbyStadium[]>(
            `/api/catalog/stadiums/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&raio=${RADIUS_KM}&esporte=${sport}`,
          );
          setState({ loading: false, error: null, items });
          // O país do local mais perto passa a ser o selecionado no mapa
          const country = items[0]?.country;
          if (country && country !== selected) {
            const params = new URLSearchParams({ pais: country, ...(sport !== "futebol" ? { esporte: sport } : {}) });
            router.replace(`/app/mapa?${params}`, { scroll: false });
          }
        } catch (error) {
          setState({ loading: false, error: (error as Error).message, items: null });
        }
      },
      (err) =>
        setState({
          loading: false,
          error: err.code === err.PERMISSION_DENIED ? "Permissão de localização negada." : "Não foi possível obter sua localização.",
          items: null,
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const withGames = state.items?.filter((s) => s.upcoming?.length).length ?? 0;
  return (
    <section aria-labelledby="perto" className="flex flex-col gap-3">
      <button
        type="button"
        onClick={locate}
        disabled={state.loading}
        className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border-2 border-estadio bg-white px-5 font-display text-lg font-semibold text-estadio transition-colors hover:bg-partida/50 disabled:opacity-60"
      >
        <KitIcon name="location-pin" size={22} />
        {state.loading ? "Procurando…" : `${venuePlural(sport)} perto de mim`}
      </button>
      <div aria-live="polite" className="flex flex-col gap-2">
        {state.error && <p className="text-sm text-erro">{state.error}</p>}
        {state.items && (
          <>
            <h2 id="perto" className="titulo-display text-2xl text-estadio">
              Perto de você · {SPORT_INFO[sport].label}
            </h2>
            <p className="text-sm text-suave">
              {state.items.length
                ? `${state.items.length} a até ${RADIUS_KM} km${withGames ? ` · ${withGames} com ${withGames === 1 ? "jogo" : "jogos"} nos próximos 14 dias` : ""}`
                : `Nenhum ${venueWord(sport)} de ${SPORT_INFO[sport].label.toLowerCase()} no catálogo a até ${RADIUS_KM} km.`}
            </p>
            {state.items.length > 0 && (
              <ol className="flex flex-col gap-3">
                {state.items.slice(0, 8).map((s) => (
                  <li key={s.id} className="relative">
                    <StadiumRow stadium={s} />
                    <span className="pointer-events-none absolute -top-2 right-3 rounded bg-partida px-1.5 text-xs font-semibold text-estadio">
                      {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(s.distanceKm)} km
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}

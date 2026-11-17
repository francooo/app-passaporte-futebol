"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NearbyStadium } from "@shared/api-types";
import { place, StadiumThumb } from "@/components/catalog/stadium-bits";
import { KitIcon } from "@/components/ui/kit-icon";
import { api } from "@/lib/client-api";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; items: NearbyStadium[] }
  | { status: "error"; message: string };

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * "Estádios perto de você": só pede a localização quando a pessoa toca no botão
 * (ou automaticamente, se ela já autorizou antes). A coordenada não é gravada.
 */
export function NearbyStadiums() {
  const [state, setState] = useState<State>({ status: "idle" });

  function locate() {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Seu navegador não informa a localização." });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const items = await api<NearbyStadium[]>(
            `/api/catalog/stadiums/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&raio=100`,
          );
          setState({ status: "done", items: items.slice(0, 6) });
        } catch (error) {
          setState({ status: "error", message: (error as Error).message });
        }
      },
      (err) =>
        setState({
          status: "error",
          message: err.code === err.PERMISSION_DENIED ? "Permissão de localização negada." : "Não foi possível obter sua localização.",
        }),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  // Se a permissão já foi dada antes, carrega sem perguntar de novo
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted") locate();
      })
      .catch(() => {});
  }, []);

  return (
    <section aria-labelledby="proximos" className="flex flex-col gap-3 lg:gap-5">
      <div className="flex items-baseline justify-between">
        <h2 id="proximos" className="titulo-display text-3xl text-estadio lg:text-4xl">
          Estádios perto de você
        </h2>
        <Link href="/app/mapa" className="text-sm font-semibold text-estadio">
          Ver mapa ›
        </Link>
      </div>

      <div aria-live="polite">
        {(state.status === "idle" || state.status === "error") && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-linha bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-tinta">
              {state.status === "error" ? (
                <span className="text-erro">{state.message} </span>
              ) : null}
              Veja os estádios do catálogo a até 100 km de onde você está.
            </p>
            <button
              type="button"
              onClick={locate}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border-2 border-estadio bg-white px-4 font-display text-lg font-semibold text-estadio hover:bg-partida/50"
            >
              <KitIcon name="location-pin" size={22} /> Usar minha localização
            </button>
          </div>
        )}
        {state.status === "loading" && <p className="text-suave">Procurando estádios perto de você…</p>}
        {state.status === "done" &&
          (state.items.length ? (
            <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {state.items.map((s, i) => (
                <li key={s.id} className={i >= 3 ? "hidden md:block" : undefined}>
                  <Link
                    href={`/app/estadios/${s.id}`}
                    className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-linha bg-white pr-3 transition-shadow hover:shadow-md lg:grid-cols-[7rem_1fr_auto]"
                  >
                    <StadiumThumb url={s.thumbUrl} className="h-24 w-full" sizes="112px" />
                    <div className="min-w-0">
                      <h3 className="titulo-display truncate text-xl text-estadio">{s.name}</h3>
                      <p className="truncate text-sm text-suave">{place(s)}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-estadio">
                        <KitIcon name="location-pin" size={16} /> {number.format(s.distanceKm)} km
                      </p>
                    </div>
                    <KitIcon name="arrow-right" size={20} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-linha p-5 text-suave">
              Nenhum estádio do catálogo a até 100 km.{" "}
              <Link href="/app/mapa" className="font-semibold text-estadio underline">
                Explore o mapa
              </Link>
            </p>
          ))}
      </div>
    </section>
  );
}

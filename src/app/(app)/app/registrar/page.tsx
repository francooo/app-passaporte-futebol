import type { Metadata } from "next";
import { Suspense } from "react";
import { RegistroForm } from "@/components/visits/registro-form";
import { getStadium } from "@/lib/catalog/queries";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Registrar experiência" };

/** Registro de visita ou partida. ?estadio=<id> já abre com o estádio escolhido (vindo da página do estádio). */
export default function RegistrarPage({ searchParams }: PageProps<"/app/registrar">) {
  return (
    <Suspense fallback={<p className="text-suave">Carregando…</p>}>
      <Registrar searchParams={searchParams} />
    </Suspense>
  );
}

async function Registrar({ searchParams }: Pick<PageProps<"/app/registrar">, "searchParams">) {
  await getCurrentUser();
  const { estadio } = await searchParams;
  const stadium = typeof estadio === "string" && estadio.length <= 64 ? await getStadium(estadio) : null;
  return (
    <RegistroForm
      initialStadium={
        stadium
          ? {
              id: stadium.id,
              name: stadium.name,
              city: stadium.city,
              state: stadium.state,
              country: stadium.country,
              capacity: stadium.capacity,
              capacityNeedsReview: stadium.capacityNeedsReview,
              thumbUrl: stadium.thumbUrl,
            }
          : null
      }
    />
  );
}

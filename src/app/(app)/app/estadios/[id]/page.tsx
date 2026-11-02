import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Capacity, PhotoCreditLine, place } from "@/components/catalog/stadium-bits";
import { ButtonLink } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { Ticket } from "@/components/ui/ticket";
import { getStadium } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Estádio" };

export default function EstadioPage({ params }: PageProps<"/app/estadios/[id]">) {
  return (
    <Suspense fallback={<p className="text-suave">Carregando estádio…</p>}>
      <EstadioContent params={params} />
    </Suspense>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-dashed border-linha py-3 last:border-0">
      <dt className="rotulo-display text-xs text-suave">{label}</dt>
      <dd className="text-tinta">{children}</dd>
    </div>
  );
}

async function EstadioContent({ params }: Pick<PageProps<"/app/estadios/[id]">, "params">) {
  const { id } = await params;
  const s = await getStadium(id);
  if (!s) notFound();

  const mapsUrl = s.lat != null && s.lng != null ? `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=16/${s.lat}/${s.lng}` : null;

  return (
    <article className="flex flex-col gap-5 lg:gap-8">
      <Link href={`/app/estadios?pais=${s.country}`} className="inline-flex items-center gap-1 text-sm font-semibold text-estadio">
        <KitIcon name="back" size={18} /> Estádios: {s.countryName}
      </Link>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8">
        <figure className="lg:col-span-7">
          <Ticket className="-mx-5 rounded-none px-5 md:mx-0 md:rounded-ticket" innerClassName="p-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-partida">
              {s.photo ? (
                <Image
                  src={s.photo.url}
                  alt={`Foto do ${s.name}`}
                  fill
                  sizes="(min-width: 1024px) 700px, 100vw"
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <KitIcon name="stadium" size={96} />
                </div>
              )}
            </div>
          </Ticket>
          {s.photo && (
            <figcaption>
              <PhotoCreditLine photo={s.photo} className="mt-2" />
            </figcaption>
          )}
        </figure>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div>
            <h1 className="titulo-display text-4xl text-estadio lg:text-5xl">{s.name}</h1>
            <p className="mt-2 flex items-center gap-1 text-suave">
              <KitIcon name="location-pin" size={18} /> {place(s)} · {s.countryName}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-linha bg-papel px-5 py-4">
            <span className="rotulo-display text-sm text-estadio">Capacidade</span>
            <Capacity value={s.capacity} needsReview={s.capacityNeedsReview} size="lg" />
          </div>

          <dl className="rounded-2xl border border-linha bg-white px-5 py-1">
            {s.address && (
              <Info label="Endereço">
                {s.address}
                {s.addressSource === "openstreetmap" && (
                  <span className="mt-1 block text-xs text-suave">
                    ©{" "}
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                      OpenStreetMap
                    </a>
                  </span>
                )}
              </Info>
            )}
            {s.openedYear && <Info label="Inauguração">{s.openedYear}</Info>}
            {s.clubs.length > 0 && <Info label={s.clubs.length > 1 ? "Clubes mandantes" : "Clube mandante"}>{s.clubs.join(", ")}</Info>}
            {s.website && (
              <Info label="Site oficial">
                <a href={s.website} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-estadio underline">
                  {s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              </Info>
            )}
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/app/passaporte" className="flex-1" icon={<KitIcon name="camera-ai" size={26} />}>
              Registrar visita
            </ButtonLink>
            {mapsUrl && (
              <ButtonLink href={mapsUrl} variant="secundario" className="flex-1" target="_blank" rel="noopener noreferrer">
                Abrir no mapa
              </ButtonLink>
            )}
          </div>

          {s.wikidataUrl && (
            <p className="text-xs text-suave">
              Fonte dos dados:{" "}
              <a href={s.wikidataUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Wikidata
              </a>
              {s.capacityNeedsReview && " · a fonte traz valores diferentes para a capacidade"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

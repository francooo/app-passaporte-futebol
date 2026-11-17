"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { VisitPhoto } from "@shared/api-types";
import { PHOTO_LIMITS } from "@shared/schemas";
import { Button } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { api, uploadPhoto } from "@/lib/client-api";

/** Galeria do carimbo: ver, adicionar e remover fotos. */
export function VisitPhotos({ visitId, photos }: { visitId: string; photos: VisitPhoto[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const free = PHOTO_LIMITS.maxPerVisit - photos.length;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, free);
    setError(null);
    let failed = 0;
    for (const [i, file] of list.entries()) {
      setBusy(`Enviando foto ${i + 1} de ${list.length}…`);
      try {
        await uploadPhoto(visitId, file);
      } catch (e) {
        failed++;
        setError((e as Error).message);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    setBusy(null);
    if (failed && failed < list.length) setError(`${failed} foto(s) não foram enviadas.`);
    startTransition(() => router.refresh());
  }

  async function remove(photo: VisitPhoto, index: number) {
    if (!confirm(`Remover a foto ${index + 1}?`)) return;
    setBusy("Removendo foto…");
    setError(null);
    try {
      await api(`/api/photos/${photo.id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="fotos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="fotos" className="titulo-display text-2xl text-estadio">
          Fotos <span className="font-sans text-base font-normal text-suave">({photos.length}/{PHOTO_LIMITS.maxPerVisit})</span>
        </h2>
        {free > 0 && (
          <Button type="button" variant="secundario" onClick={() => inputRef.current?.click()} disabled={!!busy} className="min-h-11 text-lg">
            <KitIcon name="camera-ai" size={22} /> Adicionar
          </Button>
        )}
        <input ref={inputRef} type="file" accept={PHOTO_LIMITS.types.join(",")} multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      <div aria-live="polite">
        {busy && <p className="text-suave">{busy}</p>}
        {error && <p className="text-sm text-erro">{error}</p>}
      </div>
      {photos.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {photos.map((p, i) => (
            <li key={p.id} className="group relative">
              <a href={p.url} target="_blank" rel="noopener" aria-label={`Abrir foto ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida por /api/media */}
                <img src={p.thumbUrl} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
              </a>
              <button
                type="button"
                onClick={() => remove(p, i)}
                disabled={!!busy}
                aria-label={`Remover foto ${i + 1}`}
                className="absolute right-1 top-1 grid size-9 place-items-center rounded-full border border-linha bg-white/90 shadow"
              >
                <KitIcon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-linha p-4 text-suave">Nenhuma foto neste carimbo ainda.</p>
      )}
    </section>
  );
}

/** Excluir o carimbo (com confirmação). */
export function DeleteVisit({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!confirm("Excluir este carimbo e as fotos dele? Não dá para desfazer.")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/visits/${visitId}`, { method: "DELETE" });
      router.replace("/app/passaporte");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm font-semibold text-erro underline-offset-4 hover:underline disabled:opacity-60"
      >
        <KitIcon name="trash" size={18} /> {busy ? "Excluindo…" : "Excluir carimbo"}
      </button>
      {error && <p className="text-sm text-erro">{error}</p>}
    </div>
  );
}

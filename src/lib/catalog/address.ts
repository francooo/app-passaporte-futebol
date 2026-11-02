import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stadiums } from "@/db/schema";
import { hitRateLimit } from "@/lib/auth-core";
import { USER_AGENT } from "./wikidata";

type NominatimAddress = Partial<
  Record<"road" | "house_number" | "suburb" | "neighbourhood" | "city" | "town" | "village" | "municipality" | "state" | "postcode", string>
>;

/** "Rua X, 123 – Bairro, Cidade – Estado, CEP" a partir das partes do Nominatim. */
export function formatAddress(a: NominatimAddress): string | null {
  const street = [a.road, a.house_number].filter(Boolean).join(", ");
  const district = a.suburb ?? a.neighbourhood;
  const city = a.city ?? a.town ?? a.village ?? a.municipality;
  const parts = [street, [district, city].filter(Boolean).join(", "), [a.state, a.postcode].filter(Boolean).join(", ")]
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts.join(" – ") : null;
}

/**
 * Endereço pelo OpenStreetMap (Nominatim) a partir das coordenadas, consultado uma única vez e guardado.
 * Política de uso: no máximo 1 requisição/s, User-Agent identificado e atribuição "© OpenStreetMap".
 * Se o limite estiver ocupado ou a consulta falhar, devolve null (a tela mostra cidade/estado).
 */
export async function fillAddress(id: string, lat: number, lng: number) {
  if (!(await hitRateLimit("nominatim:global", 1, 1))) return null;
  try {
    const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lng), zoom: "18", "accept-language": "pt-BR" });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { address?: NominatimAddress };
    const address = json.address ? formatAddress(json.address) : null;
    if (!address) return null;
    await db.update(stadiums).set({ address, addressSource: "openstreetmap" }).where(eq(stadiums.id, id));
    return { address, addressSource: "openstreetmap" };
  } catch {
    return null;
  }
}

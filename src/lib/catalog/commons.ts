import { cleanAuthor, isAcceptedLicense } from "./rules";
import { USER_AGENT } from "./wikidata";

export type PhotoCredit = {
  url: string;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  pageUrl: string;
};

const API = "https://commons.wikimedia.org/w/api.php";
const BATCH = 50;

type ImageInfo = {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string } | undefined>;
};

/**
 * Autor, licença e miniatura (~800 px) das fotos do Wikimedia Commons.
 * Fotos sem licença livre identificável ficam de fora do resultado (o estádio fica sem foto).
 */
export async function fetchPhotoCredits(files: string[]): Promise<Map<string, PhotoCredit>> {
  const result = new Map<string, PhotoCredit>();
  const unique = [...new Set(files)];

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "960", // largura padrão do Wikimedia (outras dão 400)
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|AttributionRequired",
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    const res = await fetch(`${API}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Commons respondeu ${res.status}`);
    const json = (await res.json()) as {
      query?: {
        normalized?: Array<{ from: string; to: string }>;
        pages?: Array<{ title: string; missing?: boolean; imageinfo?: ImageInfo[] }>;
      };
    };

    // O Commons normaliza títulos (ex.: "_" → " "); voltamos ao nome pedido.
    const original = new Map<string, string>();
    for (const n of json.query?.normalized ?? []) original.set(n.to, n.from);

    for (const page of json.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (page.missing || !info) continue;
      const meta = info.extmetadata ?? {};
      const license = meta.LicenseShortName?.value?.trim();
      if (!isAcceptedLicense(license)) continue;
      const url = info.thumburl ?? info.url;
      if (!url || !info.descriptionurl) continue;

      const requested = (original.get(page.title) ?? page.title).replace(/^File:/, "");
      result.set(requested, {
        url,
        author: cleanAuthor(meta.Artist?.value),
        license: license!,
        licenseUrl: meta.LicenseUrl?.value ?? null,
        pageUrl: info.descriptionurl,
      });
    }
  }
  return result;
}

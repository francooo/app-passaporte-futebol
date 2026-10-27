import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Passaporte Esportivo",
    short_name: "Passaporte",
    description: "Seu próximo carimbo começa aqui.",
    start_url: "/app",
    display: "standalone",
    background_color: "#FFF9E8",
    theme_color: "#123A32",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

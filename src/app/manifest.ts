import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Full-Stack, Frontend & AI / Agentic Systems`,
    short_name: "Prince Chipango",
    description: SITE.manifesto,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#111416",
    theme_color: "#111416",
    lang: "en-GB",
    dir: "ltr",
    categories: ["portfolio", "technology", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

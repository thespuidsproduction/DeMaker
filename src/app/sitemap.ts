import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

const SECTIONS = ["identity", "disciplines", "work", "credibility", "lab", "profile", "contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    // Section anchors are declared so the fragments are discoverable even
    // though the site is a single document.
    ...SECTIONS.map((s) => ({
      url: `${SITE.url}/#${s}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

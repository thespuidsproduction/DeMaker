import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

/**
 * Must match the section ids actually rendered in src/app/page.tsx. These
 * drifted once already: three of them pointed at anchors that had been
 * renamed out of existence, which is a promise of a fragment that is not
 * there.
 */
const SECTIONS = [
  "identity",
  "work",
  "toolbox",
  "measured",
  "agent",
  "profile",
  "atlas",
  "chart",
  "contact",
];

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

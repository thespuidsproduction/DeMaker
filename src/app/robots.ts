import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      // Crawling for search and for answering questions about this person is
      // welcome. Bulk scraping for model training is not — see /.well-known/ai.txt
      // and /llms.txt for the full statement.
      {
        userAgent: ["CCBot", "Bytespider", "PetalBot", "Amazonbot", "Omgilibot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}

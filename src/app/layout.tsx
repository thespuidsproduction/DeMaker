import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Nunito, Amatic_SC } from "next/font/google";
import { SITE } from "@/content/site";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

/* Primary interface typography: warm, geometric, calm. */
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
});

/* The handwritten annotation layer. Never used for blocks of information. */
const amatic = Amatic_SC({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-amatic",
  weight: ["400", "700"],
});

const description = `${SITE.name} — Full-Stack Developer, Frontend Engineer and AI / Agentic Systems Developer in ${SITE.location}. ${SITE.philosophy}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Full-Stack, Frontend & AI / Agentic Systems`,
    template: `%s — ${SITE.name}`,
  },
  description,
  applicationName: SITE.domain,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  keywords: [
    "Prince Chipango",
    "full-stack developer",
    "frontend engineer",
    "AI agents",
    "agentic systems",
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Python",
    "RAG",
    "LLM systems",
    "Weston-super-Mare",
    "UK developer",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "profile",
    url: SITE.url,
    siteName: SITE.domain,
    title: `${SITE.name} — Full-Stack, Frontend & AI / Agentic Systems`,
    description,
    locale: "en_GB",
    firstName: "Prince",
    lastName: "Chipango",
    username: SITE.handle,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Full-Stack, Frontend & AI / Agentic Systems`,
    description: SITE.philosophy,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1112" },
  ],
};

/* schema.org — the machine-readable half of the identity. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE.url}/#person`,
      name: SITE.name,
      givenName: "Prince",
      familyName: "Chipango",
      url: SITE.url,
      email: `mailto:${SITE.email}`,
      telephone: SITE.phone,
      jobTitle: [...SITE.roles],
      description: SITE.manifesto,
      address: {
        "@type": "PostalAddress",
        addressLocality: SITE.locality,
        addressRegion: SITE.region,
        addressCountry: SITE.country,
      },
      knowsAbout: [
        "Full-stack engineering",
        "Frontend architecture",
        "React",
        "Next.js",
        "TypeScript",
        "Node.js",
        "PostgreSQL",
        "MySQL",
        "Python",
        "AI agents",
        "Agent orchestration",
        "Retrieval-augmented generation",
        "Vector databases",
        "Workflow automation",
        "Web accessibility",
        "Performance engineering",
      ],
      seeks: {
        "@type": "Demand",
        name: "Full-stack, frontend and agentic systems engagements",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: `${SITE.name} — ${SITE.domain}`,
      description,
      inLanguage: "en-GB",
      publisher: { "@id": `${SITE.url}/#person` },
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE.url}/#profilepage`,
      url: SITE.url,
      name: `${SITE.name} — Portfolio`,
      isPartOf: { "@id": `${SITE.url}/#website` },
      about: { "@id": `${SITE.url}/#person` },
      inLanguage: "en-GB",
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${nunito.variable} ${amatic.variable}`} suppressHydrationWarning>
      <head>
        {/* Applied before first paint so a stored theme never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

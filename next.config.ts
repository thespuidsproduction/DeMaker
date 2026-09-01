import type { NextConfig } from "next";

/**
 * Extensionless / non-standard `.well-known` documents need explicit
 * Content-Type headers — Next's static handler cannot infer them.
 */
const WELL_KNOWN_JSON = [
  "/.well-known/apple-app-site-association",
  "/.well-known/nostr.json",
  "/.well-known/did.json",
  "/.well-known/assetlinks.json",
  "/.well-known/gpc.json",
  "/.well-known/host-meta.json",
  "/.well-known/funding-manifest-urls.json",
  "/.well-known/matrix/server",
  "/.well-known/matrix/client",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      ...WELL_KNOWN_JSON.map((source) => ({
        source,
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      })),
      {
        source: "/.well-known/:path*.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/.well-known/host-meta",
        headers: [
          { key: "Content-Type", value: "application/xrd+xml; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/.well-known/traffic-advice",
        headers: [
          { key: "Content-Type", value: "application/trafficadvice+json; charset=utf-8" },
        ],
      },
      {
        source: "/humans.txt",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
      {
        source: "/llms.txt",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
    ];
  },

  async redirects() {
    return [
      // https://w3c.github.io/webappsec-change-password-url/
      {
        source: "/.well-known/change-password",
        destination: "/#contact",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      // Dot-directories are not scanned by the App Router file system, so the
      // query-dependent endpoints live under /well-known and are rewritten in.
      { source: "/.well-known/webfinger", destination: "/well-known/webfinger" },
    ];
  },
};

export default nextConfig;

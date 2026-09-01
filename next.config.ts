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
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          // The site makes no third-party requests of any kind, so the policy
          // can say exactly that. 'unsafe-inline' on styles is required by
          // Next's inlined critical CSS; scripts are hashed by the framework.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'wasm-unsafe-eval' is required and is not optional: the physics
              // solver is a WebAssembly module, and without it every draggable
              // object on the site silently stops moving. It permits WASM
              // compilation only; it does not re-enable eval().
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              // The channel talks to a delivery provider from the server, not
              // from the page, so the browser needs no outbound allowance.
              "connect-src 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // Hashed build output is immutable by definition.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // The channel must never be cached anywhere, by anyone.
        source: "/api/channel",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex" },
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

import { NextResponse } from "next/server";
import { SITE } from "@/content/site";

/**
 * WebFinger — RFC 7033.
 *
 * Reached at /.well-known/webfinger via a rewrite in next.config.ts: the App
 * Router does not scan dot-prefixed directories, and this endpoint cannot be
 * a static file because it is keyed on the `resource` query parameter.
 */

const SUBJECT = `acct:${SITE.handle}@${SITE.domain}`;

/** Every identifier that resolves to the same person. No mailto: the address
 *  is not published anywhere, here included. */
const ALIASES = [SUBJECT, SITE.url, `${SITE.url}/`] as const;

const JRD = {
  subject: SUBJECT,
  aliases: [SITE.url],
  properties: {
    "http://schema.org/name": SITE.name,
    "http://schema.org/jobTitle": SITE.roles.join(", "),
    "http://schema.org/address": SITE.location,
    "http://schema.org/contactPoint": `${SITE.url}/#contact`,
  },
  links: [
    {
      rel: "http://webfinger.net/rel/profile-page",
      type: "text/html",
      href: `${SITE.url}/`,
    },
    {
      rel: "describedby",
      type: "application/ld+json",
      href: `${SITE.url}/`,
    },
    {
      rel: "self",
      type: "application/jrd+json",
      href: `${SITE.url}/.well-known/webfinger?resource=${encodeURIComponent(SUBJECT)}`,
    },
    {
      rel: "http://webfinger.net/rel/avatar",
      type: "image/png",
      href: `${SITE.url}/apple-icon`,
    },
    {
      rel: "canonical",
      href: SITE.url,
    },
  ],
};

const jrd = (body: unknown, status: number) =>
  NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/jrd+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });

export function GET(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource");

  // The RFC is explicit: a missing `resource` is a client error, not a 404.
  if (!resource) {
    return jrd(
      { error: "The 'resource' query parameter is required.", subject: SUBJECT },
      400,
    );
  }

  const match = ALIASES.some((a) => a.toLowerCase() === resource.toLowerCase());
  if (!match) {
    return jrd({ error: `No account matching '${resource}' at ${SITE.domain}.` }, 404);
  }

  return jrd(JRD, 200);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

# `/.well-known` for princey.dev

An index of every document published under this path, what it is for, whether
it currently carries real data, and how to activate the ones that do not.

Nothing here contains an invented identifier. Where a document requires a
cryptographic key, a team ID or a certificate fingerprint that does not yet
exist, the live file is a **valid empty registry** and the filled-in shape
lives under [`templates/`](./templates/). An empty registry is a truthful
answer; a fabricated key is a lie that verification tooling will act on.

---

## Live documents

| Path | Standard | Status |
| --- | --- | --- |
| [`security.txt`](./security.txt) | [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) | **Real.** Web contact route, scope, disclosure handling and expiry. No `mailto:`, see below. |
| [`ai.txt`](./ai.txt) | de-facto | **Real.** What automated agents and model builders may and may not do with this site. |
| [`dnt-policy.txt`](./dnt-policy.txt) | EFF DNT Policy 1.0 | **Real.** There is nothing to opt out of; this says so precisely. |
| [`gpc.json`](./gpc.json) | [Global Privacy Control](https://globalprivacycontrol.github.io/gpc-spec/) | **Real.** GPC is honoured. No data is sold or shared. |
| [`host-meta`](./host-meta) · [`host-meta.json`](./host-meta.json) | [RFC 6415](https://www.rfc-editor.org/rfc/rfc6415) | **Real.** XRD and JRD host metadata, pointing at the WebFinger endpoint. |
| `webfinger` | [RFC 7033](https://www.rfc-editor.org/rfc/rfc7033) | **Real.** Dynamic endpoint, see below. |
| `change-password` | [W3C change-password-url](https://w3c.github.io/webappsec-change-password-url/) | **Real.** 307 to `/#contact`; this site has no accounts, so the honest destination is a way to reach a human. |
| [`traffic-advice`](./traffic-advice) | Chrome Private Prefetch Proxy | **Real.** Prefetching is permitted at full fraction. |
| [`funding-manifest-urls`](./funding-manifest-urls) | [FLOSS/fund](https://floss.fund/funding-manifest/) | **Real.** States that no funding manifest is published. |

## Valid but empty

These are served with a well-formed but empty body, because no application or
key is bound to this domain yet.

| Path | Standard | Why empty |
| --- | --- | --- |
| [`assetlinks.json`](./assetlinks.json) | Android App Links (Digital Asset Links) | No Android application is associated with `princey.dev`. |
| [`apple-app-site-association`](./apple-app-site-association) | Apple Universal Links | No iOS app, App Clip or shared web credential is associated with `princey.dev`. |
| [`nostr.json`](./nostr.json) | [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) | No Nostr public key is published. An invented `npub` would let someone else's key be trusted as mine. |

## Templates (not served as live metadata)

`templates/` holds the filled-in shape of every document above that needs a
real secret or identifier, plus the ones that are not served at all yet.
Each placeholder is written in `SCREAMING_SNAKE_CASE` so a forgotten one is
impossible to miss.

| Template | Activate by |
| --- | --- |
| `templates/assetlinks.json` | Replace `package_name` with the Android application ID and the fingerprint with the uppercase, colon-separated SHA-256 of the **release** signing certificate (`keytool -list -v -keystore …`). Copy over `../assetlinks.json`. |
| `templates/apple-app-site-association` | Replace `REPLACE_TEAM_ID.REPLACE_BUNDLE_ID` with the App ID. Copy over `../apple-app-site-association`. Serve as `application/json` with **no** file extension, already configured in `next.config.ts`. |
| `templates/did.json` | Generate an Ed25519 key pair, put the multibase-encoded **public** key in `publicKeyMultibase`, and copy to `../did.json` to become `did:web:princey.dev`. Never put the private key in this repository. |
| `templates/nostr.json` | Insert the 32-byte **hex** public key (not the bech32 `npub`) under `names.princey`, and list your relays. Copy over `../nostr.json`. |
| `templates/atproto-did` | Put the account's `did:plc:…` on a single line and copy to `../atproto-did` to verify a Bluesky handle. |
| `templates/matrix/server`, `templates/matrix/client` | Only if a Matrix homeserver is actually delegated for this domain. A delegation pointing at a host that does not exist breaks federation attempts against `princey.dev`. |

## Dynamic endpoints

`webfinger` and `change-password` cannot be static files: one depends on a
query string, the other is a redirect. Dot-prefixed directories are not
scanned by the Next.js App Router, so the handler lives at
`src/app/well-known/webfinger/route.ts` and `next.config.ts` rewrites
`/.well-known/webfinger` onto it. `change-password` is a redirect declared in
the same config.

Query it like this:

```
curl 'https://princey.dev/.well-known/webfinger?resource=acct:princey@princey.dev'
```

It answers for `acct:princey@princey.dev`, `https://princey.dev` and
`https://princey.dev/`. Anything else returns `404` with a JRD-shaped error
body; a missing `resource` returns `400`, as the RFC requires.

Note the absence of a `mailto:` alias. **No email address, telephone number or
postal address is published anywhere on this site**, this directory included.
Every contact route points at `/#contact`, whose API resolves the real
destination from a server-side environment variable.

## Content types

Several of these files have no extension, and a static handler cannot infer
their type. `next.config.ts` sets `Content-Type` explicitly for
`apple-app-site-association`, `traffic-advice`, `host-meta`, and every JSON
document under this path, along with `Access-Control-Allow-Origin: *` so
cross-origin verifiers can read them.

## Related documents outside this directory

| Path | Purpose |
| --- | --- |
| `/robots.txt` | Crawl policy. Generated from `src/app/robots.ts`. |
| `/sitemap.xml` | Generated from `src/app/sitemap.ts`. |
| `/humans.txt` | Who built this and with what. |
| `/llms.txt` | A structured, machine-readable précis of the site for language models. |
| `/manifest.webmanifest` | Web app manifest, generated from `src/app/manifest.ts`. |

---

Maintained by Prince Chipango. https://princey.dev/#contact

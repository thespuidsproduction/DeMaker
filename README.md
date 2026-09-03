# princey.dev

Personal portfolio and developer identity for **Prince Chipango**, Full-Stack
Developer, Frontend Engineer, AI / Agentic Systems Developer.

> "I care about how things feel, not just how they work."

Built as **The Atelier of Weightless Machinery**: Swiss International
Typographic Style as the structural foundation, an optical glass system layered
over it, Victorian engraving as accent, and a real physics layer underneath.

It is not a catalogue of skills. It is a piece of software that happens to
introduce its creator.

## The two rules

**1. The iceberg.** Six technologies are visible unprompted: React, Next.js,
TypeScript, Node, PostgreSQL, AI. Everything else is *earned through context*:
a facet of the toolbox opened, a project taken apart. `JWT` and `RBAC` do not
appear on the page until someone opens the hood on Swagrush; `three.js`
and `Two-bone IK` appear only inside Weston Warriors. Surface is
beautiful; depth is technical. That contrast is the identity.

**2. Nothing private is published.** No email address, no telephone number, no
street address, not in the markup, not in the client bundle, not in
`/.well-known/`, not in the JSON-LD, not in `llms.txt`. The only location shown
is *United Kingdom*. Contact runs through a server-side channel that resolves
the destination from an environment variable.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

Node 20+ required. No environment variables, no database, no API keys, the
site is a single statically-prerendered document plus one dynamic route
(`/.well-known/webfinger`).

---

## Architecture

```
src/
  app/
    layout.tsx              Fonts, metadata, JSON-LD (Person / WebSite / ProfilePage)
    page.tsx                Section composition
    globals.css             The entire design system, tokens, glass, grid, motion
    icon.svg                Favicon (engraved aperture)
    apple-icon.tsx          Generated 180×180 touch icon
    opengraph-image.tsx     Generated 1200×630 share card
    robots.ts sitemap.ts manifest.ts
    well-known/webfinger/   RFC 7033 endpoint (rewritten from /.well-known/)
    api/channel/route.ts    Contact delivery: honeypot, dwell, validation, rate limit
  components/
    Hero.tsx                Identity, optical field, six physics fragments
    Manifesto.tsx           Scrubbed clause-by-clause statement
    Work.tsx                Projects. Surface → blueprint under the hood
    Toolbox.tsx             Six floating objects that unfold, never a list
    Credibility.tsx         Four oversized numerals and silence
    AgentLab.tsx            Perceive → Think → Act, growing on demand
    Profile.tsx             Editorial page, handwritten signature
    Channel.tsx             The contact console
    Ambient.tsx             The pulse: mote, trace line, header readout
    Atlas.tsx               Mercator folding into an orthographic globe
    Toast.tsx               Send and failure notices
    Lens.tsx                A piece of glass that follows the pointer
    Intro.tsx               The curtain, once per session, always skippable
    Ticker.tsx              The drifting strip, pushed by scroll velocity
    Footer.tsx Nav.tsx ThemeToggle.tsx Movement.tsx
    Ornament.tsx            Hand-authored engraved SVG (no stock, no icon font)
    Optical.tsx             SVG filters: refraction, dispersion, hatch
  lib/
    physics.ts              Rapier 2D world mapped onto real DOM nodes
    motion.ts               GSAP setup, reveal scoring, magnetism, specular tracking
    traces.tsx              What the visitor uncovered, returned as marginalia
    theme.ts                Pre-paint theme boot script
  content/
    site.ts                 Single source of truth for every string on the page
    world.ts                Land outlines as lon/lat, for client-side projection
public/
  .well-known/              See .well-known/README.md
  humans.txt llms.txt
```

### The glass system

`.glass` is not a blur-and-a-border. It is a stack of five optical layers:

1. **Refraction plate**, `backdrop-filter` with blur, saturation and a slight
   brightness lift, so what sits behind a panel is *suggested*, not erased.
2. **Body tint**, an off-axis gradient, not a flat wash.
3. **Chromatic dispersion**, two inset rings, one warm and one cool, on
   opposite edges. Light fractures at the rim without a shader.
4. **Specular sweep**, a radial highlight whose origin tracks the pointer
   (`trackSpecular`), so the light source appears to be in the room.
5. **Engraved hairline**, a single-pixel edge, plus optional ornamental
   corner brackets.

There is also matter *behind* the glass, an oversized outlined numeral and an
engraved schema plate in the hero. Without something to bend, a translucent
plane is only a rectangle.

### The physics layer

`lib/physics.ts` boots a Rapier 2D world (WASM) and maps it onto real DOM
elements. Elements keep their document position for layout, accessibility and
text flow; physics only ever writes a `transform`.

- **Mass scales with visual area.** A large plate is genuinely harder to move
  than a small chip.
- **Tether**: a spring back to the layout position. This is what keeps a
  surrealist composition from dissolving into noise.
- **Leash**: a hard clamp on displacement. Typography may drift, but only
  within a defined physical boundary.
- **Cursor repulsion**: objects part around the hand with a squared falloff.
- **Drag**: velocity control rather than teleporting, so an object follows
  the hand with the lag of something that has weight, and springs back with
  overshoot when released.
- **Shockwave**: `impulseAt()` sends a pressure wave through the layer from a
  point; the agent trace fires one at each stage as the signal passes.

The world is torn down on unmount and never boots at all under
`prefers-reduced-motion: reduce`.

### Progressive disclosure

Every section has a maximum information threshold. Past it, information is
deferred rather than shrunk:

| Surface | Depth | Deeper still |
| --- | --- | --- |
| A verb and a capability sentence | Three primary technologies | `+ more` → the long tail, as prose |
| A project name and one line | **Under the hood** to a blueprint: callouts, stack, four strata |: |
| Perceive → Think → Act | **Open the system** → seven stages with notes | **Show the architecture** → the invariants |
| `Open a channel` | Console boots, status resolves | The form |

Nothing that is hidden is hidden from assistive technology: every disclosure is
a real `aria-expanded` button controlling a real `hidden` panel, and the audit
below opens all of them before measuring.

### Traces, the site remembers

`lib/traces.tsx` records what a visitor uncovers, in `sessionStorage`, and
never transmits it. Open the hood on Swagrush and `JWT` is remembered;
several sections later a handwritten note appears in the margin, *"from
earlier, JWT, in Swagrush"*, and the header readout switches from
`SYSTEM NOMINAL` to the last thing found, with a count.

It makes the page feel like one connected world rather than ten unrelated
sections. It is deliberately quiet: a `Marginalia` renders nothing at all until
enough has actually been discovered, so the site never invents a memory it does
not have.

### Ambient life

Signs the environment is running, none of which asks for attention: a mote of
glass drifting on a ~90 second Lissajous path, a line tracing an invisible
system once every 34 seconds, a status readout that changes its mind on an
irregular cadence, glass whose specular layer swells on long unequal periods so
no two panels breathe together, and light tracking the pointer across every
plate. All of it stops under `prefers-reduced-motion`.

The readout lives in the header rather than floating over the page. A status
line that covers the paragraph you are reading is not ambient, it is in the way.

### The lens

A piece of the glass system follows the pointer, one beat behind, and actually
refracts what is under it. The real cursor never moves or hides. It opens and
draws a ring over a control, squares off into a grab mark over a physics body,
and collapses on press. Pointer-fine devices only, there is nothing to lag
behind on a touchscreen, and never under reduced motion.

### The curtain

Two ivory plates part to reveal the page, once per session. It is rendered in
the server HTML rather than mounted after hydration, so the page never flashes
before being covered up. Any input at all, pointer, wheel, touch, Esc, Space,
Enter, jumps it straight to the parting: a full run is ~2.8s, a skipped one
~0.9s. A CSS failsafe uncovers the page after six seconds if the script never
runs at all, and `<noscript>` removes it entirely.

### The atlas

Mercator's projection of 1569 folding into an orthographic globe. Both are
computed from the same `[lon, lat]` rings every frame and blended by a single
value, so the transition is a real reprojection rather than a crossfade between
two pictures. Points on the far side are drawn on their own path at an opacity
that falls to zero as the sphere closes, which is what makes the flat map look
like it is wrapping rather than cutting away. Drag to turn the globe; it always
drifts back to the view that shows the marker.

The outlines are Natural Earth 110m land, decoded from TopoJSON and simplified
with Douglas-Peucker to 98 rings and 2,327 points, about 30KB. Two details that
a naive projection gets wrong and this one does not: rings crossing the
antimeridian have their path broken rather than being drawn as a stroke back
across the whole map, and the Mercator is scaled from its height so the
latitude cut-off is a deliberate choice rather than a coastline sliced off
mid-shape.

Only the country is marked. Nothing more precise is published, here or
anywhere else on the site.

### Notices

Send and failure both surface as a toast: the convention people already know,
in this site's material. A success dismisses itself after six seconds. A
failure does not, because a message that did not send is something the sender
needs to see and act on, and a notice that vanishes on its own can be missed.

Failures say which part went wrong and what to do about it, drawn from the
error code the API returned. "Something went wrong" tells the sender nothing
and leaves them with no next move.

### The strip

A measuring tape between movements, drifting on a 46-second loop. Scroll
velocity leans on it through `timeScale`, so the page and the strip share one
physical world. Once the visitor has uncovered things, their finds take their
place in the strip alongside the fixed claims, in copper.

### Motion as body language

Different things move differently, on purpose:

- **Typography glides**: section titles are split per character and scored on
  a 28ms stagger, then stay live: each character leans away from the cursor in
  proportion to its distance, so a headline ripples rather than sliding.
- **Glass floats**: long tethers, high damping, drifting within a leash.
- **Glass leans**: project cards tilt on two axes toward the pointer, with
  real perspective, so a plate reads as a surface in space.
- **Diagrams snap**: blueprint callouts land in 0.28s; drawings do not glide.
- **Physics objects carry inertia**: mass scales with area, release overshoots.
- **Numerals count**: 09+, 60 and 100% run up on arrival. `AA` does not, because
  a letter cannot count and faking it would be noise.
- **Buttons respond immediately**: 160ms, and they depress under the finger.
- **Images move slowly**: project artifacts drift on a 1.4 scrub.

Two rules keep this from fighting itself. A CSS animation outranks inline
styles, so **nothing animates `transform` in CSS on an element the physics
solver or the tilt handler writes to**, glass breathes on its specular layer
instead. And every reveal clears its own `filter` and `will-change` on
completion: `blur(0px)` is not a no-op, it pins the element to its own
compositing layer for the life of the page.

### Motion

GSAP with ScrollTrigger for scored section reveals and scrub-linked
composition; Motion's philosophy for the micro-interactions. Easing is never
`ease-out` by default, `power4.out` for heavy studio doors, `expo.out` for
numerals that overshoot and settle, `elastic` only where a spring is literal.

Every animated property is `transform`, `opacity` or `filter`, so nothing
touches layout and nothing causes cumulative layout shift.

### Typography

- **Nunito**: interface and editorial typography.
- **Amatic SC**: the handwritten annotation layer only. Never a block of
  information; only the engineer's note in the margin.
- **System monospace**: laboratory metadata: technical labels, coordinates,
  figure numbers, tabular numerals.

### Colour and contrast

Two full palettes (warm ivory, obsidian), defined as tokens on bare `:root`,
redefined under `prefers-color-scheme: dark`, and redefined again under
`[data-theme="dark"]` so the toggle wins in both directions.

The display copper `#a8785a` reaches only 3.4:1 on ivory, enough for large
type, not for a 10px technical label, so small copper text uses a darker
`--accent-ink`. Every text node on the rendered page was measured against its
effective background in both themes; all pass WCAG 2.2 AA at their actual
computed size and weight.

---

## The channel

`src/app/api/channel/route.ts`. The delivery address is read from the server
environment inside the handler and appears in no markup, no client bundle, no
JSON payload and no error message, an upstream failure that mentions the
destination is caught and replaced before it reaches the browser.

Defence in depth, cheapest check first:

1. **Honeypot**, a `company` field, off-screen but `display: inline-block`, so
   a bot that checks computed style still fills it in. A filled honeypot gets
   `200 OK`; a bot learns nothing from success.
2. **Dwell time**, submitted under 2.5s after opening, or over 6 hours, is
   rejected. A person cannot compose a message in two seconds.
3. **Shape**, required fields, length bounds, and a `\r\n` guard on the name
   and reply address, which are handed to a mail transport.
4. **Rate limit**, 3 per client per 15 minutes, plus a global ceiling of 60.
   In-memory and therefore per-instance: it bounds abuse from one client
   against one server, not a distributed flood. Back it with a shared store on
   a multi-region deployment.

`GET /api/channel` reports `ready` or `offline` so the console can say so
honestly rather than accepting a message it cannot deliver, it never pretends
something was sent.

### Turning it on

Every configured transport fires, not just the first. Telegram for the
notification that reaches a pocket in a second, Resend for the copy that is
still there next week: those are different jobs and both are worth doing.
A message counts as delivered if at least one route accepts it, so one provider
being down never loses somebody's message; the failure is logged rather than
swallowed.

#### Resend, in four steps

1. Sign up at [resend.com](https://resend.com) and add `princey.dev` under
   **Domains**. It gives you three DNS records (an MX and two TXT, for SPF and
   DKIM). Add them wherever `princey.dev` is registered and wait for the
   dashboard to go green. This step is what keeps mail out of spam, and it is
   worth doing properly.
2. **API Keys** → create one with *Sending access*. It starts `re_`.
3. Set three variables on the host:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   CONTACT_TO=the-inbox-you-actually-read@example.com
   CONTACT_FROM=princey.dev <channel@princey.dev>
   ```
   `CONTACT_FROM` has to be on the verified domain. The mailbox part does not
   need to exist; nothing is delivered to it, it only has to be yours.
4. Redeploy. `GET /api/channel` should answer `{"status":"ready","routes":1}`.

Free tier is 3,000 emails a month, 100 a day, which for a portfolio contact
form is effectively unlimited.

#### Telegram, in three steps

1. Message [@BotFather](https://t.me/BotFather), send `/newbot`, pick a name.
   It replies with a token like `8123456789:AAF...`.
2. Send your new bot any message, once. A bot cannot open a conversation with
   you, so this is what lets it message you at all. Then message
   [@userinfobot](https://t.me/userinfobot) to get your numeric chat id.
3. Set both variables:
   ```
   TELEGRAM_BOT_TOKEN=8123456789:AAF...
   TELEGRAM_CHAT_ID=123456789
   ```

Messages arrive formatted, and everything the sender typed is HTML-escaped
first: a name containing a tag cannot inject markup into your notification.

#### Everything available

| | Transport | Free tier | Variables |
| --- | --- | --- | --- |
| 1 | **Resend** | 3,000/month | `RESEND_API_KEY` + `CONTACT_TO` |
| 2 | **Web3Forms** | 250/month | `WEB3FORMS_KEY` |
| 3 | **Formspree** | 50/month | `FORMSPREE_ID` |
| 4 | **Telegram** | unlimited | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |
| 5 | **FormSubmit** | unlimited | `CONTACT_TO` alone, no account |
| 6 | **Any JSON endpoint** | n/a | `CONTACT_WEBHOOK_URL` |

Every one is called server side, so the destination never reaches the browser,
FormSubmit included, where the address normally sits in the form action.
**With none set the channel reports itself offline** rather than accepting a
message it cannot deliver.

---

## Going to production

- [ ] Set the channel variables above, then confirm `GET /api/channel` returns
      `routes` greater than zero.
- [ ] Point `princey.dev` at the deployment. The canonical origin comes from
      `SITE.url` in `src/content/site.ts` and nothing else needs changing.
- [ ] Send one real message through the form and check it arrives.

Already handled in the repo:

- **Security headers** on every response: a CSP with no third-party origins at
  all, HSTS with preload, `nosniff`, a restrictive `Permissions-Policy`, and
  `frame-ancestors`. The CSP includes `wasm-unsafe-eval`, which is not
  optional: the physics solver is a WebAssembly module and without it every
  draggable object on the site silently stops moving.
- **Caching**: hashed build output immutable for a year; `/api/channel`
  `no-store` and `noindex`.
- **Error states**: a 404 and a 500 in the site's own voice, plus a
  self-contained global handler for the case where the root layout itself
  fails.
- **No third-party requests at run time.** Fonts are self-hosted by Next, and
  the delivery provider is only ever contacted from the server.
- Node 20+ is pinned in `engines` and `.nvmrc`.

## Content
## Content

Everything the site says lives in `src/content/site.ts`. Nothing is invented at
the component layer.

**Projects** are four shipped systems, all live and publicly reachable:

| | System | What it is | Live at |
| --- | --- | --- | --- |
| 01 | Swagrush | Promotional competition platform under CPA Section 32, with a published field size so members can calculate their own odds | [swagrush.app](https://swagrush.app) |
| 02 | Quorbel | Cryptographic draw verification; receipts anyone can replay offline, forever, without contacting the platform | [quorbel.com](https://quorbel.com) |
| 03 | Weston Warriors | A boxing club as a scroll-driven WebGL particle field, with every sound synthesised at run time | [weston-warriors.vercel.app](https://weston-warriors.vercel.app) |
| 04 | How to Bag a Billionaire's Daughter | A single-book shop where nothing is an image; the cover and every prop are drawn at run time | [htbabd.vercel.app](https://htbabd.vercel.app) |

Every description was written from each project's own machine-readable
disclosure (`llms.txt`, `security.txt`) rather than from memory, so any claim on
the page can be checked against its source. `reveals` is the list of
technologies that only exists under the hood, and those become the traces that
resurface later.

**Numbers.** Only four figures are published (9+ live applications, 60fps
target, WCAG AA target, 100% ownership of the stack). No metric appears on the
site that cannot be stood behind.

---

## `/.well-known`

Fully documented in [`public/.well-known/README.md`](public/.well-known/README.md),
what each document is for, whether it carries real data, and how to activate
the ones that do not.

Live and real: `security.txt` (RFC 9116), `ai.txt`, `dnt-policy.txt`,
`gpc.json`, `host-meta` / `host-meta.json` (RFC 6415), `webfinger` (RFC 7033),
`change-password`, `traffic-advice`, `funding-manifest-urls`.

Valid but deliberately empty: `assetlinks.json`, `apple-app-site-association`,
`nostr.json`, no application or key is bound to this domain yet, and a
fabricated fingerprint or public key is worse than no file at all. Filled-in
shapes for all of these, plus `did.json`, `atproto-did` and Matrix delegation,
live under `.well-known/templates/`.

Content types for extensionless documents and the `webfinger` rewrite are
configured in `next.config.ts`.

---

## Deployment

Any Node host that runs `next start`, or Vercel with zero configuration. Two
dynamic routes, `/api/channel` and `/.well-known/webfinger`; everything else is
prerendered.

**Set the channel environment variables** (see `.env.example`) or the contact
console will correctly report itself offline.

Point `princey.dev` at the deployment and nothing else needs changing, the
canonical origin is read from `SITE.url` in `src/content/site.ts`.

---

## Privacy

No analytics, no cookies, no third-party tags, no fonts loaded from a third
party.

Two browser-storage keys, neither of which ever leaves the device:
`atelier-theme` in `localStorage` (colour scheme) and `princey-traces` in
`sessionStorage` (what you uncovered this visit).

No personal contact detail is published. This is verified, not assumed, the
served HTML and every JavaScript chunk were fetched and scanned for the email
address, the telephone number, the town, `mailto:`, `tel:` links and the
delivery environment variables. Zero matches across ~800KB. Re-run that check
after any change to the content layer.

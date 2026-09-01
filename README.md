# princey.dev

Personal portfolio and developer identity for **Prince Chipango** — Full-Stack
Developer, Frontend Engineer, AI / Agentic Systems Developer.

> "I care about how things feel, not just how they work."

Built as **The Atelier of Weightless Machinery**: Swiss International
Typographic Style as the structural foundation, an optical glass system layered
over it, a restrained surrealist dimension in the composition, Victorian
engraving as accent, and a real physics layer underneath.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

Node 20+ required. No environment variables, no database, no API keys — the
site is a single statically-prerendered document plus one dynamic route
(`/.well-known/webfinger`).

---

## Architecture

```
src/
  app/
    layout.tsx              Fonts, metadata, JSON-LD (Person / WebSite / ProfilePage)
    page.tsx                Section composition
    globals.css             The entire design system — tokens, glass, grid, motion
    icon.svg                Favicon (engraved aperture)
    apple-icon.tsx          Generated 180×180 touch icon
    opengraph-image.tsx     Generated 1200×630 share card
    robots.ts sitemap.ts manifest.ts
    well-known/webfinger/   RFC 7033 endpoint (rewritten from /.well-known/)
  components/
    Hero.tsx                Identity, optical field, physics fragments
    Manifesto.tsx           Scrubbed clause-by-clause statement
    Disciplines.tsx         Three rooms, one laboratory
    Projects.tsx            The exhibition; architecture revealed by inspection
    Credibility.tsx         Oversized numerals
    AgentLab.tsx            The agent as a translucent machine
    Profile.tsx             Editorial profile + the résumé publication
    Contact.tsx Footer.tsx Nav.tsx ThemeToggle.tsx Movement.tsx
    Ornament.tsx            Hand-authored engraved SVG (no stock, no icon font)
    Optical.tsx             SVG filters: refraction, dispersion, hatch
  lib/
    physics.ts              Rapier 2D world mapped onto real DOM nodes
    motion.ts               GSAP setup, reveal scoring, magnetism, specular tracking
    theme.ts                Pre-paint theme boot script
  content/
    site.ts                 Single source of truth for every string on the page
public/
  .well-known/              See .well-known/README.md
  humans.txt llms.txt
```

### The glass system

`.glass` is not a blur-and-a-border. It is a stack of five optical layers:

1. **Refraction plate** — `backdrop-filter` with blur, saturation and a slight
   brightness lift, so what sits behind a panel is *suggested*, not erased.
2. **Body tint** — an off-axis gradient, not a flat wash.
3. **Chromatic dispersion** — two inset rings, one warm and one cool, on
   opposite edges. Light fractures at the rim without a shader.
4. **Specular sweep** — a radial highlight whose origin tracks the pointer
   (`trackSpecular`), so the light source appears to be in the room.
5. **Engraved hairline** — a single-pixel edge, plus optional ornamental
   corner brackets.

There is also matter *behind* the glass — an oversized outlined numeral and an
engraved schema plate in the hero. Without something to bend, a translucent
plane is only a rectangle.

### The physics layer

`lib/physics.ts` boots a Rapier 2D world (WASM) and maps it onto real DOM
elements. Elements keep their document position for layout, accessibility and
text flow; physics only ever writes a `transform`.

- **Mass scales with visual area.** A large plate is genuinely harder to move
  than a small chip.
- **Tether** — a spring back to the layout position. This is what keeps a
  surrealist composition from dissolving into noise.
- **Leash** — a hard clamp on displacement. Typography may drift, but only
  within a defined physical boundary.
- **Cursor repulsion** — objects part around the hand with a squared falloff.
- **Drag** — velocity control rather than teleporting, so an object follows
  the hand with the lag of something that has weight, and springs back with
  overshoot when released.
- **Shockwave** — `impulseAt()` sends a pressure wave through the layer from a
  point; the agent trace fires one at each stage as the signal passes.

The world is torn down on unmount and never boots at all under
`prefers-reduced-motion: reduce`.

### Motion

GSAP with ScrollTrigger for scored section reveals and scrub-linked
composition; Motion's philosophy for the micro-interactions. Easing is never
`ease-out` by default — `power4.out` for heavy studio doors, `expo.out` for
numerals that overshoot and settle, `elastic` only where a spring is literal.

Every animated property is `transform`, `opacity` or `filter`, so nothing
touches layout and nothing causes cumulative layout shift.

### Typography

- **Nunito** — interface and editorial typography.
- **Amatic SC** — the handwritten annotation layer only. Never a block of
  information; only the engineer's note in the margin.
- **System monospace** — laboratory metadata: technical labels, coordinates,
  figure numbers, tabular numerals.

### Colour and contrast

Two full palettes (warm ivory, obsidian), defined as tokens on bare `:root`,
redefined under `prefers-color-scheme: dark`, and redefined again under
`[data-theme="dark"]` so the toggle wins in both directions.

The display copper `#a8785a` reaches only 3.4:1 on ivory — enough for large
type, not for a 10px technical label — so small copper text uses a darker
`--accent-ink`. Every text node on the rendered page was measured against its
effective background in both themes; all pass WCAG 2.2 AA at their actual
computed size and weight.

---

## Content

Everything the site says lives in `src/content/site.ts`. Nothing is invented at
the component layer.

**Projects** describe the architecture of shipped systems — frontend, backend,
database, infrastructure, AI architecture, performance, design decisions —
without client names, invented URLs or unverifiable metrics. Replace `name`,
add `href`, and add entries as each system becomes publicly referenceable; the
exhibition layout takes any number.

**Numbers.** Only four figures are published (9+ live applications, 60fps
target, WCAG AA target, 100% ownership of the stack). No metric appears on the
site that cannot be stood behind.

---

## `/.well-known`

Fully documented in [`public/.well-known/README.md`](public/.well-known/README.md) —
what each document is for, whether it carries real data, and how to activate
the ones that do not.

Live and real: `security.txt` (RFC 9116), `ai.txt`, `dnt-policy.txt`,
`gpc.json`, `host-meta` / `host-meta.json` (RFC 6415), `webfinger` (RFC 7033),
`change-password`, `traffic-advice`, `funding-manifest-urls`.

Valid but deliberately empty: `assetlinks.json`, `apple-app-site-association`,
`nostr.json` — no application or key is bound to this domain yet, and a
fabricated fingerprint or public key is worse than no file at all. Filled-in
shapes for all of these, plus `did.json`, `atproto-did` and Matrix delegation,
live under `.well-known/templates/`.

Content types for extensionless documents and the `webfinger` rewrite are
configured in `next.config.ts`.

---

## Deployment

Any Node host that runs `next start`, or Vercel with zero configuration. The
only dynamic route is `/.well-known/webfinger`; everything else is prerendered.

Point `princey.dev` at the deployment and nothing else needs changing — the
canonical origin is read from `SITE.url` in `src/content/site.ts`.

---

## Privacy

No analytics, no cookies, no third-party tags, no fonts loaded from a third
party. One `localStorage` key (`atelier-theme`) records the colour-scheme
preference and never leaves the browser.

# VRAXXIS

`ENTITY: UNRESOLVED / CLASSIFICATION: FAILED / PURPOSE: NON-CRITICAL / STATUS: OBSERVING`

A digital artefact that does not believe it is a website. Black, institutional,
diagnostic; it presents itself as an interface for something that was never
meant to be interacted with, and declines to say what.

The rule the whole build is held to: **the chaos is visual, the engineering is
disciplined.** Nothing here is random, nothing leaks, nothing is inaccessible
for the sake of being strange.

---

## Running it

```bash
npm install
npm run dev        # vite dev server
npm run build      # tsc -b && vite build  →  dist/
npm run preview    # serve the production build
```

No runtime dependencies beyond React. No fonts, images, audio files or
analytics are fetched — every plate, tone and texture is generated in the
browser.

---

## Architecture

```
src/
  main.tsx                     mount
  App.tsx                      composition of regions; active-region tracking
  styles/
    tokens.css                 the substrate: palette, type scale, grid,
                               deviation constants, motion curves
    global.css                 reset, shared primitives, focus, reduced motion
  system/
    SystemProvider.tsx         the runtime — observers, region visits,
                               discoveries, audio state, anomaly scheduler
    hooks.ts                   one shared rAF driver, pointer/size/visibility,
                               idle staging, transient latches
    rng.ts                     seeded determinism (xmur3 + mulberry32)
    lexicon.ts                 the complete vocabulary: every string lives here
    audio.ts                   synthesised presence (Web Audio, no files)
  components/
    Boot/          the perception check that precedes the interface
    Shell/         Bay (a labelled region) and Silence (an interval of nothing)
    Navigation/    VraxxisNavigation — coordinates, drift labels, inert nodes
    Hero/          the wordmark, split across the viewport, parallaxed apart
    Trace/         TraceLayer (canvas) and TraceBay (live readout + ledger)
    IndexSystem/   the register of thirteen entities and its fragments
    ObjectVX/      VX-000 — geometry.ts (the mesh and its violation) + canvas
    Memory/        the archive; plates.tsx generates every image as SVG
    NullSpace/     the quiet region
    Terminal/      REMNANT — a console that controls nothing
    Diagnostic/    DiagnosticText, Statement, SignalIndicator, CoordinateSystem
    Anomaly/       idle notices, resize notices, the hidden sequence
    Cursor/        the replaced pointer
    Grid/          the 12-column substrate, revealed with `g`
    Terminus/      the thing where a footer would be
```

### Systems worth knowing about

**One animation frame.** Every moving part subscribes to a single shared
`requestAnimationFrame` loop (`system/hooks.ts`). The page runs exactly one
rAF no matter how much is alive, and the loop stops itself when the last
subscriber leaves. Canvases suspend entirely when scrolled out of view.

**Nothing re-renders because a mouse moved.** Pointer position, object
rotation and scroll offset live in refs and are written straight to
`transform` or to the canvas. React state is reserved for things that change
a few times a minute.

**The clock is isolated.** The session counter ticks every second, so it sits
in its own context; the main runtime context holds only values that change
rarely. A tick re-renders the two components that display it and nothing else.

**Determinism, not randomness.** `system/rng.ts` seeds every "anomaly" from a
string. Which index row is misfiled on your third visit, where the objects in
NULL sit, which scan lines are missing from a memory plate — all reproducible,
none guessable.

**The grid is correct; the content is not.** `tokens.css` fixes three
deviation constants (7px, 13px, 3px) and those are the only amounts by which
anything is permitted to be wrong. Press `g` to see what everything is
measured against.

**VX-000 is not a cube.** `ObjectVX/geometry.ts` carries the full explanation.
In short: an eight-corner outer shell, a seven-corner inner shell with one
vertex simply absent, struts joining corners three places apart, and
alternating corners projected as though the solid were turned 13° further
than it is. It stays rigid and never breaks; it just cannot be resolved.

**Anomalies are rare on purpose.** The scheduler fires one channel every
14–41 seconds, and only for components currently mounted. If an observer can
feel a rhythm, the effect is already dead.

---

## Controls

| | |
|---|---|
| `g` | reveal the substrate grid |
| `Esc` / `Enter` / `Space` during boot | decline the check |
| `↑ ↑ ↓ ↓ ← → ← → v x` | VX / INTERNAL |
| the wordmark, seven times | it notices |
| VX-000, seven times | a second observer |
| REMNANT console | `help` lists what it recognises; everything else is accepted |
| `AUDIO: OFF` | synthesised presence, off until asked |

---

## Accessibility

Strangeness is not an excuse, and none of the following was traded away:

- Semantic document: one `h1`, a labelled `section` per region, real `nav`,
  `main` and `footer` landmarks, a skip link.
- Every control is a real `button`, `a` or form field, reachable and operable
  by keyboard. Navigating to a region moves focus there.
- Visible labels mutate on hover; accessible names do not. The console has a
  real label and a `role="log"` live region; index fragments are announced as
  they arrive.
- Pointer-only interactions all have a keyboard equivalent — VX-000 has
  *OPEN NEXT LAYER* and *TURN*, NULL has *SWEEP FIELD*, the memory track is a
  native scroll container.
- **Contrast:** `--vx-edge` and the hairline tokens are structural and never
  set type. The dimmest ink (`--vx-mute`) and the accent (`--vx-ox`) are both
  held above 4.5:1 on black, at every size used. The only text below that
  threshold is the two decorative, `aria-hidden` copies of the wordmark.
- `prefers-reduced-motion` removes drift, parallax, trace, shear and every
  scheduled anomaly, and shortens the boot check. What remains is the
  information, not the behaviour.

---

## Performance

- Composited transforms only; no layout is read or written during scroll.
- Canvases are DPR-aware, resize-observed, capped at 2× and suspended off screen.
- The trace layer retains at most 110 marks and retires them by age.
- The console keeps 90 lines and forgets the rest.
- Every listener, observer, timer, interval and audio node is cleaned up on
  unmount. No runaway intervals, no leaks.
- Production build: ~197 kB JS, ~32 kB CSS, uncompressed, React included.

---

`© VRAXXIS` — *whatever that means*

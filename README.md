# VRAXXIS

`ENTITY: UNRESOLVED / CLASSIFICATION: FAILED / PURPOSE: NON-CRITICAL / STATUS: OBSERVING`

## What this is

A digital artefact that does not believe it is a website.

It presents itself as the operating surface of something that was never meant
to be operated by a person — a register, an object, an archive that has
recovered nothing, a console with no privileges — and it declines, at every
point, to say what any of it is for. There is nothing to buy, nothing to sign
up to, nothing to discover more about. It is not a story and it is not a
puzzle: there is no ending and nothing to solve. It simply exists, keeps its
own time, and behaves as though it has been running for a while and will
carry on after you close the tab.

**What it is not:** it is not hacker-coded. No terminal green, no neon, no
Matrix rain, no glitch-art, no "cyber". The register was pointedly not built
as a shell — inputs are *filed under an ordinal*, the way an archive files
things, because a command prompt is what everybody reaches for and reaching
for it would have made this the same page as every other dark mysterious
site. The reference points are closer to a specimen sheet, a medical chart,
a machine's own diagnostic panel, and a filing system that outlived whatever
it was filing. Sterile and institutional rather than dark and dangerous. The
palette is near-black and dirty grey with a single oxidised orange that
appears perhaps four times a screen, and the whole thing is set at the
density of a technical document.

The intended feeling is not *ooh, mysterious.* It is: **something is
happening here, and it is not happening for me.**

The rule the whole build is held to: **the chaos is visual, the engineering is
disciplined.** Nothing here is random, nothing leaks, nothing is inaccessible
for the sake of being strange.

**VRAXXIS is the system.** No API, no key, no backend, no database, no
external runtime, no font host, no analytics, no third-party content. It
runs from a folder of static files with the network cable pulled out, and
where it appears to be communicating with something, that something is
fictional and lives in the same tab.

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
    SystemProvider.tsx         the runtime — temperament, rhythm, depth,
                               observers, region visits, discoveries, audio
    session.ts                 the per-visit seed everything variable hangs off
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
    Shell/Residue  fields of nothing, some of which are withholding something
    Anomaly/       idle notices, resize notices, the hidden sequence
    Cursor/        the replaced pointer
    Grid/          the 12-column substrate, revealed with `g`
    Terminus/      the thing where a footer would be
```

### The three things that make it feel occupied

**TEMPERAMENT — what it is inclined to do.** The runtime holds a disposition
for forty to seventy seconds at a time: indifferent, observant, impatient,
contradictory, accommodating. It is never named anywhere in the interface and
there is no character, mascot or narrator. It only decides *what kind* of
thing happens next, so a run of events reads as one disposition instead of a
shuffle. Two of the five are reactions to the observer — sustained
interaction makes it observant, a long silence makes it impatient — and the
rest are its own drift. Concretely: indifferent stops the register answering
to hover; observant makes the trace layer keep movement four times longer;
impatient turns VX-000 while nobody is touching it; contradictory makes a
readout report the opposite of itself for 1.9 seconds and then not; and
accommodating lifts a seal it has refused every time it was asked, shows what
is underneath, and reseals.

**RHYTHM — when it does anything at all.** Not a timer. The session alternates
long rests (34–96 seconds of nothing whatsoever) with short clusters of two
to four events a second or two apart. An even scatter reads as an interval;
a rest followed by a cluster reads as something deciding to act. Observed
over a 210-second unattended run: events at 24s, 68s, a cluster at 120–124s,
then 165s.

**DEPTH — how much of an interface it is still willing to be.** Every region
has a rank; the runtime tracks the furthest point the observer has reached,
and never lets it fall. A region presents itself at the *lesser* of the two,
which does two things at once: going deeper strips conventions, and coming
back changes what you left. The order in which things are withheld is the
auxiliary field, then the visible title, then the ordinal, then the alignment
to the measure itself. By the floor, the navigation rail is a column of
unlabelled marks and REMNANT has no header at all.

None of it is additive. Escalation here means *removing* familiar interface,
not stacking on effects.

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
string; `system/session.ts` mixes in one value drawn at load. Within a visit
everything is fixed and reproducible. Across visits: how many objects stand
in NULL and where, which statement holds the hero, which parts of a memory
plate failed to survive, which empty fields contain anything, when the one
fragment in a field appears, what temperament the session starts in, and the
rhythm it will keep. The architecture never varies — same regions, same
order, same behaviour. Only the anomalies move. That is the difference
between a system with a mood and a page with a random number generator in it.

**Empty space is withholding, not spacing.** The `Residue` fields between
regions each decide, before they are ever seen, whether they hold a 40px
boundary, a single pixel, a six-digit count advancing at its own pace, a
fragment that appears for 620ms once and never again, some combination, or
nothing at all. The last outcome is common. An empty area that always turns
out to contain something is a puzzle, and puzzles get solved; an area that
sometimes contains something is a place you are never finished looking at.

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
| — | it has no prompt: inputs are *filed* under an ordinal, as the register files everything |
| `AUDIO: OFF` | synthesised presence, off until asked |

---

## Accessibility

Strangeness is not an excuse, and none of the following was traded away:

- Semantic document: one `h1`, a labelled `section` per region, real `nav`,
  `main` and `footer` landmarks, a skip link.
- Every control is a real `button`, `a` or form field, reachable and operable
  by keyboard. Navigating to a region moves focus there.
- **Escalation withholds appearance, never information.** When a region stops
  printing its title the heading stays in the accessibility tree; when the
  rail stops printing its labels every node keeps its `aria-label`, and
  pointer *or keyboard focus* brings the visible name straight back. A screen
  reader is told exactly where it is at every depth — it simply cannot see
  the interface stop saying so. On a coarse pointer, which has no hover to
  recover a name with, the rail never strips past its ordinals and the mobile
  coordinate field always spells them out in full.
- Indifference suppresses *hover* responses only. Click, focus and Enter are
  never withdrawn — the system can decline to notice you, not to work.
- Touch: small controls keep their exact appearance and grow an invisible
  15px hit area on coarse pointers rather than inflating the type and
  dismantling the composition.
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
- `prefers-reduced-motion` removes drift, parallax, trace, shear, the
  temperament drift and the entire rhythm, and shortens the boot check. What remains is the
  information, not the behaviour.

---

## Craft notes

Things that are easy to get wrong and were not left wrong:

- **One tracking scale.** Letterspacing is a function of size, not a taste,
  and the function is inverse — small type opens because its counters close,
  display type closes because at 300px the default fit reads as a gap. Every
  tracking value in the build comes from `--tr-*` in `tokens.css`, so the
  whole page is spaced by one rule. There is exactly one deliberate
  exception, and it is commented as one.
- **`font-synthesis: none`.** Faux bold on a grotesk is the single most
  visible sign that nobody was watching the type.
- **Nothing is written to the DOM on a frame where it has not changed.** The
  live pointer readout assigns two text nodes only when the digits differ;
  a residue count that advances every 1.4 seconds is not written eighty-four
  times between advances; the cursor's coordinate is written on movement, not
  on frames.
- **Structural greys never set type.** `--vx-edge` and the hairline tokens
  draw rules, ticks and borders and nothing else, which is why the contrast
  audit comes back empty.
- **Figures never reflow.** Tabular numerals throughout, so a changing number
  cannot nudge the number beside it.
- **Statements are balanced, not filled.** They are the only prose on the
  page; a bad rag on them is visible from across a room.
- **The archive stops at the measure.** Bleeding the track wider put its last
  label under the document ruler, and a collision with a fixed overlay reads
  as a mistake. The cue that it continues is a cell cut in half at the edge.
- **No dead code.** The helpers, hooks and rules that the amendments made
  redundant were removed rather than left in place.

## Other forms

Two states most sites never consider, both handled explicitly:

- **`prefers-contrast: more`** lifts the ink and every hairline. VRAXXIS is
  built almost entirely out of near-black surfaces and 7%-opacity rules —
  exactly the kind of interface that dissolves under that setting.
- **`forced-colors: active`** restates every rule as a real border (a forced
  palette does not render a background as one), drops the apparatus that
  cannot survive it, and brings the hidden rail labels back as words, since
  the hairline standing in for them would not render.
- **Print** is not a screenshot. It is what an archive would hold if somebody
  had filed this: black on white, every region printing its name whatever
  depth it reached on screen, screen-only apparatus gone, `@page` margins.

## Performance

- Composited transforms only; no layout is read or written during scroll.
- Canvases are DPR-aware, resize-observed, capped at 2× and suspended off screen.
- The trace layer retains at most 110 marks and retires them by age.
- The console keeps 90 lines and forgets the rest.
- Every listener, observer, timer, interval and audio node is cleaned up on
  unmount. No runaway intervals, no leaks.
- Production build: ~206 kB JS, ~35 kB CSS, uncompressed, React included.
- Verified: zero network requests after load, at any depth, on any viewport.

---

`© VRAXXIS` — *whatever that means*

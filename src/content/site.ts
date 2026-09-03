/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH
 *
 * Two rules govern this file.
 *
 * 1. THE ICEBERG. Only SURFACE_STACK is shown unprompted. Everything else is
 *    reached by exploring — a facet opened, a project taken apart. Technology
 *    should feel earned through context, never dumped on the screen.
 *
 * 2. PRIVACY. No telephone number, no street address and no email address
 *    appears anywhere in this file, in the rendered markup, or in the client
 *    bundle. The delivery address lives in a server-side environment variable
 *    and is read only inside the API route. See src/app/api/channel/route.ts.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const SITE = {
  url: "https://princey.dev",
  domain: "princey.dev",
  name: "Prince Chipango",
  handle: "princey",
  roles: [
    "Full-Stack Developer",
    "Frontend Engineer",
    "AI / Agentic Systems Developer",
  ] as const,
  /** The only location ever published. */
  location: "United Kingdom",
  country: "GB",
  philosophy: "I care about how things feel, not just how they work.",
  /**
   * The opening claim, set under the three disciplines so that "not three
   * jobs" has the three sitting directly above it.
   */
  thesis:
    "work across the whole surface of a product: the interface someone touches, the API it speaks to, the schema underneath, the pipeline that ships it, and the agentic layer that lets software act rather than merely answer. Not three jobs but one system, and the seams between those parts are where products usually fail.",
  manifesto:
    "I build software from the interface down to the infrastructure. Products that feel effortless at 60fps, remain useful when the network is slow, behave properly on mobile Safari, and stay understandable long after the first deployment.",
  signature: ["Build it beautifully.", "Make it behave."] as const,
  footnote: "Still experimenting.",
} as const;

/**
 * The waterline. Six names, and no more, anywhere above the fold.
 */
export const SURFACE_STACK = [
  "React",
  "Next.js",
  "TypeScript",
  "Node",
  "PostgreSQL",
  "AI",
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   THE TOOLBOX
   Six objects. Each is a capability first and a technology list second — and
   the list only exists once someone has asked for it.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Facet = {
  id: string;
  verb: string;
  domain: string;
  /** What this actually means, in one sentence. Never a list. */
  claim: string;
  /** At most three. These are the only names shown when a facet opens. */
  primary: string[];
  /** Reached by a second, quieter click. */
  secondary: string[];
  /** The margin note. */
  aside: string;
};

export const TOOLBOX: Facet[] = [
  {
    id: "build",
    verb: "Build",
    domain: "Frontend / Full Stack",
    claim: "Interfaces that stay fast, responsive and composed under pressure.",
    primary: ["React", "Next.js", "TypeScript"],
    secondary: [
      "Angular",
      "Vue",
      "Tailwind CSS",
      "Jest",
      "React Testing Library",
      "Component systems",
    ],
    aside: "composed under pressure",
  },
  {
    id: "move",
    verb: "Move",
    domain: "Animation / Interaction",
    claim:
      "Motion with mass. If it does not communicate position or cause, it does not ship.",
    primary: ["GSAP", "Motion", "Rapier"],
    secondary: [
      "Scroll-linked timelines",
      "Compositor-only transforms",
      "Spring dynamics",
      "Reduced-motion paths",
    ],
    aside: "it has weight",
  },
  {
    id: "think",
    verb: "Think",
    domain: "AI / Agents",
    claim:
      "Software that reasons, chooses a tool, and is graded on what it actually did.",
    primary: ["Python", "LLM APIs", "Agents"],
    secondary: [
      "RAG",
      "Vector search",
      "Tool calling",
      "Structured outputs",
      "Memory",
      "Evaluation pipelines",
    ],
    aside: "it decides",
  },
  {
    id: "store",
    verb: "Store",
    domain: "Data / Infrastructure",
    claim: "A schema that refuses to represent an invalid state.",
    primary: ["PostgreSQL", "Node", "REST"],
    secondary: [
      "MySQL",
      "Express",
      "Indexing",
      "Query plans",
      "Caching",
      "Migrations",
    ],
    aside: "let the database refuse",
  },
  {
    id: "protect",
    verb: "Protect",
    domain: "Auth / Security",
    claim: "Access decided in one place and enforced everywhere else.",
    primary: ["JWT", "RBAC", "Sessions"],
    secondary: ["Token rotation", "CSRF", "Rate limiting", "Audit trails"],
    aside: "one place, not twelve",
  },
  {
    id: "ship",
    verb: "Ship",
    domain: "Deployment / Production",
    claim: "Boring deploys. Loud failures.",
    primary: ["CI/CD", "Docker", "Vercel"],
    secondary: [
      "Environment parity",
      "Gated migrations",
      "Rollback paths",
      "Observability",
    ],
    aside: "boring on purpose",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   WHAT I BUILD
   Four shipped systems, each publicly reachable. Every fact below is sourced
   from the project's own machine-readable disclosure (llms.txt, security.txt)
   or its live pages. Nothing here is estimated.

   `reveals` are the names that only exist once the hood is open. They become
   the traces that resurface later in the margins.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Project = {
  index: string;
  name: string;
  kind: string;
  /** The surface. One line. Nothing technical. */
  line: string;
  /** Where it lives. Never printed: some of these are still on a host's
   *  subdomain, and a URL is not the name of a piece of work. */
  href: string;
  /** What the control says instead. A verb, and what it opens. */
  action: string;
  /** The city the work was built for. */
  place: string;
  /** Whatever else is worth knowing about who it belongs to. */
  note?: string;
  /** Named only under the hood. */
  reveals: string[];
  /** The blueprint. Four entries, never more. */
  strata: { label: string; body: string }[];
  /** The engineer's note on the blueprint. */
  handNote: string;
  /** Which engraved plate stands in for the system. */
  plate: "schema" | "seal" | "topology" | "botanical";
};

export const PROJECTS: Project[] = [
  {
    index: "01",
    name: "Swagrush",
    plate: "schema",
    kind: "Full-stack platform",
    line: "You can count the field and work out your own odds before you enter.",
    href: "https://swagrush.app",
    action: "Enter the floor",
    place: "Johannesburg",
    note: "Swagrush (Pty) Ltd",
    reveals: ["Next.js", "PostgreSQL", "JWT", "RBAC", "Ledger", "SHA-256"],
    strata: [
      {
        label: "Surface",
        body: "A digital asset library and a competition floor in one product, across three membership tiers. Every entry carries a unique sequential number and the field size is published, so a member can calculate their own probability rather than take one on trust.",
      },
      {
        label: "Boundary",
        body: "Two currencies with a fixed conversion, and a wallet that keeps a full transaction ledger rather than a running total. Only credits earned through real purchases convert. Access is restricted to one country and enforced at the platform level, not in the interface.",
      },
      {
        label: "Floor",
        body: "Draws come from a cryptographically secure generator and are sealed with SHA-256. A free postal entry route is always open, and postal entries are assigned numbers equivalent to paid ones, so the two are indistinguishable in the draw.",
      },
      {
        label: "Consequence",
        body: "Built to a regulatory shape, not decorated with one. It sits under Consumer Protection Act Section 32 as a promotional competition, with independent verification of draws under Section 36. The compliance constraints are the architecture.",
      },
    ],
    handNote: "the ledger is the product",
  },
  {
    index: "02",
    name: "Quorbel",
    plate: "seal",
    kind: "Cryptographic infrastructure",
    line: "Anyone can replay the draw and check it themselves. Offline. Forever.",
    href: "https://quorbel.com",
    action: "Verify a receipt",
    place: "Manchester",
    reveals: ["Ed25519", "SHA-256", "CSPRNG", "Canonical JSON", "BigInt"],
    strata: [
      {
        label: "Surface",
        body: "A verification tool that needs no account. Paste a receipt and the page replays the whole derivation in front of you. There is also a step by step simulator of the masking loop, because a claim you cannot watch happen is just a claim.",
      },
      {
        label: "Boundary",
        body: "Results derive from 256 bits of operating system entropy, the same source used for TLS handshakes. An iterated SHA-256 masking loop over BigInt arithmetic lands a uniform integer in the operator's range with zero modulo bias.",
      },
      {
        label: "Floor",
        body: "The whole record, inputs and entropy consumed and result, is serialised as canonical JSON with fields sorted alphabetically, hashed, then signed with Ed25519. The signature covers the raw JSON bytes rather than the hash, so there is no second preimage to argue about.",
      },
      {
        label: "Consequence",
        body: "The receipt is self contained. Verification never contacts Quorbel, which means the platform going away does not invalidate a single past draw. Trust is measured, not asserted.",
      },
    ],
    handNote: "verify, then trust",
  },
  {
    index: "03",
    name: "Weston Warriors",
    plate: "topology",
    kind: "Interface / WebGL",
    line: "A boxing club rendered as particles, from a crumbling colosseum into a ring.",
    href: "https://weston-warriors.vercel.app",
    action: "Step into the ring",
    place: "Weston-super-Mare",
    reveals: ["three.js", "WebGL", "Vertex shaders", "Two-bone IK", "Web Audio"],
    strata: [
      {
        label: "Surface",
        body: "One page, one idea: untamed grit resolving into tamed mastery. A particle field morphs with scroll through three baked position sets, blended in a vertex shader rather than swapped.",
      },
      {
        label: "Boundary",
        body: "A second scene renders a sparring round between two particle bound skeletal rigs, with two-bone inverse kinematics on every limb, so the two fighters genuinely move in different styles instead of playing the same clip.",
      },
      {
        label: "Floor",
        body: "Static single page. No build step and no framework, with three.js vendored locally rather than pulled from a CDN at run time. Nothing between the source and the browser.",
      },
      {
        label: "Consequence",
        body: "Every sound is synthesised at run time through the Web Audio API. No audio files ship at all, and each landed punch is placed in the stereo field where it happened.",
      },
    ],
    handNote: "no audio files shipped",
  },
  {
    index: "04",
    name: "How to Bag a Billionaire's Daughter",
    plate: "botanical",
    kind: "Single-book shop",
    line: "One book, one author, zero clarity, sold from inside a physics playground.",
    href: "https://htbabd.vercel.app",
    action: "Open the shop",
    place: "London",
    note: "Standalone",
    reveals: ["Three.js", "Rapier", "GSAP", "Canvas", "Local-only state"],
    strata: [
      {
        label: "Surface",
        body: "A bookshop for exactly one title, built as a single page. The cover is a real object you can drag and throw, and it comes back. Where 3D is unavailable a drawn cover takes its place rather than a blank frame.",
      },
      {
        label: "Boundary",
        body: "No image assets ship. The cover, the interior plates and every prop are drawn at run time on canvas, which is why the whole shop weighs almost nothing and never waits on a picture.",
      },
      {
        label: "Floor",
        body: "A reading room running a genuine physics engine: click to detonate, drag to relocate. The whisper wall keeps what visitors leave in their own browser, and nothing is transmitted anywhere.",
      },
      {
        label: "Consequence",
        body: "Editions that are not finished say so plainly and point at one that is. The checkout is a demonstration and says that too, on its face, rather than taking details it has no use for.",
      },
    ],
    handNote: "it is a place where a book lives",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MEASURED
   Only figures that can be stood behind.
   ═══════════════════════════════════════════════════════════════════════════ */

export const NUMERALS = [
  { value: "03", label: "Years of experience", note: "solid ones" },
  { value: "09+", label: "Live applications", note: "shipped and in use" },
  { value: "60", label: "FPS target", note: "compositor-only motion" },
  { value: "AA", label: "Accessibility", note: "WCAG 2.2 conformance target" },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   THE AGENT
   Three stages at rest. Four more on request. The architecture last.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Stage = {
  id: string;
  name: string;
  /** Shown only at depth ≥ 1. */
  note: string;
  /** 0 = always visible · 1 = revealed on expand */
  depth: 0 | 1;
};

export const AGENT_STAGES: Stage[] = [
  { id: "perceive", name: "Perceive", depth: 0, note: "Read the task. Decide what is actually being asked." },
  { id: "retrieval", name: "Retrieval", depth: 1, note: "Fetch only what the answer needs. Context is a budget." },
  { id: "think", name: "Think", depth: 0, note: "Plan a route. Consider the branches that will be discarded." },
  { id: "tools", name: "Tools", depth: 1, note: "Typed function calls. Schema in, schema out." },
  { id: "act", name: "Act", depth: 0, note: "Execute against real infrastructure. Reversible, or gated." },
  { id: "memory", name: "Memory", depth: 1, note: "Persist what will matter later. Forget what will not." },
  { id: "evaluation", name: "Evaluation", depth: 1, note: "Grade the trace. Feed the result back upstream." },
];

/** Revealed only at the deepest level. */
export const AGENT_ARCHITECTURE = [
  {
    k: "Bounded state",
    v: "A run is a state machine with a terminal condition. Retries decrement a budget; nothing loops forever because a model felt uncertain.",
  },
  {
    k: "Typed edges",
    v: "Every boundary the model touches has a schema on both sides. Malformed output is a caught error, not a corrupted downstream write.",
  },
  {
    k: "Human in the loop",
    v: "Irreversible actions stop and wait. The gate is part of the architecture, not a setting someone can forget to switch on.",
  },
  {
    k: "Legible failure",
    v: "When it goes wrong the trace says which stage, on which input, with which tool. Silence is the one unacceptable outcome.",
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE
   ═══════════════════════════════════════════════════════════════════════════ */

export const PRINCIPLES = [
  {
    n: "i",
    title: "The interface is the contract",
    body: "If the screen says it happened, it happened.",
  },
  {
    n: "ii",
    title: "Constraints belong in the schema",
    body: "An invariant enforced only in application code is a suggestion.",
  },
  {
    n: "iii",
    title: "Motion must have mass",
    body: "Animation that communicates nothing is decoration, and decoration costs frames.",
  },
  {
    n: "iv",
    title: "Slow networks are the default",
    body: "Build for one bar of signal. The fast case takes care of itself.",
  },
  {
    n: "v",
    title: "AI is a systems discipline",
    body: "Probabilistic components need the same rigour as any other.",
  },
  {
    n: "vi",
    title: "Legibility outlives cleverness",
    body: "The code will be read by someone tired. Write for them.",
  },
] as const;

export const FOOTER_STACK = SURFACE_STACK;

/* ═══════════════════════════════════════════════════════════════════════════
   AMBIENT READOUT
   The quiet status line. It changes; it never demands attention.
   ═══════════════════════════════════════════════════════════════════════════ */

export const READOUT = [
  "SYSTEM NOMINAL",
  "GLASS · STABLE",
  "SOLVER · RUNNING",
  "MOTION · COMPOSITED",
  "GRID · 12 COL",
  "CHANNEL · IDLE",
  "STILL EXPERIMENTING",
] as const;

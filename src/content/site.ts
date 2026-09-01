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
  manifesto:
    "I build software from the interface down to the infrastructure — products that feel effortless at 60fps, remain useful when the network is slow, behave properly on mobile Safari, and stay understandable long after the first deployment.",
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
   The projects carry the skillset. Surface is beautiful; depth is technical.
   `reveals` are the names that only exist once the hood is open — they are
   recorded as traces and resurface later in the margins.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Project = {
  index: string;
  name: string;
  kind: string;
  /** The surface. One line. Nothing technical. */
  line: string;
  /** Named only under the hood. */
  reveals: string[];
  /** The blueprint. Four entries, never more. */
  strata: { label: string; body: string }[];
  /** The engineer's note on the blueprint. */
  note: string;
  href?: string;
};

export const PROJECTS: Project[] = [
  {
    index: "01",
    name: "The Ledger",
    kind: "Full-stack system",
    line: "Money moves. Nothing is ever quietly wrong.",
    reveals: ["JWT", "RBAC", "REST API", "PostgreSQL", "Audit trail"],
    strata: [
      {
        label: "Surface",
        body: "Server components on the read path, optimistic mutations reconciled on the client. The screen never claims something happened before it did.",
      },
      {
        label: "Boundary",
        body: "Typed request and response contracts. Validation at the edge, never buried in a handler. Roles resolved once, enforced on every route.",
      },
      {
        label: "Floor",
        body: "Normalised core with covering indexes on the two hot reads. Constraint-first: the invariants live where the database can refuse them.",
      },
      {
        label: "Consequence",
        body: "Every destructive action is reversible or confirmed. The audit trail is append-only, so history cannot be edited into a better story.",
      },
    ],
    note: "the schema is the argument",
  },
  {
    index: "02",
    name: "Kinetic Surface",
    kind: "Interface system",
    line: "It responds before you finish reaching for it.",
    reveals: ["GSAP", "Motion", "Rapier", "Zero-CLS", "React Testing Library"],
    strata: [
      {
        label: "Surface",
        body: "A component system built to be inherited: predictable props, and every state — loading, empty, error, focus — drawn before the happy path.",
      },
      {
        label: "Motion",
        body: "Transform and opacity only. Physics runs in a real solver and writes nothing but transforms, so layout is never touched and frames are never dropped.",
      },
      {
        label: "Floor",
        body: "Read models shaped to the interface rather than the interface bent around the tables. One round trip renders a screen.",
      },
      {
        label: "Consequence",
        body: "Zero cumulative layout shift by construction. The keyboard path is verified before a hover state is drawn, and reduced motion is a real path, not a switch that disables the site.",
      },
    ],
    note: "60fps is a promise, not a benchmark",
  },
  {
    index: "03",
    name: "The Workshop",
    kind: "Agentic system",
    line: "You describe the outcome. It does the work and shows you how.",
    reveals: ["Python", "Agents", "Tool calling", "RAG", "Vector search"],
    strata: [
      {
        label: "Surface",
        body: "A laboratory notebook rather than a chat window: run history, intermediate reasoning, tool traces, and an explicit gate before anything irreversible.",
      },
      {
        label: "Boundary",
        body: "Every tool is a typed function with a schema. The model is handed capabilities, never an unbounded shell.",
      },
      {
        label: "Floor",
        body: "Run state and audit in Postgres, retrieval in a vector store. Embeddings are versioned with the chunking strategy that produced them.",
      },
      {
        label: "Consequence",
        body: "Retrieval is budgeted; context is a resource, not a dumping ground. Failure is a first-class state with a legible explanation, never a silent retry.",
      },
    ],
    note: "graded on the trace, not the vibe",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MEASURED
   Only figures that can be stood behind.
   ═══════════════════════════════════════════════════════════════════════════ */

export const NUMERALS = [
  { value: "09+", label: "Live applications", note: "shipped and in use" },
  { value: "60", label: "FPS target", note: "compositor-only motion" },
  { value: "AA", label: "Accessibility", note: "WCAG 2.2 conformance target" },
  { value: "100%", label: "Ownership of the stack", note: "interface → infrastructure" },
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

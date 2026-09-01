/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH
 * Every string the site renders originates here. Nothing is invented at the
 * component layer; nothing unverifiable is displayed.
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
  location: "Weston-super-Mare, UK",
  locality: "Weston-super-Mare",
  region: "England",
  country: "GB",
  phone: "+44 7823 977850",
  phoneHref: "+447823977850",
  email: "princethree@tuta.io",
  philosophy: "I care about how things feel, not just how they work.",
  manifesto:
    "I build software from the interface down to the infrastructure — products that feel effortless at 60fps, remain useful when the network is slow, behave properly on mobile Safari, and stay understandable long after the first deployment.",
  agenticStance:
    "I don't just integrate AI APIs. I design systems in which AI can perceive, reason, use tools, execute workflows and interact with software infrastructure.",
  signature: ["Build it beautifully.", "Make it behave."] as const,
  footnote: "Still experimenting.",
} as const;

/* ── Hero fragments: floating labels inside the optical system ──────────── */

export const HERO_FRAGMENTS = [
  "REACT",
  "NEXT.JS",
  "TYPESCRIPT",
  "NODE.JS",
  "POSTGRESQL",
  "PYTHON",
  "AI AGENTS",
  "RAG",
  "LLM SYSTEMS",
  "AUTOMATION",
  "API ARCHITECTURE",
  "RAPIER PHYSICS",
] as const;

/* ── The three connected rooms ─────────────────────────────────────────── */

export type Discipline = {
  index: string;
  title: string;
  epithet: string;
  aside: string;
  precis: string;
  groups: { label: string; items: string[] }[];
  signature: string;
};

export const DISCIPLINES: Discipline[] = [
  {
    index: "01",
    title: "Full-Stack Engineering",
    epithet: "The Victorian Engineer Behind Glass",
    aside: "one organism, not two codebases",
    precis:
      "The stack as a single breathing organism. Interface, transport, persistence and deployment are not separate disciplines — they are one system with one set of failure modes, and I am responsible for all of them.",
    groups: [
      {
        label: "Interface & Runtime",
        items: ["React", "Next.js", "TypeScript", "Node.js", "Express"],
      },
      {
        label: "Transport",
        items: ["REST APIs", "API architecture", "Caching", "Rate design"],
      },
      {
        label: "Persistence",
        items: [
          "PostgreSQL",
          "MySQL",
          "Database architecture",
          "Schema design",
          "Indexing",
          "Query optimisation",
        ],
      },
      {
        label: "Identity",
        items: ["Authentication", "JWT", "RBAC", "Session strategy"],
      },
      {
        label: "Delivery",
        items: ["Deployment", "CI/CD", "Environment parity", "Observability"],
      },
    ],
    signature:
      "A dashboard where every widget is a glass pane physically connected by visible springs — drag one, and the others adjust with simulated tension, never breaking the grid.",
  },
  {
    index: "02",
    title: "Frontend Craft",
    epithet: "The Kinetic Surrealist",
    aside: "the browser is a physics sandbox",
    precis:
      "Sixty frames per second is not a benchmark, it is a promise. Layout does not shift. Focus does not vanish. The thing behaves the same on a flagship desktop and on a four-year-old iPhone with one bar of signal.",
    groups: [
      {
        label: "Core",
        items: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      },
      {
        label: "Also shipped with",
        items: ["Angular", "Vue"],
      },
      {
        label: "Access",
        items: ["Accessibility", "WCAG AA", "Keyboard paths", "Reduced motion"],
      },
      {
        label: "Reach",
        items: [
          "Responsive design",
          "Cross-browser engineering",
          "Mobile Safari optimisation",
        ],
      },
      {
        label: "Proof",
        items: ["Jest", "React Testing Library", "Component systems"],
      },
      {
        label: "Performance",
        items: [
          "Performance engineering",
          "Zero-layout-shift interfaces",
          "Compositor-only motion",
        ],
      },
    ],
    signature:
      "A hero where the headline is rendered as physical glass. Scroll velocity becomes wind; the characters drift, collide, and settle back into the grid.",
  },
  {
    index: "03",
    title: "AI / Agentic Systems",
    epithet: "The Bohemian Conductor of Ghosts",
    aside: "software that can decide",
    precis:
      "An agent is a distributed system with a probabilistic scheduler. It needs the same things any production system needs: bounded state, typed contracts at every edge, retries that terminate, an audit trail, and a human who can intervene.",
    groups: [
      {
        label: "Foundation",
        items: ["Python", "LLM APIs", "Structured outputs", "Function calling"],
      },
      {
        label: "Agency",
        items: [
          "AI agents",
          "Agent orchestration",
          "Tool calling",
          "Workflow automation",
        ],
      },
      {
        label: "Knowledge",
        items: [
          "RAG systems",
          "Vector databases",
          "Embeddings",
          "Memory systems",
        ],
      },
      {
        label: "Rigour",
        items: [
          "Evaluation pipelines",
          "Prompt engineering",
          "Human-in-the-loop systems",
          "AI-powered applications",
        ],
      },
    ],
    signature:
      "An orchestration surface where each agent is a glass orb with internal refraction. Two agents collaborate, merge into a single dispersion flare, then split — leaving a shared memory orb that fades into the background. Archived, not forgotten.",
  },
];

/* ── Measured claims. Nothing here is a metric I cannot stand behind. ───── */

export const NUMERALS = [
  { value: "09+", label: "Live applications", note: "shipped and in use" },
  { value: "60", label: "FPS target", note: "compositor-only motion" },
  { value: "AA", label: "Accessibility", note: "WCAG 2.2 conformance target" },
  { value: "100%", label: "Ownership of the stack", note: "interface → infrastructure" },
] as const;

export const CREDIBILITY = [
  "60fps interaction design",
  "Responsive layouts",
  "Mobile Safari compatibility",
  "Accessibility",
  "API reliability",
  "Database optimisation",
  "Authentication systems",
  "Production deployments",
  "Testing",
  "Cross-browser support",
] as const;

/* ── Projects ───────────────────────────────────────────────────────────────
 * NOTE FOR PRINCE: these entries describe the *archetypes* of systems in the
 * shipped set. They deliberately carry no client names, no invented URLs and
 * no unverifiable metrics. Replace `name`, `year` and add a `href` per entry
 * as each project becomes publicly referenceable — the exhibition layout
 * takes any number of entries.
 * ─────────────────────────────────────────────────────────────────────────── */

export type Project = {
  index: string;
  name: string;
  kind: "LIVE APPLICATION" | "FULL-STACK SYSTEM" | "AI / AUTOMATION";
  summary: string;
  href?: string;
  strata: { label: string; body: string }[];
};

export const PROJECTS: Project[] = [
  {
    index: "01",
    name: "Ledger-Class Application",
    kind: "FULL-STACK SYSTEM",
    summary:
      "A transactional product where correctness is non-negotiable: role-scoped access, an append-only audit trail, and a schema that refuses to represent an invalid state.",
    strata: [
      {
        label: "Frontend",
        body: "Next.js App Router, TypeScript, server components for read paths, optimistic mutations with reconciliation on the client.",
      },
      {
        label: "Backend",
        body: "Node.js / Express service boundary. Typed request and response contracts; validation at the edge, never in the handler body.",
      },
      {
        label: "Database",
        body: "PostgreSQL. Normalised core with covering indexes on the two hot read paths; constraint-first design so invariants live in the schema.",
      },
      {
        label: "Infrastructure",
        body: "CI on every push, migrations gated behind review, environment parity between preview and production.",
      },
      {
        label: "Performance",
        body: "Query plans reviewed before merge. Cache keyed on entity version rather than time, so invalidation is deterministic.",
      },
      {
        label: "Design decisions",
        body: "Every destructive action is reversible or confirmed. The interface never lies about state it has not yet persisted.",
      },
    ],
  },
  {
    index: "02",
    name: "Interface Systems Work",
    kind: "LIVE APPLICATION",
    summary:
      "Component systems built to be inherited: predictable props, documented states, and motion that survives a slow device and a reduced-motion preference.",
    strata: [
      {
        label: "Frontend",
        body: "React and TypeScript. Composition over configuration; every component ships its loading, empty, error and focus states.",
      },
      {
        label: "Backend",
        body: "Thin, cache-aware API surface. The client never orchestrates more than one round trip to render a screen.",
      },
      {
        label: "Database",
        body: "Read models shaped to the interface rather than the interface shaped to the tables.",
      },
      {
        label: "Infrastructure",
        body: "Preview deployments per branch. Visual and unit regression run before anything reaches main.",
      },
      {
        label: "Performance",
        body: "Zero cumulative layout shift by construction — reserved space, no late-loading fonts, transform-and-opacity animation only.",
      },
      {
        label: "Design decisions",
        body: "Tested with Jest and React Testing Library against behaviour, not implementation. Keyboard path verified before hover states are drawn.",
      },
    ],
  },
  {
    index: "03",
    name: "Agentic Workflow Engine",
    kind: "AI / AUTOMATION",
    summary:
      "A system in which a language model does not merely answer — it perceives a task, plans, calls tools, writes to memory, and is graded on what it actually did.",
    strata: [
      {
        label: "Frontend",
        body: "A laboratory notebook rather than a chat window: run history, intermediate reasoning, tool traces, and an explicit approval gate.",
      },
      {
        label: "Backend",
        body: "Python orchestration. Every tool is a typed function with a schema; the model is never handed an unbounded shell.",
      },
      {
        label: "Database",
        body: "PostgreSQL for run state and audit, a vector store for retrieval. Embeddings are versioned alongside the chunking strategy that produced them.",
      },
      {
        label: "AI architecture",
        body: "Perception → reasoning → tool selection → action → memory → evaluation. Each stage is independently observable and independently replaceable.",
      },
      {
        label: "Performance",
        body: "Streamed structured output so the interface fills progressively. Retrieval is budgeted; context is a resource, not a dumping ground.",
      },
      {
        label: "Design decisions",
        body: "Human-in-the-loop by default on any irreversible action. Failure is a first-class state with a legible explanation, never a silent retry.",
      },
    ],
  },
];

/* ── The agent as a physical machine ───────────────────────────────────── */

export const AGENT_STAGES = [
  {
    id: "input",
    name: "Input",
    note: "A task arrives. Bounded, typed, attributable.",
  },
  {
    id: "perception",
    name: "Perception",
    note: "Parse, classify, retrieve. Decide what is actually being asked.",
  },
  {
    id: "reasoning",
    name: "Reasoning",
    note: "Plan a route. Consider the branches that will be discarded.",
  },
  {
    id: "tools",
    name: "Tools",
    note: "Typed function calls. Schema in, schema out, no unbounded surface.",
  },
  {
    id: "actions",
    name: "Actions",
    note: "Execute against real infrastructure. Reversible, or gated.",
  },
  {
    id: "memory",
    name: "Memory",
    note: "Persist what will matter later. Forget what will not.",
  },
  {
    id: "evaluation",
    name: "Evaluation",
    note: "Grade the trace, not the vibe. Feed the result back upstream.",
  },
] as const;

export const AGENT_CAPABILITIES = [
  "Research",
  "Classification",
  "Planning",
  "Document analysis",
  "Workflow execution",
  "API interaction",
  "Data retrieval",
  "Monitoring",
  "Decision support",
  "Automation",
] as const;

/* ── Résumé: a Swiss publication in seven movements ────────────────────── */

export const RESUME_SECTIONS = [
  { index: "01", title: "Profile" },
  { index: "02", title: "Core Stack" },
  { index: "03", title: "Experience" },
  { index: "04", title: "Projects" },
  { index: "05", title: "AI Systems" },
  { index: "06", title: "Engineering Principles" },
  { index: "07", title: "Contact" },
] as const;

export const PRINCIPLES = [
  {
    n: "i",
    title: "The interface is the contract",
    body: "If the screen says it happened, it happened. State that has not been persisted is never rendered as though it has.",
  },
  {
    n: "ii",
    title: "Constraints belong in the schema",
    body: "An invariant enforced only in application code is a suggestion. Put it where the database can refuse.",
  },
  {
    n: "iii",
    title: "Motion must have mass",
    body: "Animation that does not communicate position, causality or hierarchy is decoration, and decoration costs frames.",
  },
  {
    n: "iv",
    title: "Slow networks are the default",
    body: "Build for one bar of signal on a four-year-old phone. The fast case takes care of itself.",
  },
  {
    n: "v",
    title: "AI is a systems discipline",
    body: "Probabilistic components need the same rigour as any other: typed edges, bounded retries, an audit trail, a human who can intervene.",
  },
  {
    n: "vi",
    title: "Legibility outlives cleverness",
    body: "The code will be read long after the first deployment, most often by someone tired. Write for them.",
  },
] as const;

export const EXPERIENCE = [
  {
    period: "Present",
    title: "Independent Full-Stack & Agentic Systems Engineer",
    place: SITE.location,
    body: "End-to-end delivery: interface architecture, API and schema design, authentication and access control, deployment pipelines, and AI systems that use tools and execute workflows rather than merely answering.",
    tags: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "Python", "LLM systems"],
  },
  {
    period: "Ongoing",
    title: "Frontend Craft Practice",
    place: "Component systems, performance, accessibility",
    body: "Design systems built to be inherited. Accessibility to WCAG AA, cross-browser and mobile Safari verification, zero-layout-shift construction, and behaviour-first testing with Jest and React Testing Library.",
    tags: ["React", "Angular", "Vue", "Tailwind CSS", "Jest", "RTL"],
  },
  {
    period: "Ongoing",
    title: "AI Agent Laboratory",
    place: "Orchestration, retrieval, evaluation",
    body: "Agent architectures with typed tool surfaces, retrieval budgets, memory strategies and evaluation pipelines. Human-in-the-loop gating on anything irreversible.",
    tags: ["Agent orchestration", "RAG", "Vector databases", "Evaluation", "Automation"],
  },
] as const;

export const FOOTER_STACK = [
  "REACT",
  "NEXT.JS",
  "TYPESCRIPT",
  "NODE",
  "POSTGRESQL",
  "PYTHON",
  "AI",
] as const;

import {
  AGENT_ARCHITECTURE,
  AGENT_STAGES,
  NUMERALS,
  PRINCIPLES,
  PROJECTS,
  SITE,
  SURFACE_STACK,
  TOOLBOX,
  type Project,
} from "@/content/site";
import {
  BotanicalDiagram,
  CornerLeaf,
  EngravedRule,
  Flourish,
  CoordinateRose,
  HandUnderline,
  SchemaPlate,
  SealPlate,
  TopologyPlate,
  VineSegment,
  WovenRule,
} from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SHEET
 *
 * What comes out of the printer: a four-page engraved document, not a paper
 * photograph of a screen. It is `display: none` on screen, which keeps it out
 * of the accessibility tree as well as out of sight, and on paper it is the
 * only thing that exists.
 *
 * Pagination is explicit. Browsers do not implement the CSS margin boxes that
 * would let `@page` print its own folio, so each page is a box of known height
 * with its own head and foot, broken after. That costs a little rigidity and
 * buys running heads, hand-numbered folios and the certainty that a plate is
 * never sliced in half by a page break.
 *
 * Everything is drawn in strokes and coloured type rather than in filled
 * panels, because "background graphics" is off by default in every print
 * dialog there is. Turn it on and the paper gains its cream ground; leave it
 * off and not one rule, ornament or accent is lost.
 *
 * Every word is read from the same content file the site is built from, so the
 * document cannot drift out of step with the website it came from.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const PLATES = {
  schema: SchemaPlate,
  seal: SealPlate,
  topology: TopologyPlate,
  botanical: BotanicalDiagram,
} as const;

const FOLIO = ["i", "ii", "iii", "iv", "v"] as const;

function Page({
  n,
  title,
  children,
  last,
  catalogue,
  spread,
}: {
  n: 0 | 1 | 2 | 3 | 4;
  title: string;
  children: React.ReactNode;
  last?: boolean;
  catalogue?: boolean;
  spread?: boolean;
}) {
  return (
    <article
      className={`pg${last ? " pg-last" : ""}${
        catalogue || spread ? " pg-spread" : ""
      }`}
    >
      <header className="pg-head">
        <span className="pg-head-mark">{SITE.domain}</span>
        <EngravedRule className="pg-head-rule" />
        <span className="pg-head-title">{title}</span>
      </header>

      <div className="pg-body">{children}</div>

      <footer className="pg-foot">
        <span className="pg-foot-name">{SITE.name}</span>
        <span className="pg-folio">{FOLIO[n]}</span>
        <span className="pg-foot-of">of five</span>
      </footer>
    </article>
  );
}

/** One entry in the catalogue: the plate on the left, the reading on the right. */
function Entry({ p }: { p: Project }) {
  const Plate = PLATES[p.plate];
  return (
    <article className="pw">
      <figure className="pw-fig">
        <Plate className="pw-plate" />
        <figcaption className="pw-fig-cap">
          Fig. {p.index} &middot; {p.name}
        </figcaption>
      </figure>

      <div className="pw-read">
        <p className="pw-kind">
          {p.kind}
          <span className="pg-sep">/</span>
          {p.place}
          {p.note ? (
            <>
              <span className="pg-sep">/</span>
              {p.note}
            </>
          ) : null}
        </p>
        <h3 className="pw-name">
          <span className="pw-n">{p.index}</span>
          {p.name}
        </h3>
        <p className="pw-line">{p.line}</p>

        {/* The whole blueprint. On the site this is behind "under the
            hood"; on paper the hood is already open. */}
        {p.strata.map((st) => (
          <p key={st.label} className="pw-strata">
            <b>{st.label}.</b> {st.body}
          </p>
        ))}

        <p className="pw-reveals">
          {p.reveals.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </p>
        <p className="pw-hand">{p.handNote}</p>
      </div>
    </article>
  );
}

export function Sheet() {
  return (
    <div className="sheet" aria-hidden="true">
      {/* ── i · the plate ───────────────────────────────────────────────── */}
      <Page n={0} title="The plate">
        <CornerLeaf className="pg-leaf pg-leaf-tl" />
        <CornerLeaf className="pg-leaf pg-leaf-br" />
        <VineSegment className="pg-vine" />

        <div className="ti">
          <p className="ti-eyebrow">Portfolio № 01</p>
          <h1 className="ti-name">
            <span>Prince</span>
            <span>Chipango</span>
          </h1>
          <Flourish className="ti-flourish" />
          <p className="ti-roles">{SITE.roles.join("  ·  ")}</p>
          <p className="ti-meta">
            {SITE.location}
            <span className="pg-sep">/</span>
            {SITE.domain}
          </p>
        </div>

        <div className="ti-statement">
          <p className="ti-quote">{SITE.philosophy}</p>
          <HandUnderline className="ti-underline" />
        </div>

        <p className="ti-manifesto">{SITE.manifesto}</p>

        <div className="ti-rose-well">
          <CoordinateRose className="ti-rose" />
          <p className="ti-rose-note">{SITE.location}</p>
        </div>

        <section className="ti-surface">
          <h2 className="pg-h">Above the waterline</h2>
          <p className="ti-stack">
            {SURFACE_STACK.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
          <p className="ti-stack-note">
            Six names, and the only six the site shows unprompted. Everything
            else on these pages is what a visitor has to open something to see.
          </p>
        </section>

        <section className="ti-nums">
          <h2 className="pg-h">Measured, and nothing invented</h2>
          <div className="ti-nums-row">
            {NUMERALS.map((n) => (
              <div key={n.label} className="ti-num">
                <span className="ti-num-v">{n.value}</span>
                <span className="ti-num-l">{n.label}</span>
                <span className="ti-num-n">{n.note}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="ti-hand">{SITE.footnote}</p>
      </Page>

      {/* ── ii & iii · the catalogue ────────────────────────────────────── */}
      <Page n={1} title="Selected work, i &ndash; ii" catalogue>
        {PROJECTS.slice(0, 2).map((p) => (
          <Entry key={p.index} p={p} />
        ))}
      </Page>

      <Page n={2} title="Selected work, iii &ndash; iv" catalogue>
        {PROJECTS.slice(2).map((p) => (
          <Entry key={p.index} p={p} />
        ))}
      </Page>

      {/* ── iv · practice ───────────────────────────────────────────────── */}
      <Page n={3} title="Practice" spread>
        <section className="pr-block">
          <h2 className="pg-h">The toolbox, six objects</h2>
          <p className="pg-lede">
            Six objects. Each is a capability first and a list of technologies
            second, and on the site the second half has to be asked for.
          </p>
          <dl className="pr-facets">
            {TOOLBOX.map((f) => (
              <div key={f.id} className="pr-facet">
                <dt>
                  <span className="pr-verb">{f.verb}</span>
                  <span className="pr-domain">{f.domain}</span>
                </dt>
                <dd>
                  <span className="pr-claim">{f.claim}</span>
                  <span className="pr-primary">{f.primary.join(" · ")}</span>
                  <span className="pr-secondary">{f.secondary.join(" · ")}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <WovenRule className="pr-weave" />

        <section className="pr-block">
          <h2 className="pg-h">Principles, in the order they were learned</h2>
          <ol className="pr-principles">
            {PRINCIPLES.map((pr) => (
              <li key={pr.n}>
                <span className="pr-n">{pr.n}</span>
                <span className="pr-say">
                  <b>{pr.title}.</b> {pr.body}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </Page>

      {/* ── v · the agent, and the way to reach me ──────────────────────── */}
      <Page n={4} title="It decides" last spread>
        <CornerLeaf className="pg-leaf pg-leaf-br" />

        <section className="pr-block">
          <h2 className="pg-h">How an agent is put together</h2>
          <p className="pg-lede">
            Seven stages. On the site three of them are visible and the rest
            have to be asked for, which is the point being made; here they are
            all set down at once.
          </p>
          <ol className="ag-stages">
            {AGENT_STAGES.map((st, i) => (
              <li key={st.id}>
                <span className="ag-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="ag-say">
                  <b>{st.name}.</b> {st.note}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pr-block">
          <h2 className="pg-h">And what holds it together</h2>
          <dl className="ag-arch">
            {AGENT_ARCHITECTURE.map((a) => (
              <div key={a.k}>
                <dt>{a.k}</dt>
                <dd>{a.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="pr-close">
          <Flourish className="pr-close-flourish" />
          <p className="pr-stack">{SURFACE_STACK.join("  ·  ")}</p>
          <p className="pr-channel">
            The whole of this, moving, is at <b>{SITE.domain}</b>. There is a
            channel on it, and that is the way to reach me.
          </p>
          <p className="pr-sign">{SITE.signature.join("  ")}</p>
        </section>

        <p className="pr-colophon">
          Set in Nunito and Amatic SC. The engravings are hairline vectors
          drawn by the same components that draw them on the website, and every
          word here is read from the one content file the site is built from,
          so this document cannot fall out of step with it. Five pages, laid
          out by hand, because a browser will not number its own.
        </p>
      </Page>
    </div>
  );
}

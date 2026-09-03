import { NUMERALS, PRINCIPLES, PROJECTS, SITE, SURFACE_STACK, TOOLBOX } from "@/content/site";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SHEET
 *
 * What comes out of the printer.
 *
 * A portfolio that is all motion has nothing to give a printer, and the thing
 * people quietly do with a portfolio is press print, or save it as a PDF and
 * send it on. Left alone the browser would produce a paper photograph of a
 * screen: cut-off canvas, ornament, a nav bar across the top of page one.
 *
 * So the page has a second body. It is `display: none` on screen, which keeps
 * it out of the accessibility tree as well as out of sight, and it is the
 * only thing that exists on paper. Every word of it is read from the same
 * content file the site is built from, so the document cannot drift out of
 * step with the website it came from.
 *
 * One address appears on it, the portfolio's own. No project URLs, for the
 * same reason they are not on the page: a host's subdomain is not the name of
 * a piece of work, and half of them will have moved by the time this is read.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Sheet() {
  return (
    <div className="sheet" aria-hidden="true">
      <header className="sheet-head">
        <h1 className="sheet-name">{SITE.name}</h1>
        <p className="sheet-roles">{SITE.roles.join("  ·  ")}</p>
        <p className="sheet-meta">
          {SITE.location}
          <span className="sheet-sep">/</span>
          {SITE.domain}
        </p>
      </header>

      <p className="sheet-statement">{SITE.philosophy}</p>
      <p className="sheet-manifesto">{SITE.manifesto}</p>

      <div className="sheet-cols">
        <section className="sheet-col">
          <h2 className="sheet-h">Selected work</h2>
          {PROJECTS.map((p) => (
            <article key={p.index} className="sheet-work">
              <h3 className="sheet-work-name">
                <span className="sheet-work-n">{p.index}</span>
                {p.name}
              </h3>
              <p className="sheet-work-kind">
                {p.kind}
                <span className="sheet-sep">/</span>
                {p.place}
              </p>
              <p className="sheet-work-line">{p.line}</p>
            </article>
          ))}

          <h2 className="sheet-h">How</h2>
          <ol className="sheet-principles">
            {PRINCIPLES.slice(0, 4).map((pr) => (
              <li key={pr.n}>
                <b>{pr.title}.</b> {pr.body}
              </li>
            ))}
          </ol>
        </section>

        <section className="sheet-col">
          <h2 className="sheet-h">Practice</h2>
          <dl className="sheet-facets">
            {TOOLBOX.map((f) => (
              <div key={f.id} className="sheet-facet">
                <dt>{f.verb}</dt>
                <dd>{f.primary.join(", ")}</dd>
              </div>
            ))}
          </dl>

          <h2 className="sheet-h">Measured</h2>
          <ul className="sheet-nums">
            {NUMERALS.map((n) => (
              <li key={n.label}>
                <b>{n.value}</b> {n.label}
                <i>{n.note}</i>
              </li>
            ))}
          </ul>

          <h2 className="sheet-h">Working with</h2>
          <p className="sheet-stack">{SURFACE_STACK.join("  ·  ")}</p>
        </section>
      </div>

      <footer className="sheet-foot">
        <p>
          The whole of this, moving, is at <b>{SITE.domain}</b>. There is a
          channel on it, which is the way to reach me.
        </p>
        <p className="sheet-sign">{SITE.signature.join("  ")}</p>
      </footer>
    </div>
  );
}

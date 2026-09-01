import { SITE, FOOTER_STACK } from "@/content/site";
import { CircuitTrace } from "./Ornament";

/** Exceptionally quiet. A note in the margin, the surface stack, a plate. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <p className="t-hand footer-note">{SITE.footnote}</p>

        <p className="t-label footer-stack">
          {FOOTER_STACK.map((s, i) => (
            <span key={s}>
              {s.toUpperCase()}
              {i < FOOTER_STACK.length - 1 ? <span aria-hidden="true"> / </span> : null}
            </span>
          ))}
        </p>

        <CircuitTrace className="footer-plate" />

        <div className="footer-base">
          <span className="t-meta">
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span className="t-meta">{SITE.location}</span>
          <a className="t-meta footer-sec" href="#contact">
            Open a channel
          </a>
          <a className="t-meta footer-sec" href="/.well-known/security.txt">
            security.txt
          </a>
        </div>
      </div>
    </footer>
  );
}

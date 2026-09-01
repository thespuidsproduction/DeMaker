import Link from "next/link";
import { SITE } from "@/content/site";

export const metadata = { title: "Not here" };

/**
 * A 404 in the language of the rest of the site: a coordinate that does not
 * resolve, reported plainly, with the way back.
 */
export default function NotFound() {
  return (
    <main className="edge">
      <div className="shell edge-inner">
        <span className="t-label edge-code">Error 404</span>

        <h1 className="edge-numeral t-numeral">404</h1>

        <p className="edge-line">
          That coordinate does not resolve. Nothing is broken; there is simply
          nothing here.
        </p>

        <p className="t-hand edge-hand">the map is not the territory</p>

        <div className="edge-actions">
          <Link className="edge-back" href="/">
            <span className="edge-back-glyph" aria-hidden="true" />
            Back to {SITE.domain}
          </Link>
          <Link className="t-label edge-alt" href="/#work">
            See what I build
          </Link>
        </div>
      </div>
    </main>
  );
}

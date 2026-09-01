"use client";

import { useEffect } from "react";

/**
 * Failure is a first-class state with a legible explanation, which is a thing
 * this site claims in writing. It applies here too: say what happened, offer
 * the one action that helps, and never pretend it did not happen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[princey.dev]", error);
  }, [error]);

  return (
    <main className="edge">
      <div className="shell edge-inner">
        <span className="t-label edge-code">Fault</span>

        <h1 className="edge-numeral t-numeral">500</h1>

        <p className="edge-line">
          Something on this page failed to render. That is a defect, not your
          doing.
        </p>

        {error.digest ? (
          <p className="t-meta edge-digest">Reference {error.digest}</p>
        ) : null}

        <div className="edge-actions">
          <button type="button" className="edge-back" onClick={reset}>
            <span className="edge-back-glyph" aria-hidden="true" />
            Try again
          </button>
          <a className="t-label edge-alt" href="/">
            Start over
          </a>
        </div>
      </div>
    </main>
  );
}

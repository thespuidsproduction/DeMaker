"use client";

/**
 * The last resort: the root layout itself failed, so there is no design system
 * to lean on. Everything here is inline and self-contained on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#111416",
          color: "#f4f1e9",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.625rem",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#a8785a",
              margin: 0,
            }}
          >
            Total fault
          </p>
          <h1 style={{ fontSize: "clamp(3rem, 12vw, 7rem)", margin: "0.4rem 0", fontWeight: 900 }}>
            500
          </h1>
          <p style={{ maxWidth: "38ch", margin: "0 auto 2rem", lineHeight: 1.7, color: "#c9cfcc" }}>
            The page could not be rendered at all. {error.digest ? `Reference ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#f4f1e9",
              color: "#111416",
              border: 0,
              borderRadius: 2,
              padding: "0.85rem 1.4rem",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.6875rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

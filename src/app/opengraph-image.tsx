import { ImageResponse } from "next/og";
import { SITE } from "@/content/site";

export const alt = `${SITE.name} — Full-Stack Developer, Frontend Engineer, AI / Agentic Systems Developer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card is the hero, compressed: Swiss grid, oversized name, a
 * copper rule, and the technical fragments as a single measured row.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#111416",
          color: "#F4F1E9",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Measured field */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(244,241,233,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,241,233,0.045) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div
            style={{
              display: "flex",
              fontSize: 17,
              letterSpacing: "0.28em",
              color: "#8496A3",
              textTransform: "uppercase",
            }}
          >
            {SITE.domain} — Portfolio № 01
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 17,
              letterSpacing: "0.22em",
              color: "#87968A",
              textTransform: "uppercase",
            }}
          >
            {SITE.location}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 118,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
            }}
          >
            PRINCE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 118,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
              color: "#C9CFCC",
              marginLeft: 6,
            }}
          >
            CHIPANGO
          </div>

          <div style={{ display: "flex", marginTop: 34, gap: 18, alignItems: "center" }}>
            <div style={{ display: "flex", width: 84, height: 2, background: "#A8785A" }} />
            <div
              style={{
                display: "flex",
                fontSize: 20,
                letterSpacing: "0.2em",
                color: "#C9CFCC",
                textTransform: "uppercase",
              }}
            >
              Full-stack · Frontend · AI / Agentic systems
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(244,241,233,0.16)",
            paddingTop: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#F4F1E9",
              maxWidth: 720,
              lineHeight: 1.35,
            }}
          >
            “{SITE.philosophy}”
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 15,
              letterSpacing: "0.2em",
              color: "#A8785A",
              textTransform: "uppercase",
            }}
          >
            React / Next.js / TypeScript / Node / PostgreSQL / Python / AI
          </div>
        </div>
      </div>
    ),
    size,
  );
}

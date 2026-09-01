import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The mark on a dark ground: an engraved aperture. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111416",
          color: "#A8785A",
          fontSize: 92,
          fontWeight: 900,
          letterSpacing: "-0.06em",
        }}
      >
        PC
      </div>
    ),
    size,
  );
}

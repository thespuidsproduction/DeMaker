/**
 * Optical definitions — the physical properties of the glass, declared once
 * and referenced by every panel. Refraction is a displacement map driven by
 * fractal noise: vintage lens distortion rather than a uniform blur.
 */
export function OpticalDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter id="atelier-refract" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.012"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="9"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Dispersion: the same source split into a warm and a cool channel,
            offset by a sub-pixel amount. Edges fracture light. */}
        <filter id="atelier-dispersion" x="-6%" y="-6%" width="112%" height="112%">
          <feOffset in="SourceGraphic" dx="0.7" dy="0" result="warm" />
          <feColorMatrix
            in="warm"
            type="matrix"
            values="1 0 0 0 0  0 0.72 0 0 0  0 0 0.42 0 0  0 0 0 0.55 0"
            result="warmTinted"
          />
          <feOffset in="SourceGraphic" dx="-0.7" dy="0" result="cool" />
          <feColorMatrix
            in="cool"
            type="matrix"
            values="0.5 0 0 0 0  0 0.6 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
            result="coolTinted"
          />
          <feMerge>
            <feMergeNode in="coolTinted" />
            <feMergeNode in="warmTinted" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Engraved plate texture — a faint hatch for Victorian linework. */}
        <pattern
          id="atelier-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(38)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.4" />
        </pattern>

        <linearGradient id="atelier-thread" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="45%" stopColor="var(--accent)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--dusty)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * VX-000.
 *
 * It is read as a cube for roughly two seconds. It is not one.
 *
 * The structure is an eight-vertex outer shell and a seven-vertex inner
 * shell — the eighth inner vertex is absent, and nothing compensates for
 * its absence. The two shells are stitched together by struts that connect
 * each outer corner to an inner corner three places away, so the interior
 * cannot be resolved as "a smaller cube inside a larger one".
 *
 * The important violation is in the projection, not the mesh: the two
 * halves of the outer shell are projected through different focal lengths.
 * The result is a solid whose faces disagree about where the observer is
 * standing. It stays rigid, it stays coherent, and it is impossible.
 */

export type V3 = readonly [number, number, number];

export const scaleV3 = (v: V3, k: number): V3 => [v[0] * k, v[1] * k, v[2] * k];

/** Outer shell: the eight corners of a unit cube, in bit order. */
export const OUTER: readonly V3[] = [
  [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1],
];

/** Inner shell at 0.46. Index 5 is missing. It has never been present. */
const INNER_SCALE = 0.46;
export const INNER_PRESENT = [0, 1, 2, 3, 4, 6, 7] as const;
export const INNER: readonly V3[] = OUTER.map(
  ([x, y, z]) => [x * INNER_SCALE, y * INNER_SCALE, z * INNER_SCALE] as V3
);

/** Cube adjacency: corners differing by exactly one bit. */
function shellEdges(present: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const a of present) {
    for (const b of present) {
      if (b <= a) continue;
      const d = a ^ b;
      if (d === 1 || d === 2 || d === 4) out.push([a, b]);
    }
  }
  return out;
}

export const OUTER_EDGES = shellEdges([0, 1, 2, 3, 4, 5, 6, 7]);
export const INNER_EDGES = shellEdges([...INNER_PRESENT]);

/** Struts. Each outer corner reaches for an inner corner three away. */
export const STRUTS: [number, number][] = OUTER.map((_, i) => [i, (i + 3) % 8] as [number, number])
  .filter(([, b]) => (INNER_PRESENT as readonly number[]).includes(b));

/**
 * Two edges are not attached to the object. They keep its shape and drift
 * beside it. Which two is fixed; why is not addressed anywhere.
 */
export const DETACHED = new Set([3, 11]);

/** Focal length per outer vertex. Half the shell is seen from further away. */
/*
 * The focal lengths are long and close together, and that is the whole
 * trick. A short focal makes the divide swing hard, and two short focals
 * tear the solid into a frustum — a shape, obviously wrong, and therefore
 * boring. Long focals keep the divide gentle, so the mesh still reads as a
 * cube; the ~11% disagreement between the two halves then shows up not as
 * a broken outline but as a face that is the wrong size for its distance.
 * Turning it swaps which half is lying, and the solid appears to invert
 * without ever visibly coming apart.
 */
/**
 * One focal length, long enough that the solid reads as a cube on sight.
 * A short focal exaggerates the near corners until the shape resolves as a
 * tent, and a shape that is obviously a different solid is not unsettling —
 * it is just a different solid.
 */
const FOCAL = 6.4;

/** Corner parity: alternating corners of the cube, no two adjacent. */
const parity = (i: number) => ((i & 1) + ((i >> 1) & 1) + ((i >> 2) & 1)) & 1;

/**
 * The violation.
 *
 * Alternating corners are projected as though the object were turned about
 * thirteen degrees further than it is. Every corner is individually
 * correct; the solid as a whole is facing two ways at once. It stays rigid
 * under rotation, every face keeps its size, and no outline ever breaks —
 * so the eye accepts it as a cube and then cannot make the near face and
 * the far face agree about which of them is in front.
 */
const TWIST = 0.115;
export const twistFor = (index: number, shell: 'outer' | 'inner') =>
  shell === 'inner' ? -TWIST * 0.5 : parity(index) ? TWIST : -TWIST;

export const focalFor = (_index: number, _shell: 'outer' | 'inner') => FOCAL;

export interface Projected { x: number; y: number; z: number; }

/** Y-then-X rotation, then perspective divide at the vertex's own focal. */
export function project(
  v: V3, ry: number, rx: number, focal: number, scale: number, cx: number, cy: number
): Projected {
  const [x0, y0, z0] = v;
  const cy1 = Math.cos(ry), sy1 = Math.sin(ry);
  const x1 = x0 * cy1 + z0 * sy1;
  const z1 = -x0 * sy1 + z0 * cy1;
  const cx1 = Math.cos(rx), sx1 = Math.sin(rx);
  const y1 = y0 * cx1 - z1 * sx1;
  const z2 = y0 * sx1 + z1 * cx1;
  const d = focal / (focal + z2);
  return { x: cx + x1 * d * scale, y: cy + y1 * d * scale, z: z2 };
}

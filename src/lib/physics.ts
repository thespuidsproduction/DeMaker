"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE SECRET PHYSICS LAYER
 * A Rapier 2D world mapped onto real DOM nodes. Elements keep their document
 * position for layout and accessibility; physics only ever writes a transform.
 *
 * The interface knows it has weight, even as it floats.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type RAPIER_NS from "@dimforge/rapier2d-compat";

type Rapier = typeof RAPIER_NS;

/** Pixels per physics metre. Keeps velocities in a stable numeric range. */
const SCALE = 60;

let rapierPromise: Promise<Rapier> | null = null;

async function loadRapier(): Promise<Rapier> {
  if (!rapierPromise) {
    rapierPromise = import("@dimforge/rapier2d-compat").then(async (mod) => {
      const R = (mod.default ?? mod) as unknown as Rapier;
      await R.init();
      return R;
    });
  }
  return rapierPromise;
}

export type FieldOptions = {
  /** Downward pull. 0 = weightless drift, 1.6 = a gentle settling. */
  gravity?: number;
  /** How hard each element is pulled back to its layout position. */
  tether?: number;
  /** Repulsion radius around the cursor, in pixels. */
  cursorRadius?: number;
  /** Repulsion strength. Negative values attract. */
  cursorForce?: number;
  /** Resistance of the medium. Higher feels like moving through glass. */
  damping?: number;
  /** Allow pointer dragging of the bodies. */
  draggable?: boolean;
  /** Maximum displacement from home, in pixels. Keeps the grid honest. */
  leash?: number;
};

export type FieldHandle = {
  destroy: () => void;
  /** Send a shockwave through the layer from a point in client coordinates. */
  impulseAt: (clientX: number, clientY: number, power?: number) => void;
  /** Recompute anchors after a layout change. */
  remeasure: () => void;
};

type Node = {
  el: HTMLElement;
  body: RAPIER_NS.RigidBody;
  collider: RAPIER_NS.Collider;
  /** Home position, container-relative, in pixels (centre of the element). */
  hx: number;
  hy: number;
  hw: number;
  hh: number;
};

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Build a physics field over `elements` inside `container`.
 * Returns a handle immediately; the world boots asynchronously.
 */
export function createField(
  container: HTMLElement,
  elements: HTMLElement[],
  opts: FieldOptions = {},
): FieldHandle {
  const {
    gravity = 0,
    tether = 34,
    cursorRadius = 190,
    cursorForce = 3.4,
    damping = 3.6,
    draggable = true,
    leash = 130,
  } = opts;

  let disposed = false;
  let raf = 0;
  let world: RAPIER_NS.World | null = null;
  let nodes: Node[] = [];
  let R: Rapier | null = null;

  const pointer = { x: -9999, y: -9999, active: false };
  let dragging: { node: Node; dx: number; dy: number } | null = null;
  const pending: Array<{ x: number; y: number; power: number }> = [];

  if (reduced()) {
    return { destroy: () => {}, impulseAt: () => {}, remeasure: () => {} };
  }

  const measure = (el: HTMLElement, cRect: DOMRect) => {
    const r = el.getBoundingClientRect();
    return {
      hx: r.left - cRect.left + r.width / 2,
      hy: r.top - cRect.top + r.height / 2,
      hw: r.width,
      hh: r.height,
    };
  };

  const boot = async () => {
    R = await loadRapier();
    if (disposed) return;

    world = new R.World({ x: 0, y: gravity });

    const cRect = container.getBoundingClientRect();

    // Boundary: the defined physical enclosure. Typography may drift, but
    // only within it.
    const wallThickness = 4;
    const bounds: Array<[number, number, number, number]> = [
      [cRect.width / 2, -wallThickness, cRect.width, wallThickness * 2],
      [cRect.width / 2, cRect.height + wallThickness, cRect.width, wallThickness * 2],
      [-wallThickness, cRect.height / 2, wallThickness * 2, cRect.height],
      [cRect.width + wallThickness, cRect.height / 2, wallThickness * 2, cRect.height],
    ];
    for (const [x, y, w, h] of bounds) {
      const bodyDesc = R.RigidBodyDesc.fixed().setTranslation(x / SCALE, y / SCALE);
      const body = world.createRigidBody(bodyDesc);
      world.createCollider(
        R.ColliderDesc.cuboid(w / 2 / SCALE, h / 2 / SCALE).setRestitution(0.18),
        body,
      );
    }

    nodes = elements.map((el) => {
      const m = measure(el, cRect);
      const bodyDesc = R!.RigidBodyDesc.dynamic()
        .setTranslation(m.hx / SCALE, m.hy / SCALE)
        .setLinearDamping(damping)
        .setAngularDamping(damping * 2.2)
        .setCcdEnabled(false);
      const body = world!.createRigidBody(bodyDesc);

      // Mass scales with visual area: a large plate is genuinely harder to
      // move than a small chip.
      const density = 1.1;
      const collider = world!.createCollider(
        R!.ColliderDesc.cuboid(m.hw / 2 / SCALE, m.hh / 2 / SCALE)
          .setDensity(density)
          .setRestitution(0.22)
          .setFriction(0.6),
        body,
      );

      el.style.willChange = "transform";
      return { el, body, collider, ...m };
    });

    tick();
  };

  const tick = () => {
    if (disposed || !world) return;
    raf = requestAnimationFrame(tick);

    const cRect = container.getBoundingClientRect();
    const px = pointer.x - cRect.left;
    const py = pointer.y - cRect.top;

    for (const n of nodes) {
      const t = n.body.translation();
      const cx = t.x * SCALE;
      const cy = t.y * SCALE;

      if (dragging && dragging.node === n) {
        // Direct velocity control: the object follows the hand, but with the
        // lag of something that has mass.
        const targetX = px - dragging.dx;
        const targetY = py - dragging.dy;
        n.body.setLinvel(
          { x: ((targetX - cx) / SCALE) * 14, y: ((targetY - cy) / SCALE) * 14 },
          true,
        );
      } else {
        // Tether: a spring back to the layout position. This is what keeps a
        // surrealist composition from dissolving into noise.
        const ex = (n.hx - cx) / SCALE;
        const ey = (n.hy - cy) / SCALE;
        const m = n.body.mass() || 1;
        n.body.applyImpulse({ x: ex * tether * m * 0.016, y: ey * tether * m * 0.016 }, true);

        // Cursor repulsion — objects part around the hand.
        if (pointer.active) {
          const dx = cx - px;
          const dy = cy - py;
          const d = Math.hypot(dx, dy);
          if (d < cursorRadius && d > 0.001) {
            const f = (1 - d / cursorRadius) ** 2 * cursorForce * m * 0.016;
            n.body.applyImpulse({ x: (dx / d) * f, y: (dy / d) * f }, true);
          }
        }
      }

      // Leash: hard-clamp displacement so nothing escapes its region.
      const offX = cx - n.hx;
      const offY = cy - n.hy;
      const off = Math.hypot(offX, offY);
      if (off > leash) {
        const k = leash / off;
        n.body.setTranslation(
          { x: (n.hx + offX * k) / SCALE, y: (n.hy + offY * k) / SCALE },
          true,
        );
        const v = n.body.linvel();
        n.body.setLinvel({ x: v.x * 0.4, y: v.y * 0.4 }, true);
      }
    }

    while (pending.length) {
      const p = pending.pop()!;
      const sx = p.x - cRect.left;
      const sy = p.y - cRect.top;
      for (const n of nodes) {
        const t = n.body.translation();
        const dx = t.x * SCALE - sx;
        const dy = t.y * SCALE - sy;
        const d = Math.hypot(dx, dy) || 1;
        const f = (p.power * (n.body.mass() || 1)) / (1 + d / 90);
        n.body.applyImpulse({ x: (dx / d) * f, y: (dy / d) * f }, true);
      }
    }

    world.step();

    for (const n of nodes) {
      const t = n.body.translation();
      const rot = n.body.rotation();
      const x = t.x * SCALE - n.hx;
      const y = t.y * SCALE - n.hy;
      n.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(
        rot * 0.34
      ).toFixed(4)}rad)`;
    }
  };

  /* ── Input ─────────────────────────────────────────────────────────── */

  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  };
  const onOut = () => {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
  };

  const onDown = (e: PointerEvent) => {
    if (!draggable || !nodes.length) return;
    const from = e.target as HTMLElement | null;

    // A physics body may contain real controls. Capturing the pointer on the
    // body would redirect the pointerup and swallow the click, so a gesture
    // that starts on something interactive is never a drag.
    if (from?.closest("button, a, input, textarea, select, label, [role='button']")) {
      return;
    }

    const target = from?.closest<HTMLElement>("[data-phys]");
    if (!target) return;
    const n = nodes.find((x) => x.el === target);
    if (!n) return;
    const cRect = container.getBoundingClientRect();
    const t = n.body.translation();
    dragging = {
      node: n,
      dx: e.clientX - cRect.left - t.x * SCALE,
      dy: e.clientY - cRect.top - t.y * SCALE,
    };
    target.setPointerCapture?.(e.pointerId);
    target.style.cursor = "grabbing";
  };

  const onUp = () => {
    if (dragging) {
      dragging.node.el.style.cursor = "";
      dragging = null;
    }
  };

  const ro = new ResizeObserver(() => remeasure());

  const remeasure = () => {
    if (!world || !R || !nodes.length) return;
    const cRect = container.getBoundingClientRect();
    for (const n of nodes) {
      // Read the untransformed box by neutralising the physics transform.
      const prev = n.el.style.transform;
      n.el.style.transform = "none";
      const m = measure(n.el, cRect);
      n.el.style.transform = prev;
      n.hx = m.hx;
      n.hy = m.hy;
      n.hw = m.hw;
      n.hh = m.hh;
      n.body.setTranslation({ x: m.hx / SCALE, y: m.hy / SCALE }, true);
      n.body.setLinvel({ x: 0, y: 0 }, true);
    }
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onOut);
  window.addEventListener("blur", onOut);
  container.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  ro.observe(container);

  void boot();

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onOut);
      window.removeEventListener("blur", onOut);
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      for (const n of nodes) {
        n.el.style.transform = "";
        n.el.style.willChange = "";
      }
      nodes = [];
      world?.free();
      world = null;
    },
    impulseAt(clientX, clientY, power = 2.4) {
      pending.push({ x: clientX, y: clientY, power });
    },
    remeasure,
  };
}

"use client";

import { useRef } from "react";
import { DOT, glowDot, useParticleField, type FieldEnv } from "./use-particle-field";
import { buildFlow, mulberry32, sampleFlow, type FlowField } from "./field-math";

/**
 * Organic "lines made of dots": crawler agents ride a curl-noise flow field and
 * leave short dotted streamline trails (one dot per ~10px of travel), so the
 * background reads as braiding crawl currents — not a stroked path or a
 * connect-the-dots web. The cursor DEFLECTS the current (opens a reading lane);
 * it never attracts dots over the copy. Reduced motion: advect to a settled
 * flow-map and freeze.
 */

type Variant = "hero" | "frameworks" | "pricing";
const VARIANTS: Record<Variant, { count: number; alpha: number; seed: number; cyan: number }> = {
  hero: { count: 72, alpha: 0.58, seed: 1207, cyan: 0.24 },
  frameworks: { count: 60, alpha: 0.44, seed: 5501, cyan: 0.18 },
  pricing: { count: 48, alpha: 0.4, seed: 8821, cyan: 0.26 },
};

const STRIDE = 10; // px of travel between plotted trail dots
const SPEED = 20; // px/s

type Model = {
  flow: FlowField;
  n: number;
  L: number;
  // Pointer velocity (px/frame) so fast sweeps push the current along.
  lastMx: number;
  lastMy: number;
  sweepX: number;
  sweepY: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  lsx: Float32Array;
  lsy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  head: Int16Array;
  count: Int16Array;
  cyan: Uint8Array;
  rnd: () => number;
};

function spawn(m: Model, i: number, w: number, h: number) {
  // Seed at an inlet on the top or side edges so currents flow inward/down.
  const r = m.rnd();
  let x: number;
  let y: number;
  if (r < 0.6) {
    x = m.rnd() * w;
    y = -10 + m.rnd() * 20;
  } else if (r < 0.8) {
    x = -10;
    y = m.rnd() * h;
  } else {
    x = w + 10;
    y = m.rnd() * h;
  }
  m.px[i] = x;
  m.py[i] = y;
  m.vx[i] = 0;
  m.vy[i] = 0;
  m.lsx[i] = x;
  m.lsy[i] = y;
  m.head[i] = 0;
  m.count[i] = 0;
}

const dir: [number, number] = [0, 0];

function step(m: Model, w: number, h: number, dt: number, env: FieldEnv) {
  const { mouse, progress } = env;

  // Pointer sweep velocity (smoothed) — a fast pass drags the current.
  if (mouse.inside && m.lastMx > -9000) {
    m.sweepX = m.sweepX * 0.85 + (mouse.x - m.lastMx) * 0.15;
    m.sweepY = m.sweepY * 0.85 + (mouse.y - m.lastMy) * 0.15;
  } else {
    m.sweepX *= 0.85;
    m.sweepY *= 0.85;
  }
  m.lastMx = mouse.inside ? mouse.x : -9999;
  m.lastMy = mouse.inside ? mouse.y : -9999;
  const sweepMag = Math.hypot(m.sweepX, m.sweepY);

  for (let i = 0; i < m.n; i++) {
    let x = m.px[i]!;
    let y = m.py[i]!;
    sampleFlow(m.flow, x, y, dir);
    let vx = m.vx[i]!;
    let vy = m.vy[i]!;
    // Relax velocity toward the field direction.
    vx += (dir[0] * SPEED - vx) * 0.08;
    vy += (dir[1] * SPEED - vy) * 0.08;
    // Gentle downward drift (the crawl frontier moving as you read).
    vy += (0.4 + progress * 0.8) * dt * 8;
    // Cursor deflection — push the current away, opening a reading lane —
    // plus a directional drag when the pointer sweeps fast.
    if (mouse.inside) {
      const ddx = x - mouse.x;
      const ddy = y - mouse.y;
      const d = Math.hypot(ddx, ddy);
      if (d < 180) {
        const f = (1 - d / 180) ** 2 * 70;
        vx += (ddx / (d || 1)) * f;
        vy += (ddy / (d || 1)) * f;
        if (sweepMag > 3) {
          const drag = (1 - d / 180) * Math.min(26, sweepMag * 1.6);
          vx += (m.sweepX / sweepMag) * drag;
          vy += (m.sweepY / sweepMag) * drag;
        }
      }
    }
    m.vx[i] = vx;
    m.vy[i] = vy;
    x += vx * dt;
    y += vy * dt;
    m.px[i] = x;
    m.py[i] = y;

    if (x < -16 || x > w + 16 || y < -16 || y > h + 16) {
      spawn(m, i, w, h);
      continue;
    }
    // Record a trail sample every STRIDE px of travel.
    const mvx = x - m.lsx[i]!;
    const mvy = y - m.lsy[i]!;
    if (mvx * mvx + mvy * mvy >= STRIDE * STRIDE) {
      const head = (m.head[i]! + 1) % m.L;
      m.head[i] = head;
      m.tx[i * m.L + head] = x;
      m.ty[i * m.L + head] = y;
      m.count[i] = Math.min(m.count[i]! + 1, m.L);
      m.lsx[i] = x;
      m.lsy[i] = y;
    }
  }
}

function render(ctx: CanvasRenderingContext2D, m: Model, alpha: number) {
  for (let i = 0; i < m.n; i++) {
    const c = m.count[i]!;
    const rgb = m.cyan[i] ? DOT.cyan : DOT.base;
    for (let k = 0; k < c; k++) {
      const idx = (m.head[i]! - k + m.L) % m.L;
      const age = k / m.L;
      const a = alpha * (1 - age * 0.92) * (k === 0 ? 1 : 0.85);
      const r = 1.6 * (1 - age * 0.5);
      glowDot(ctx, m.tx[i * m.L + idx]!, m.ty[i * m.L + idx]!, r, rgb, a, k === 0 ? (m.cyan[i] ? 1.6 : 0.5) : 0);
    }
  }
}

export function FlowField({ variant, className }: { variant: Variant; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const model = useRef<Model | null>(null);
  const cfg = VARIANTS[variant];

  useParticleField(ref, {
    setup(w, h, reduced) {
      const small = w < 700;
      const n = Math.round(cfg.count * (small ? 0.45 : 1));
      const L = small ? 12 : 18;
      const rnd = mulberry32(cfg.seed);
      const m: Model = {
        flow: buildFlow(w, h, small ? 34 : 28, cfg.seed),
        n,
        L,
        lastMx: -9999,
        lastMy: -9999,
        sweepX: 0,
        sweepY: 0,
        px: new Float32Array(n),
        py: new Float32Array(n),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        lsx: new Float32Array(n),
        lsy: new Float32Array(n),
        tx: new Float32Array(n * L),
        ty: new Float32Array(n * L),
        head: new Int16Array(n),
        count: new Int16Array(n),
        cyan: new Uint8Array(n),
        rnd,
      };
      for (let i = 0; i < n; i++) {
        spawn(m, i, w, h);
        // stagger initial positions through the field so it starts populated
        m.px[i] = rnd() * w;
        m.py[i] = rnd() * h;
        m.lsx[i] = m.px[i]!;
        m.lsy[i] = m.py[i]!;
        m.cyan[i] = rnd() < cfg.cyan ? 1 : 0;
      }
      model.current = m;
      // Pre-advance so streamlines are visible immediately (and settled when reduced).
      const settle = reduced ? 240 : 150;
      const fakeEnv = { mouse: { inside: false }, progress: 0.4 } as FieldEnv;
      for (let s = 0; s < settle; s++) step(m, w, h, 0.05, fakeEnv);
    },

    frame(env) {
      const m = model.current;
      if (!m) return;
      if (!env.reduced) step(m, env.w, env.h, env.dt || 0.016, env);
      render(env.ctx, m, cfg.alpha);
    },
  });

  return (
    <div aria-hidden className={`dot-field pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

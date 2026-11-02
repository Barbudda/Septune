"use client";

import { useRef } from "react";
import { DOT, glowDot, useParticleField, type FieldEnv } from "./use-particle-field";
import { buildFlow, clamp, lerp, mulberry32, sampleFlow, type FlowField } from "./field-math";
import { createGrid } from "./spatial-hash";

/**
 * A living crawler SWARM — real boids (separation / alignment / cohesion) plus
 * a flow-field bias (so flocks trace the same currents as the FlowField) and a
 * scroll-blended GOAL anchor in the empty gutter: the flock roams broadly on
 * entry and CONVERGES on the finding as you reach the section centre. The
 * cursor REPELS the cohort (they bank away as a group, then re-form). Emergent
 * links to already-fetched neighbours read as organic dot-lines. Reduced
 * motion: headless-settle to the converged formation and freeze.
 */

type Variant = "problem" | "pr" | "howitworks" | "finalcta";

type Anchor = { x: number; y: number };
type Cfg = {
  count: number;
  alpha: number;
  seed: number;
  groups: number;
  sep: number;
  align: number;
  coh: number;
  flow: number;
  issue: number; // fraction tinted amber/danger
  converge: boolean;
  maxSpeed: number;
  anchors: (w: number, h: number, p: number) => Anchor[];
  goalW: (p: number) => number;
};

const RADIUS = 48;

const VARIANTS: Record<Variant, Cfg> = {
  // The signature swarm: noisy, high-separation, weak goal — problems everywhere.
  problem: {
    count: 176,
    alpha: 0.62,
    seed: 4242,
    groups: 1,
    sep: 1.4,
    align: 0.55,
    coh: 0.62,
    flow: 0.6,
    issue: 0.24,
    converge: false,
    maxSpeed: 64,
    anchors: (w, h) => [{ x: w * 0.34, y: h * 0.62 }],
    goalW: (p) => 0.18 + p * 0.24,
  },
  // Four sub-flocks group, then merge-stream into one PR node on the right.
  pr: {
    count: 128,
    alpha: 0.55,
    seed: 7711,
    groups: 4,
    sep: 1.4,
    align: 0.6,
    coh: 0.65,
    flow: 0.4,
    issue: 0.3,
    converge: true,
    maxSpeed: 64,
    anchors: (w, h, p) => {
      const m = clamp((p - 0.45) / 0.4, 0, 1);
      const cl = [
        [0.22, 0.3],
        [0.17, 0.52],
        [0.22, 0.72],
        [0.3, 0.88],
      ];
      const prx = 0.8;
      const pry = 0.46;
      return cl.map(([cx, cy]) => ({
        x: lerp(cx! * w, prx * w, m),
        y: lerp(cy! * h, pry * h, m),
      }));
    },
    goalW: (p) => 0.5 + p * 0.7,
  },
  // A small lead-flock whose goal walks down the five steps as you scroll.
  howitworks: {
    count: 64,
    alpha: 0.4,
    seed: 3030,
    groups: 1,
    sep: 1.4,
    align: 0.7,
    coh: 0.7,
    flow: 0.5,
    issue: 0.08,
    converge: false,
    maxSpeed: 58,
    anchors: (w, h, p) => [{ x: w * 0.5, y: h * (0.16 + p * 0.68) }],
    goalW: () => 0.95,
  },
  // A calm settled flock orbiting the CTA — the fleet ready to open the PR.
  finalcta: {
    count: 84,
    alpha: 0.5,
    seed: 9009,
    groups: 1,
    sep: 1.3,
    align: 0.6,
    coh: 0.85,
    flow: 0.3,
    issue: 0,
    converge: true,
    maxSpeed: 44,
    anchors: (w, h) => [{ x: w * 0.5, y: h * 0.5 }],
    goalW: () => 1.05,
  },
};

type Model = {
  flow: FlowField;
  grid: ReturnType<typeof createGrid>;
  cand: Int32Array;
  n: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  group: Int8Array;
  issue: Uint8Array;
  cyan: Uint8Array;
  // Idle-cursor tracking → "orbit inspection" beat.
  lastMx: number;
  lastMy: number;
  idleT: number;
};

const fdir: [number, number] = [0, 0];

function step(m: Model, w: number, h: number, dt: number, cfg: Cfg, env: FieldEnv) {
  const { mouse, progress } = env;
  const anchors = cfg.anchors(w, h, progress);
  const gw = cfg.goalW(progress);
  m.grid.rebuild(m.px, m.py, m.n, RADIUS, w, h);

  // Idle detection: accumulate time while the pointer barely moves.
  if (mouse.inside) {
    const moved = Math.hypot(mouse.x - m.lastMx, mouse.y - m.lastMy);
    m.idleT = moved < 2 ? m.idleT + dt : 0;
    m.lastMx = mouse.x;
    m.lastMy = mouse.y;
  } else {
    m.idleT = 0;
  }

  for (let i = 0; i < m.n; i++) {
    const x = m.px[i]!;
    const y = m.py[i]!;
    let sx = 0;
    let sy = 0; // separation
    let ax = 0;
    let ay = 0; // alignment
    let cx = 0;
    let cy = 0; // cohesion centroid
    let near = 0;

    const cn = m.grid.query(x, y, m.cand);
    for (let c = 0; c < cn; c++) {
      const j = m.cand[c]!;
      if (j === i) continue;
      const dx = x - m.px[j]!;
      const dy = y - m.py[j]!;
      const d2 = dx * dx + dy * dy;
      if (d2 > RADIUS * RADIUS || d2 === 0) continue;
      const d = Math.sqrt(d2);
      sx += (dx / d) * (1 - d / RADIUS);
      sy += (dy / d) * (1 - d / RADIUS);
      ax += m.vx[j]!;
      ay += m.vy[j]!;
      cx += m.px[j]!;
      cy += m.py[j]!;
      near++;
    }

    let fxv = m.vx[i]!;
    let fyv = m.vy[i]!;

    // Boids steers.
    fxv += sx * cfg.sep * 12 * dt * 6;
    fyv += sy * cfg.sep * 12 * dt * 6;
    if (near > 0) {
      fxv += (ax / near - m.vx[i]!) * cfg.align * dt * 6;
      fyv += (ay / near - m.vy[i]!) * cfg.align * dt * 6;
      fxv += (cx / near - x) * cfg.coh * dt * 0.6;
      fyv += (cy / near - y) * cfg.coh * dt * 0.6;
    }

    // Flow-field bias (trace the shared currents).
    sampleFlow(m.flow, x, y, fdir);
    fxv += fdir[0] * cfg.flow * cfg.maxSpeed * dt * 6;
    fyv += fdir[1] * cfg.flow * cfg.maxSpeed * dt * 6;

    // Goal anchor (scroll-blended → convergence).
    const a = anchors[m.group[i]! % anchors.length]!;
    fxv += (a.x - x) * gw * dt * 1.4;
    fyv += (a.y - y) * gw * dt * 1.4;

    // Cursor interaction. Moving pointer = repulsion (the cohort banks away,
    // then re-forms). Held still ≥0.6s = a few crawlers come and ORBIT the
    // cursor — the "agent inspecting a node" beat.
    if (mouse.inside) {
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (m.idleT > 0.6) {
        if (d < 190) {
          // Steer toward a ring of radius ~72 around the cursor, plus a
          // tangential component so they circle instead of piling up.
          const ring = (d - 72) * 2.2;
          fxv -= (dx / (d || 1)) * ring * dt * 6;
          fyv -= (dy / (d || 1)) * ring * dt * 6;
          const tang = 46 * (1 - Math.min(1, Math.abs(d - 72) / 120));
          fxv += (-dy / (d || 1)) * tang * dt * 6;
          fyv += (dx / (d || 1)) * tang * dt * 6;
        }
      } else if (d < 170) {
        const f = (1 - d / 170) ** 2 * 320;
        fxv += (dx / (d || 1)) * f * dt * 6;
        fyv += (dy / (d || 1)) * f * dt * 6;
      }
    }

    // Speed clamp + light damping.
    fxv *= 0.96;
    fyv *= 0.96;
    const sp = Math.hypot(fxv, fyv);
    if (sp > cfg.maxSpeed) {
      fxv = (fxv / sp) * cfg.maxSpeed;
      fyv = (fyv / sp) * cfg.maxSpeed;
    }
    m.vx[i] = fxv;
    m.vy[i] = fyv;

    let nx = x + fxv * dt;
    let ny = y + fyv * dt;
    // Soft wrap so the flock stays in the section.
    if (nx < -20) nx = w + 20;
    else if (nx > w + 20) nx = -20;
    if (ny < -20) ny = h + 20;
    else if (ny > h + 20) ny = -20;
    m.px[i] = nx;
    m.py[i] = ny;
  }
}

function render(ctx: CanvasRenderingContext2D, m: Model, cfg: Cfg, progress: number) {
  // Emergent links — to a few already-near neighbours (j>i dedupes).
  ctx.lineWidth = 1;
  for (let i = 0; i < m.n; i++) {
    const x = m.px[i]!;
    const y = m.py[i]!;
    const cn = m.grid.query(x, y, m.cand);
    let links = 0;
    for (let c = 0; c < cn && links < 3; c++) {
      const j = m.cand[c]!;
      if (j <= i) continue;
      const dx = x - m.px[j]!;
      const dy = y - m.py[j]!;
      const d2 = dx * dx + dy * dy;
      if (d2 > RADIUS * RADIUS) continue;
      const a = (1 - Math.sqrt(d2) / RADIUS) * 0.13;
      ctx.strokeStyle = `rgba(${DOT.cyan},${a})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(m.px[j]!, m.py[j]!);
      ctx.stroke();
      links++;
    }
  }

  // Velocity-streaked dots.
  const conv = cfg.converge ? clamp((progress - 0.55) / 0.3, 0, 1) : 0;
  for (let i = 0; i < m.n; i++) {
    const x = m.px[i]!;
    const y = m.py[i]!;
    const vx = m.vx[i]!;
    const vy = m.vy[i]!;
    const rgb = m.issue[i]
      ? conv > 0.5
        ? DOT.signal
        : i % 2
          ? DOT.amber
          : DOT.danger
      : conv > 0.5
        ? DOT.signal
        : m.cyan[i]
          ? DOT.cyan
          : DOT.base;
    const sp = Math.hypot(vx, vy);
    const sl = Math.min(10, sp * 0.08);
    if (sl > 1) {
      ctx.strokeStyle = `rgba(${rgb},${cfg.alpha * 0.7})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - (vx / (sp || 1)) * sl, y - (vy / (sp || 1)) * sl);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    glowDot(ctx, x, y, m.issue[i] ? 2 : 1.5, rgb, cfg.alpha, m.issue[i] || m.cyan[i] ? 1.3 : 0.5);
  }
}

export function CrawlerSwarm({ variant, className }: { variant: Variant; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const model = useRef<Model | null>(null);
  const cfg = VARIANTS[variant];

  useParticleField(ref, {
    setup(w, h, reduced) {
      const small = w < 700;
      const n = Math.round(cfg.count * (small ? 0.42 : 1));
      const rnd = mulberry32(cfg.seed);
      const m: Model = {
        flow: buildFlow(w, h, small ? 34 : 28, cfg.seed),
        grid: createGrid(),
        // Sized to the agent count: a converged flock can pack one 3×3 cell
        // block past 64, and query() truncates at the buffer length.
        cand: new Int32Array(Math.max(64, n)),
        n,
        px: new Float32Array(n),
        py: new Float32Array(n),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        group: new Int8Array(n),
        issue: new Uint8Array(n),
        cyan: new Uint8Array(n),
        lastMx: -9999,
        lastMy: -9999,
        idleT: 0,
      };
      for (let i = 0; i < n; i++) {
        m.px[i] = rnd() * w;
        m.py[i] = rnd() * h;
        m.vx[i] = (rnd() - 0.5) * 10;
        m.vy[i] = (rnd() - 0.5) * 10;
        m.group[i] = Math.floor(rnd() * cfg.groups);
        m.issue[i] = rnd() < cfg.issue ? 1 : 0;
        m.cyan[i] = rnd() < 0.12 ? 1 : 0;
      }
      model.current = m;
      // Headless-settle so the swarm starts coherent (and converged when reduced).
      const settle = reduced ? 220 : 90;
      const env = { mouse: { inside: false }, progress: reduced ? 0.92 : 0.25 } as FieldEnv;
      for (let s = 0; s < settle; s++) step(m, w, h, 0.05, cfg, env);
    },

    frame(env) {
      const m = model.current;
      if (!m) return;
      if (!env.reduced) step(m, env.w, env.h, env.dt || 0.016, cfg, env);
      else m.grid.rebuild(m.px, m.py, m.n, RADIUS, env.w, env.h);
      render(env.ctx, m, cfg, env.reduced ? 0.92 : env.progress);
    },
  });

  return (
    <div aria-hidden className={`dot-field pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

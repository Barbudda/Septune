"use client";

import { useRef } from "react";
import { DOT, glowDot, useParticleField, type FieldEnv } from "./use-particle-field";
import { clamp, lerp, mulberry32 } from "./field-math";
import { createGrid } from "./spatial-hash";

/**
 * A self-organising symptom→cause WEB: light symptom dots are spring-coupled to
 * heavier cause anchors; the layout untangles itself and you can tug it with the
 * cursor. Edges are DOTTED polylines (links literally made of dots) whose
 * brightness = bind strength; when a symptom's spring settles it crossfades to
 * DOT.signal (a quiet "diagnosis confirmed"). Scroll stiffens the springs:
 * slack/unbound on entry → taut/green at centre. Reduced motion: solve to
 * equilibrium and freeze the fully-diagnosed web.
 */

type Variant = "diff" | "features" | "comparison" | "security" | "faq";
type Frac = [number, number];
type Cfg = {
  causesAt: Frac[];
  per: number; // symptoms per cause
  alpha: number;
  seed: number;
  baseK: number; // spring stiffness
  settled: number; // 0..1 how pre-bound/green it starts (Security = high)
};

const VARIANTS: Record<Variant, Cfg> = {
  diff: { causesAt: [[0.2, 0.32], [0.17, 0.56], [0.22, 0.8]], per: 7, alpha: 0.5, seed: 211, baseK: 0.05, settled: 0 },
  features: { causesAt: [[0.13, 0.26], [0.87, 0.3], [0.16, 0.76], [0.84, 0.78]], per: 6, alpha: 0.32, seed: 322, baseK: 0.05, settled: 0.2 },
  comparison: { causesAt: [[0.1, 0.32], [0.1, 0.6], [0.1, 0.84]], per: 8, alpha: 0.42, seed: 433, baseK: 0.045, settled: 0.15 },
  security: { causesAt: [[0.14, 0.3], [0.86, 0.32], [0.16, 0.74], [0.84, 0.76]], per: 5, alpha: 0.36, seed: 544, baseK: 0.06, settled: 0.7 },
  faq: { causesAt: [[0.12, 0.3], [0.88, 0.42], [0.14, 0.8]], per: 6, alpha: 0.3, seed: 655, baseK: 0.05, settled: 0.1 },
};

const REP = 34; // repulsion radius

type Model = {
  grid: ReturnType<typeof createGrid>;
  cand: Int32Array;
  n: number; // total nodes (causes first, then symptoms)
  nc: number; // cause count
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  hx: Float32Array; // home (causes pinned toward these)
  hy: Float32Array;
  cause: Int16Array; // symptom → its cause index (-1 for causes)
  rest: Float32Array; // symptom rest length
  bound: Float32Array; // 0..1 bind strength
  small: boolean;
};

function step(m: Model, w: number, h: number, dt: number, cfg: Cfg, env: FieldEnv) {
  const { mouse, progress, reduced } = env;
  const k = cfg.baseK * (0.35 + clamp(reduced ? 1 : progress * 1.4, 0, 1) * 1.1);
  m.grid.rebuild(m.px, m.py, m.n, REP, w, h);

  // Dwell-gather: hovering near a cause pulls its symptoms inward — "show me
  // everything caused by this". Nearest cause within 90px wins.
  let gatherCause = -1;
  if (mouse.inside) {
    let best = Infinity;
    for (let i = 0; i < m.nc; i++) {
      const d = Math.hypot(mouse.x - m.px[i]!, mouse.y - m.py[i]!);
      if (d < 90 && d < best) {
        best = d;
        gatherCause = i;
      }
    }
  }

  for (let i = 0; i < m.n; i++) {
    let vx = m.vx[i]!;
    let vy = m.vy[i]!;
    const x = m.px[i]!;
    const y = m.py[i]!;

    // Repulsion from near nodes (untangle).
    const cn = m.grid.query(x, y, m.cand);
    for (let c = 0; c < cn; c++) {
      const j = m.cand[c]!;
      if (j === i) continue;
      const dx = x - m.px[j]!;
      const dy = y - m.py[j]!;
      const d2 = dx * dx + dy * dy;
      if (d2 > REP * REP || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const f = (1 - d / REP) * 26;
      vx += (dx / d) * f * dt;
      vy += (dy / d) * f * dt;
    }

    if (m.cause[i]! < 0) {
      // Cause: near-pinned to home.
      vx += (m.hx[i]! - x) * 0.12;
      vy += (m.hy[i]! - y) * 0.12;
    } else {
      // Symptom: spring toward its cause's rest distance. When that cause is
      // being inspected (dwell-gather), the rest length shrinks so the whole
      // subgraph visibly gathers around it, then relaxes on leave.
      const ci = m.cause[i]!;
      const dx = m.px[ci]! - x;
      const dy = m.py[ci]! - y;
      const len = Math.hypot(dx, dy) || 1;
      const rest = ci === gatherCause ? m.rest[i]! * 0.45 : m.rest[i]!;
      const f = (len - rest) * (ci === gatherCause ? k * 2 : k);
      vx += (dx / len) * f;
      vy += (dy / len) * f;
      // brownian wander so it never looks frozen
      vx += (((i * 9301 + 49297) % 233) / 233 - 0.5) * 4 * dt;
      vy += (((i * 4523 + 7919) % 233) / 233 - 0.5) * 4 * dt;
      // bind strength from how close the spring sits to rest
      const closeness = 1 - clamp(Math.abs(len - m.rest[i]!) / 26, 0, 1);
      m.bound[i] = lerp(m.bound[i]!, Math.max(closeness, cfg.settled), 0.05);
    }

    // Cursor tug — repel nodes (you feel the dependency structure). Gathered
    // symptoms are exempt so the inspection doesn't fight itself.
    if (mouse.inside && m.cause[i] !== gatherCause) {
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (d < 150) {
        const f = (1 - d / 150) ** 2 * 200;
        vx += (dx / (d || 1)) * f * dt;
        vy += (dy / (d || 1)) * f * dt;
      }
    }

    vx *= 0.86;
    vy *= 0.86;
    m.vx[i] = vx;
    m.vy[i] = vy;
    m.px[i] = x + vx;
    m.py[i] = y + vy;
  }
}

function render(ctx: CanvasRenderingContext2D, m: Model, cfg: Cfg, env: FieldEnv) {
  // Hover a cause → highlight its subgraph, dim the rest.
  let hoverCause = -1;
  if (env.mouse.inside) {
    let best = Infinity;
    for (let i = 0; i < m.nc; i++) {
      const d = Math.hypot(env.mouse.x - m.px[i]!, env.mouse.y - m.py[i]!);
      if (d < 90 && d < best) {
        best = d;
        hoverCause = i;
      }
    }
  }

  // Dotted edges.
  ctx.lineWidth = 1;
  for (let i = m.nc; i < m.n; i++) {
    const ci = m.cause[i]!;
    const dim = hoverCause >= 0 && ci !== hoverCause ? 0.3 : 1;
    const b = m.bound[i]!;
    const sx = m.px[i]!;
    const sy = m.py[i]!;
    const cx = m.px[ci]!;
    const cy = m.py[ci]!;
    const a = (0.06 + b * 0.22) * dim;
    const rgb = b > 0.6 ? DOT.signal : DOT.base;
    if (m.small) {
      ctx.strokeStyle = `rgba(${rgb},${a})`;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    } else {
      const len = Math.hypot(cx - sx, cy - sy);
      const dots = Math.min(18, Math.max(2, (len / 8) | 0));
      for (let d = 1; d < dots; d++) {
        const t = d / dots;
        glowDot(ctx, lerp(sx, cx, t), lerp(sy, cy, t), 1, rgb, a * 1.5, b > 0.6 && d === dots - 1 ? 0.8 : 0);
      }
    }
  }

  // Nodes.
  for (let i = 0; i < m.n; i++) {
    const isCause = m.cause[i]! < 0;
    const dim = hoverCause >= 0 && i !== hoverCause && m.cause[i]! !== hoverCause ? 0.4 : 1;
    if (isCause) {
      glowDot(ctx, m.px[i]!, m.py[i]!, 2.7, DOT.molten, Math.min(0.85, cfg.alpha + 0.12) * dim, 1.7 * dim);
    } else {
      const b = m.bound[i]!;
      const rgb = b > 0.55 ? DOT.signal : i % 3 === 0 ? DOT.amber : DOT.base;
      glowDot(ctx, m.px[i]!, m.py[i]!, 1.6, rgb, cfg.alpha * (0.78 + b * 0.32) * dim, (b > 0.55 ? 1.4 : 0.5) * dim);
    }
  }
}

export function CauseWeb({ variant, className }: { variant: Variant; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const model = useRef<Model | null>(null);
  const cfg = VARIANTS[variant];

  useParticleField(ref, {
    setup(w, h, reduced) {
      const small = w < 700;
      const rnd = mulberry32(cfg.seed);
      const causes = cfg.causesAt;
      const nc = causes.length;
      const per = small ? Math.max(2, cfg.per - 2) : cfg.per;
      const ns = nc * per;
      const n = nc + ns;
      const m: Model = {
        grid: createGrid(),
        // Sized to node count so dense webs never truncate the 3×3 query.
        cand: new Int32Array(Math.max(64, n)),
        n,
        nc,
        px: new Float32Array(n),
        py: new Float32Array(n),
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        hx: new Float32Array(n),
        hy: new Float32Array(n),
        cause: new Int16Array(n),
        rest: new Float32Array(n),
        bound: new Float32Array(n),
        small,
      };
      for (let i = 0; i < nc; i++) {
        const [fx, fy] = causes[i]!;
        m.px[i] = fx * w;
        m.py[i] = fy * h;
        m.hx[i] = fx * w;
        m.hy[i] = fy * h;
        m.cause[i] = -1;
      }
      let s = nc;
      for (let i = 0; i < nc; i++) {
        for (let p = 0; p < per; p++) {
          m.cause[s] = i;
          m.rest[s] = 60 + rnd() * 70;
          m.bound[s] = cfg.settled * rnd();
          m.px[s] = m.px[i]! + (rnd() - 0.5) * 160;
          m.py[s] = m.py[i]! + (rnd() - 0.5) * 160;
          s++;
        }
      }
      model.current = m;
      const settle = reduced ? 260 : 60;
      const env = { mouse: { inside: false }, progress: reduced ? 1 : 0.3, reduced } as FieldEnv;
      for (let it = 0; it < settle; it++) step(m, w, h, 0.05, cfg, env);
    },

    frame(env) {
      const m = model.current;
      if (!m) return;
      if (!env.reduced) step(m, env.w, env.h, env.dt || 0.016, cfg, env);
      else m.grid.rebuild(m.px, m.py, m.n, REP, env.w, env.h);
      render(env.ctx, m, cfg, env);
    },
  });

  return (
    <div aria-hidden className={`dot-field pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

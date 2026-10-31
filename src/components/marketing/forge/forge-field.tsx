"use client";

import { useEffect, useRef } from "react";
import { chapters, measureChapters, type ChapterEntry } from "./chapters";
import type { Forge, ForgeFrame, ForgeSlot } from "./engine";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Scene = {
  /** Structure id, see structures.ts: 0 tree, 1 stream, 2 code, 3 sites. */
  sid: number;
  /** The chapter's own progress, 0 when its top is at 60 % of the viewport, 1 when its bottom is. */
  state: (p: number) => ForgeSlot["state"];
  rotY: (p: number) => number;
  rotX: number;
};

/**
 * What each chapter shows, keyed by the chapter's id. Every picture says
 * what its text says, and moves with the scroll while the chapter is read.
 */
const SCENES: Record<string, Scene> = {
  // A site as a crawler reads it, rising from the horizon, turning slowly.
  top: { sid: 0, state: () => [-1, 0, 0, 0], rotY: (p) => 0.15 + p * 0.5, rotX: -0.04 },
  // The crawl: a molten front runs from the home page out to the last pages as the chapter is read.
  features: { sid: 0, state: (p) => [-0.1 + p * 1.3, 0, 0, 0], rotY: (p) => 0.35 + p * 0.55, rotX: 0.1 },
  // Deploys through three checkpoints; the pull-request gate heats up as the defect piles on it.
  "how-it-works": { sid: 1, state: (p) => [smooth(0, 0.45, p), 0, 0, 0], rotY: (p) => -0.42 + p * 0.12, rotX: 0.06 },
  // The file: the noindex line lifts out, the lines close up and turn green.
  fix: { sid: 2, state: (p) => [smooth(0.08, 0.8, p), 0, 0, 0], rotY: (p) => -0.32 + p * 0.22, rotX: 0.04 },
  // Sites watched: 1, then 5, then 25 as the plans go by.
  start: { sid: 3, state: (p) => [p < 0.3 ? 0.02 : p < 0.62 ? 0.3 : 1.01, 0, 0, 0], rotY: (p) => 0.2 - p * 0.35, rotX: -0.12 },
};
const FALLBACK: Scene = SCENES.top!;

/**
 * The homepage's WebGL layer, screen-blended over the page. Every frame it
 * reads where the chapters are: the picture of the chapter on screen sits in
 * that chapter's stage box and moves with it; between two chapters it turns
 * from one picture into the next and travels from one box to the other,
 * following the scroll both ways.
 *
 * Loaded after the page is idle so it never competes with the first paint;
 * without WebGL2 (or float targets) the page reads fine without it.
 */
export function ForgeField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let disposed = false;
    let forge: Forge | null = null;

    const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
    const side = compact ? 128 : 256;
    const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);

    const sceneOf = (e: ChapterEntry) => SCENES[e.el.id] ?? FALLBACK;
    const progressOf = (e: ChapterEntry, vh: number) => clamp01((vh * 0.6 - e.top) / Math.max(1, e.bottom - e.top));

    const frame = (): ForgeFrame => {
      measureChapters();
      const { entries, viewport: vh } = chapters();
      const first = entries[0];
      const last = entries[entries.length - 1];
      if (!first || !last) {
        return { from: { sid: 0, state: [-1, 0, 0, 0] }, to: { sid: 0, state: [-1, 0, 0, 0] }, mix: 0, box: { cx: 0, cy: 0, w: 1, h: 1 }, rotY: 0, rotX: 0, opacity: 0 };
      }

      // The chapter coming in: the last one whose top has entered the viewport.
      let ci = 0;
      entries.forEach((e, i) => {
        if (e.top < vh) ci = i;
      });
      const cur = entries[ci]!;
      const prev = entries[Math.max(0, ci - 1)]!;
      // Hand-over from the previous picture: starts as the chapter enters, done when its top is at 40 %.
      const t = ci === 0 ? 1 : ease(clamp01((vh - cur.top) / (vh * 0.6)));
      const a = sceneOf(prev);
      const b = sceneOf(cur);
      const pa = progressOf(prev, vh);
      const pb = progressOf(cur, vh);
      const ra = prev.stageRect;
      const rb = cur.stageRect;

      // Past the last chapter (questions, footer) the field steps back.
      const past = clamp01((vh * 0.5 - last.bottom) / (vh * 0.5));

      return {
        from: { sid: a.sid, state: a.state(pa) },
        to: { sid: b.sid, state: b.state(pb) },
        mix: a.sid === b.sid ? 1 : t,
        box: {
          cx: lerp(ra.cx, rb.cx, t),
          cy: lerp(ra.cy, rb.cy, t),
          w: lerp(ra.w, rb.w, t),
          h: lerp(ra.h, rb.h, t),
        },
        rotY: lerp(a.rotY(pa), b.rotY(pb), t),
        rotX: lerp(a.rotX, b.rotX, t),
        opacity: 1 - 0.85 * past,
      };
    };

    const start = () => {
      import("./engine")
        .then(({ createForge }) => {
          if (disposed) return;
          try {
            forge = createForge(canvas, { side, dpr, motion }, frame);
            canvas.dataset.ready = "true";
          } catch {
            // No WebGL2 or no float render targets: the chapters read fine without.
          }
        })
        .catch(() => {});
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300);

    return () => {
      disposed = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      forge?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="forge-canvas pointer-events-none fixed inset-0 z-[1] h-full w-full mix-blend-screen"
    />
  );
}

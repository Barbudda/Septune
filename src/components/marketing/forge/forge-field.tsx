"use client";

import { useEffect, useRef } from "react";
import { chapters, measureChapters, progressOf, type ChapterEntry } from "./chapters";
import type { Forge, ForgeFrame } from "./engine";
import { clamp01, FALLBACK, SCENES } from "./scenes";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
      const pa = progressOf(prev.top, prev.bottom, vh);
      const pb = progressOf(cur.top, cur.bottom, vh);
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

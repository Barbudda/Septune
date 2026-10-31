"use client";

import { useEffect, useRef } from "react";
import { BUILD_START, chapters, measureChapters } from "./chapters";
import type { Forge, ForgeFrame } from "./engine";

const FIRST_BUILD = 2.6; // s: the first sculpture forming out of the loose cloud
const MORPH = 0.8; // s: coming back to a chapter that is already built

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The homepage's fixed WebGL layer. It decides, every frame, which sculpture
 * to show from the chapters' scroll state: a chapter that isn't built yet is
 * built in the middle of the screen as it scrolls in, then its sculpture
 * moves aside for the text. Built chapters are only switched to, never rebuilt.
 *
 * Loaded after the page is idle so it never competes with the first paint;
 * without WebGL2 (or float targets) the page simply reads without it.
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

    // What is on screen. The first chapter builds out of the loose cloud.
    let shown = -1;
    let from = -1;
    let to = -1;
    let mix = 0;
    let morph = 0;
    let morphFor = FIRST_BUILD;
    let morphing = false;
    let aside = 1; // 0: centred while building, 1: moved aside for the text

    const frame = (dt: number): ForgeFrame => {
      measureChapters();
      const { entries, viewport } = chapters();
      const wide = window.innerWidth >= 1024;
      const first = entries[0];
      const last = entries[entries.length - 1];
      if (!first || !last) return { shapeA: -1, shapeB: -1, mix: 0, x: 0, y: 0, size: 0.5, opacity: 1 };

      // The chapter in charge: the last one whose top has entered the build zone.
      let target = first;
      for (const e of entries) if (e.top < viewport * BUILD_START) target = e;

      let asideGoal = 1;
      if (!motion) {
        from = to = shown = target.shape;
        mix = 1;
      } else if (!target.built) {
        // Built by the scroll itself, from what is on screen to this chapter's sculpture.
        morphing = false;
        from = shown;
        to = target.shape;
        mix = easeInOut(target.progress);
        asideGoal = 1 - smooth(0, 0.35, target.progress);
      } else {
        if (to !== target.shape) {
          from = mix > 0.5 ? to : from;
          to = target.shape;
          morph = 0;
          morphFor = from === -1 ? FIRST_BUILD : MORPH;
          morphing = true;
        }
        if (morphing) {
          morph += dt;
          mix = easeInOut(clamp01(morph / morphFor));
          if (morph >= morphFor) morphing = false;
        } else {
          mix = 1;
        }
        if (mix >= 1) shown = to;
      }
      aside += (asideGoal - aside) * (1 - Math.exp(-dt * 5));
      if (!motion) aside = 1;

      // Past the last chapter (FAQ, footer) the field steps back.
      const past = clamp01((viewport * 0.55 - last.bottom) / (viewport * 0.45));

      // While a chapter builds, its sculpture stays inside the part of that
      // chapter already on screen (never behind the text above it) and
      // grows as that part does.
      const visible = clamp01(1 - Math.max(0, target.top) / viewport);
      const buildY = -(1 - visible) / 2;
      const fit = wide ? 0.6 : Math.min(0.42, (0.8 * window.innerWidth) / viewport);
      const buildSize = Math.max(0.18, Math.min(fit, visible * 0.82));

      if (wide) {
        return {
          shapeA: from,
          shapeB: to,
          mix,
          x: 0.23 * aside,
          y: buildY * (1 - aside),
          size: buildSize + (fit - buildSize) * aside,
          opacity: 1 - 0.95 * past,
        };
      }
      // Narrow screens: once built, the sculpture sits above the text, dimmed.
      return {
        shapeA: from,
        shapeB: to,
        mix,
        x: 0,
        y: buildY + (0.27 - buildY) * aside,
        size: buildSize + (fit * 0.8 - buildSize) * aside,
        opacity: (1 - 0.45 * aside) * (1 - 0.95 * past),
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
      className="forge-canvas pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}

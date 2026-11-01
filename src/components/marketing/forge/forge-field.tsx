"use client";

import { useEffect, useRef } from "react";
import type { Forge, ForgeFrame, ForgeRegion } from "./engine";
import { READOUTS, SCENES, type Step } from "./scenes";

/** Seconds for one figure to become the next, whatever the scroll speed. */
const TRANSITION = 1.8;
/** A step takes over when its top passes this fraction of the viewport. */
const ACTIVE_AT = 0.55;
/** Room left around a figure inside its stage, as a fraction of the stage. */
const INSET = 0.08;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Box = ForgeFrame["box"];
type Live = {
  step: Step;
  el: HTMLElement;
  /** Elements the figure can sit in for this step; the first one displayed is used. */
  stages: HTMLElement[];
  readout: HTMLElement | null;
  /** Where its story is, 0 -> 1. It only moves forward. */
  s: number;
};

/**
 * The homepage's WebGL layer. The scroll only chooses which step is being
 * read; a clock plays everything else: a figure turns into the next over
 * TRANSITION seconds, then the step's story plays once. Each figure sits in
 * its own stage (the hero, the panel beside the text, or a card on small
 * screens) and the canvas is masked to the stages on screen, so it never
 * draws over the page's text or paper.
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

    const steps: Live[] = Array.from(document.querySelectorAll<HTMLElement>("[data-forge-step]")).flatMap((el) => {
      const step = el.dataset.forgeStep as Step;
      if (!SCENES[step]) return [];
      return [
        {
          step,
          el,
          stages: Array.from(document.querySelectorAll<HTMLElement>(`[data-forge-stage~="${step}"]`)),
          readout: el.querySelector<HTMLElement>("[data-forge-readout]"),
          s: motion ? 0 : 1,
        },
      ];
    });
    const regionEls = Array.from(document.querySelectorAll<HTMLElement>("[data-forge-region]"));
    const panel = document.querySelector<HTMLElement>("[data-forge-panel]");
    if (!steps.length) return;

    const stageBox = (live: Live): Box | null => {
      for (const el of live.stages) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        return {
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2,
          w: r.width * (1 - 2 * INSET),
          h: r.height * (1 - 2 * INSET),
        };
      }
      return null;
    };

    const activeIndex = (vh: number) => {
      let i = 0;
      steps.forEach((live, k) => {
        if (live.el.getBoundingClientRect().top <= vh * ACTIVE_AT) i = k;
      });
      return i;
    };

    // Stage corners only change with the breakpoint: read once, and on resize.
    const radii = new Map<HTMLElement, number>();
    const readRadii = () => regionEls.forEach((el) => radii.set(el, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0));
    readRadii();
    window.addEventListener("resize", readRadii);

    // The figure formed on screen, the one it is turning into, and how far (0 -> 1).
    let shown = activeIndex(window.innerHeight);
    let target = shown;
    let t = 1;
    // A box jump left over when a transition is redirected; it fades out.
    let drift = { x: 0, y: 0, w: 0, h: 0 };
    let lastBox: Box | null = null;
    let lastStep: Step | null = null;

    // Every frame reads the page first and writes last, so the browser never
    // has to lay the page out twice in one frame.
    const frame = (dt: number): ForgeFrame => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // ---- reads
      const want = activeIndex(vh);
      const regions: ForgeRegion[] = [];
      for (const el of regionEls) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
        regions.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, r: radii.get(el) ?? 0 });
      }

      // The scroll picks the step; a new pick starts or redirects a transition.
      let jumped = false;
      if (want !== target) {
        if (!motion) {
          shown = target = want;
          t = 1;
        } else if (t >= 1) {
          target = want;
          t = 0;
        } else if (want === shown) {
          // Back to where it came from: play the way back from here.
          [shown, target] = [target, shown];
          t = 1 - t;
        } else {
          // Redirected half way: the figure most present becomes the start.
          if (t >= 0.5) shown = target;
          target = want;
          t = 0;
          jumped = true;
        }
      }
      if (t < 1) {
        t = Math.min(1, t + dt / TRANSITION);
        if (t >= 1) shown = target;
      }

      // The story of the figure on screen plays once it has formed.
      const cur = steps[target]!;
      const scene = SCENES[cur.step];
      if (t >= 1 && scene.story > 0 && cur.s < 1) cur.s = Math.min(1, cur.s + dt / scene.story);

      const from = steps[shown]!;
      const a = SCENES[from.step];
      const b = scene;
      const e = ease(t);
      const boxA = stageBox(from) ?? lastBox;
      const boxB = stageBox(cur) ?? boxA;
      let box: Box = boxA && boxB
        ? { cx: lerp(boxA.cx, boxB.cx, e), cy: lerp(boxA.cy, boxB.cy, e), w: lerp(boxA.w, boxB.w, e), h: lerp(boxA.h, boxB.h, e) }
        : { cx: vw / 2, cy: vh / 2, w: vw * 0.5, h: vh * 0.5 };
      if (lastBox && jumped) {
        // A redirect would make the picture jump: keep the gap and let it fade.
        drift = { x: lastBox.cx - box.cx, y: lastBox.cy - box.cy, w: lastBox.w - box.w, h: lastBox.h - box.h };
      }
      const fade = Math.exp(-dt / 0.3);
      drift = { x: drift.x * fade, y: drift.y * fade, w: drift.w * fade, h: drift.h * fade };
      box = { cx: box.cx + drift.x, cy: box.cy + drift.y, w: Math.max(40, box.w + drift.w), h: Math.max(40, box.h + drift.h) };
      lastBox = box;

      // ---- writes: the readouts in the text and the step marked in the panel.
      for (const live of steps) {
        const say = READOUTS[live.step];
        if (!say || !live.readout) continue;
        const text = say(live.s);
        if (live.readout.textContent !== text) live.readout.textContent = text;
      }
      if (panel && lastStep !== cur.step) {
        panel.dataset.active = cur.step;
        lastStep = cur.step;
      }

      return {
        from: { sid: a.sid, state: [a.state(from.s), 0, 0, 0] },
        to: { sid: b.sid, state: [b.state(cur.s), 0, 0, 0] },
        mix: shown === target ? 0 : t,
        box,
        rotY: lerp(a.rotY, b.rotY, e),
        rotX: lerp(a.rotX, b.rotX, e),
        regions,
      };
    };

    const start = () => {
      import("./engine")
        .then(({ createForge }) => {
          if (disposed) return;
          try {
            forge = createForge(canvas, { side, dpr, motion }, (dt) => frame(dt));
            canvas.dataset.ready = "true";
          } catch {
            // No WebGL2 or no float render targets: the steps read fine without.
          }
        })
        .catch(() => {});
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300);

    return () => {
      disposed = true;
      window.removeEventListener("resize", readRadii);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      forge?.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="forge-canvas pointer-events-none fixed inset-0 z-[1] h-full w-full" />;
}

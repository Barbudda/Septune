"use client";

import { useEffect, useRef } from "react";
import type { Forge, ForgeFrame, ForgeRegion } from "./engine";
import { READOUTS, SCENES, type Step } from "./scenes";

/** Seconds for one figure to become the next, whatever the scroll speed: fading across stages, travelling within one. */
const TRANSITION = 2;
const MORPH = 2.6;
/**
 * The point of a transition across stages where the picture changes stage:
 * the old figure has faded by then and the new one has not started to draw
 * (PHASES in shaders.ts), so the jump is never seen.
 */
const SWAP = 0.42;
/** How much the cursor tilts the galaxy, radians across the screen. */
const TILT = { y: 0.24, x: 0.07 };
/** On large screens a step takes over when its top passes this fraction of the viewport. */
const ACTIVE_AT = 0.55;
/** Room left around a figure inside its stage, as a fraction of the stage. */
const INSET = 0.08;

type Box = ForgeFrame["box"];
const ease = (x: number) => x * x * (3 - 2 * x);
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
 * read; a clock plays everything else. Within one stage the points of the
 * figure on screen travel to their places in the next (MORPH seconds);
 * from one stage to another the figure fades and the next draws itself in
 * its own stage (TRANSITION seconds). Then the step's story plays once.
 * Stages are the hero and the panel beside the text (a band at the top on
 * small screens); the canvas is masked to the stages on screen, so it never
 * draws over the page's paper, and dimmed behind the hero's words. Over the
 * hero the cursor tilts the galaxy and reads the pages under it.
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
    // Galaxy dust wants many fine points: 102 400 on large screens, 20 736 on
    // phones, drawn a little under their pixel ratio. More dropped a frame in
    // twenty on a 4x-throttled phone (2026-11-02).
    const side = compact ? 144 : 320;
    const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.3 : 2);

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
    const holeEls = Array.from(document.querySelectorAll<HTMLElement>("[data-forge-hole]"));
    const panel = document.querySelector<HTMLElement>("[data-forge-panel]");
    const hero = steps.find((l) => l.step === "hero")?.el;
    if (!steps.length) return;

    // The cursor over the hero, for the galaxy's lens and tilt. A mouse or a
    // pen only: a finger scrolls the page.
    let pointer: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      pointer = e.pointerType === "touch" ? null : { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      pointer = null;
    };
    hero?.addEventListener("pointermove", onMove, { passive: true });
    hero?.addEventListener("pointerleave", onLeave);

    // The plan the visitor points at in the watch step (hover or focus on a
    // plan): its sites light up. Read every frame from a data attribute.
    const watch = steps.find((l) => l.step === "watch")?.el;
    const pointTier = (e: Event) => {
      if (!watch) return;
      const tier = (e.target as HTMLElement).closest<HTMLElement>("[data-tier]")?.dataset.tier;
      if (tier) watch.dataset.tier = tier;
      else delete watch.dataset.tier;
    };
    const dropTier = () => {
      if (watch) delete watch.dataset.tier;
    };
    watch?.addEventListener("pointerover", pointTier);
    watch?.addEventListener("focusin", pointTier);
    watch?.addEventListener("pointerleave", dropTier);
    watch?.addEventListener("focusout", dropTier);

    const stageOf = (live: Live) => live.stages.find((el) => el.offsetWidth > 1 && el.offsetHeight > 1) ?? null;
    const stageBox = (live: Live): Box | null => {
      const el = stageOf(live);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        w: r.width * (1 - 2 * INSET),
        h: r.height * (1 - 2 * INSET),
      };
    };

    // Large screens: a step takes over when its top passes ACTIVE_AT. Small
    // ones: the panel is a band pinned at the top, so the line sits in the
    // text below it, and the steps only take over once the band is up.
    const activeIndex = (vh: number) => {
      const band = window.innerWidth < 1024 && panel ? panel.getBoundingClientRect() : null;
      const line = band ? band.bottom + (vh - band.bottom) * 0.3 : vh * ACTIVE_AT;
      const bandUp = !band || band.top < vh * 0.6;
      let i = 0;
      steps.forEach((live, k) => {
        if (k > 0 && !bandUp) return;
        if (live.el.getBoundingClientRect().top <= line) i = k;
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
    // Whether the transition under way stays in one stage (the points travel).
    let morph = false;
    let lastBox: Box | null = null;
    let lastStep: Step | null = null;
    const tilt = { x: 0, y: 0 };
    const begin = (to: number) => {
      target = to;
      t = 0;
      morph = stageOf(steps[shown]!) === stageOf(steps[to]!);
    };

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
      const holes: ForgeRegion[] = [];
      for (const el of holeEls) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.bottom <= 0 || r.top >= vh) continue;
        holes.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, r: 0 });
      }
      const tier = Number(watch?.dataset.tier ?? 0) || 0;

      // The scroll picks the step; a new pick starts or redirects a transition.
      if (want !== target) {
        if (!motion) {
          shown = target = want;
          t = 1;
        } else if (t >= 1) {
          begin(want);
        } else if (want === shown) {
          // Back to where it came from: play the way back from here.
          [shown, target] = [target, shown];
          t = 1 - t;
        } else {
          // Redirected: whichever figure is drawn now becomes the start.
          if (t >= (morph ? 0.5 : SWAP)) shown = target;
          begin(want);
        }
      }
      if (t < 1) {
        t = Math.min(1, t + dt / (morph ? MORPH : TRANSITION));
        if (t >= 1) shown = target;
      }

      // The story of the figure on screen plays once it has formed.
      const cur = steps[target]!;
      const scene = SCENES[cur.step];
      if (t >= 1 && scene.story > 0 && cur.s < 1) cur.s = Math.min(1, cur.s + dt / scene.story);

      const from = steps[shown]!;
      const a = SCENES[from.step];
      const b = scene;
      // Across stages, before SWAP the old figure stands in its own stage and
      // after it the new one in its; within one, the sizing and the view ease
      // from one figure to the other while the points travel.
      const moving = shown !== target;
      const before = moving && !morph && t < SWAP;
      const k = !moving ? 1 : morph ? ease(Math.min(1, Math.max(0, (t - 0.1) / 0.8))) : before ? 0 : 1;
      const box = (before ? stageBox(from) : stageBox(cur)) ?? lastBox ?? { cx: vw / 2, cy: vh / 2, w: vw * 0.5, h: vh * 0.5 };
      lastBox = box;

      // The cursor tilts the galaxy a little towards it, smoothly.
      const aim = cur.step === "hero" && pointer ? { y: (pointer.x / vw - 0.5) * TILT.y, x: (pointer.y / vh - 0.5) * TILT.x } : { x: 0, y: 0 };
      const follow = motion ? 1 - Math.exp(-dt / 0.6) : 1;
      tilt.x += (aim.x - tilt.x) * follow;
      tilt.y += (aim.y - tilt.y) * follow;
      const lean = (step: Step) => (step === "hero" ? tilt : { x: 0, y: 0 });

      // ---- writes: the readouts in the text and the step marked in the panel.
      for (const live of steps) {
        const say = READOUTS[live.step];
        if (!say || !live.readout) continue;
        const text = say(live.s, live.step === "watch" ? tier : 0);
        if (live.readout.textContent !== text) live.readout.textContent = text;
      }
      if (panel && lastStep !== cur.step) {
        panel.dataset.active = cur.step;
        lastStep = cur.step;
      }

      const ra = { x: a.rotX + lean(from.step).x, y: a.rotY + lean(from.step).y };
      const rb = { x: b.rotX + lean(cur.step).x, y: b.rotY + lean(cur.step).y };
      return {
        from: { sid: a.sid, state: [a.state(from.s, tier), 0, 0, 0] },
        to: { sid: b.sid, state: [b.state(cur.s, tier), 0, 0, 0] },
        mix: moving ? t : 0,
        morph: moving && morph ? 1 : 0,
        fit: k,
        box,
        rotY: ra.y + (rb.y - ra.y) * k,
        rotX: ra.x + (rb.x - ra.x) * k,
        regions,
        holes,
        pointer: cur.step === "hero" ? pointer : null,
      };
    };

    // The labels are drawn in the page's monospace: wait for it, briefly.
    const probe = document.querySelector<HTMLElement>(".font-mono") ?? document.body;
    const font = getComputedStyle(probe).fontFamily;
    const start = () => {
      const fontReady = Promise.race([document.fonts.load(`500 44px ${font}`), new Promise((done) => setTimeout(done, 1500))]);
      Promise.all([import("./engine"), fontReady.catch(() => {})])
        .then(([{ createForge }]) => (disposed ? null : createForge(canvas, { side, dpr, motion, font }, (dt) => frame(dt))))
        .then((made) => {
          if (!made) return;
          if (disposed) return made.dispose();
          forge = made;
          canvas.dataset.ready = "true";
        })
        // No WebGL2 or no float render targets: the steps read fine without.
        .catch(() => {});
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 300);

    return () => {
      disposed = true;
      window.removeEventListener("resize", readRadii);
      hero?.removeEventListener("pointermove", onMove);
      hero?.removeEventListener("pointerleave", onLeave);
      watch?.removeEventListener("pointerover", pointTier);
      watch?.removeEventListener("focusin", pointTier);
      watch?.removeEventListener("pointerleave", dropTier);
      watch?.removeEventListener("focusout", dropTier);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      forge?.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="forge-canvas pointer-events-none fixed inset-0 h-full w-full" />;
}

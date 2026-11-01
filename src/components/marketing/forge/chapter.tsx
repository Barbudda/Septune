"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { registerChapter, startsBelow } from "./chapters";
import { READOUTS } from "./readouts";

/**
 * A homepage chapter. Its picture in the forge field is chosen by its id
 * (see SCENES in scenes.ts) and sits in its [data-stage] box. Its text
 * is in the server HTML and visible without JavaScript; it only waits to be
 * read in when the chapter starts below the fold and motion is allowed.
 * Read in once, then left alone: scrolling back up shows it as it is.
 *
 * Reveal state lives in a data attribute (CSS does the animation), so a
 * reveal never re-renders React. The caption's readout and the log behind
 * the picture follow the scroll the same way, written straight into the DOM
 * only when a word or a line changes. The log moves with the reading, not
 * with a clock: a timed animation cost a sixth of the frame rate on a
 * throttled phone (2026-11-01).
 */
export function Chapter({
  id,
  first = false,
  labelledBy,
  className,
  children,
}: {
  id: string;
  /** The hero: its text never waits. */
  first?: boolean;
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = !first && motion && startsBelow(el);
    if (wait) el.dataset.chapter = "waiting";
    const readout = el.querySelector<HTMLElement>("[data-readout]");
    const say = READOUTS[id];
    const rolls = motion
      ? Array.from(el.querySelectorAll<HTMLElement>(".ledger-roll"), (node) => ({ node, n: Number(node.dataset.n) || 0, at: 0 }))
      : [];
    return registerChapter(el, {
      revealedNow: !wait,
      onReveal: () => {
        if (el.dataset.chapter !== "waiting") return;
        el.dataset.chapter = "revealed";
        countUp(el);
      },
      onProgress: (p) => {
        if (readout && say) {
          const text = say(p);
          if (readout.textContent !== text) readout.textContent = text;
        }
        // Over the chapter the log scrolls through its whole list, a line at a time.
        for (const roll of rolls) {
          const at = Math.round(p * roll.n);
          if (at === roll.at) continue;
          roll.at = at;
          roll.node.style.transform = `translateY(${-at}lh)`;
        }
      },
    });
  }, [first, id]);

  return (
    <section ref={ref} id={id} aria-labelledby={labelledBy} className={cn("chapter relative overflow-x-clip", className)}>
      {children}
    </section>
  );
}

/** Numbers marked data-count climb to their value once, when the chapter is read in. */
function countUp(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
    const end = Number(node.dataset.count);
    if (!Number.isFinite(end)) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 900);
      node.textContent = String(Math.round(end * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

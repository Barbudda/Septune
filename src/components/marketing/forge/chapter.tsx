"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { registerChapter, startsBelow } from "./chapters";

/**
 * A homepage chapter. Its picture in the forge field is chosen by its id
 * (see SCENES in forge-field.tsx) and sits in its [data-stage] box. Its text
 * is in the server HTML and visible without JavaScript; it only waits to be
 * read in when the chapter starts below the fold and motion is allowed.
 * Read in once, then left alone: scrolling back up shows it as it is.
 *
 * Reveal state lives in a data attribute (CSS does the animation), so a
 * reveal never re-renders React.
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
    return registerChapter(el, {
      revealedNow: !wait,
      onReveal: () => {
        if (el.dataset.chapter !== "waiting") return;
        el.dataset.chapter = "revealed";
        countUp(el);
      },
    });
  }, [first]);

  return (
    <section ref={ref} id={id} aria-labelledby={labelledBy} className={cn("chapter relative", className)}>
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

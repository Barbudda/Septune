"use client";

import { useEffect } from "react";

/**
 * Reads in the page's [data-reveal] blocks once, as they come into view.
 * Their text is in the server HTML and visible without JavaScript: only what
 * starts below the fold waits, and only when motion is allowed. Once shown a
 * block stays shown; scrolling back up never replays it (Hugo, 2026-10-31:
 * replaying is friction).
 */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const below = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.9,
    );
    below.forEach((el) => (el.dataset.reveal = "waiting"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.reveal = "shown";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

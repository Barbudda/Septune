/**
 * The homepage chapters and how far each one is built. One sculpture per
 * chapter: it builds while the chapter scrolls in, then stays built for the
 * rest of the visit. Scrolling back up never replays anything (Hugo,
 * 2026-10-31: replaying animations on the way up is friction).
 *
 * Plain module state instead of React state: the WebGL loop reads it every
 * frame and the chapters only need one event, the moment they are built.
 */

export type ChapterEntry = {
  el: HTMLElement;
  /** Sculpture id, see shapeSDF in shaders.ts. */
  shape: number;
  /** 0 when the chapter's top enters the build zone, 1 when the sculpture is complete. */
  progress: number;
  top: number;
  bottom: number;
  built: boolean;
  onBuilt?: () => void;
};

// The sculpture builds while the chapter's top travels from 85 % to 15 % of
// the viewport height, then the text appears.
export const BUILD_START = 0.85;
export const BUILD_END = 0.15;

const entries: ChapterEntry[] = [];
let viewport = 1;
let frame = 0;
let listening = false;

function measure() {
  frame = 0;
  viewport = window.innerHeight || 1;
  for (const e of entries) {
    const r = e.el.getBoundingClientRect();
    e.top = r.top;
    e.bottom = r.bottom;
    e.progress = Math.min(1, Math.max(0, (viewport * BUILD_START - r.top) / (viewport * (BUILD_START - BUILD_END))));
    if (!e.built && e.progress >= 1) {
      e.built = true;
      e.onBuilt?.();
    }
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

/**
 * Registers a chapter. `builtNow` marks it built from the start (the hero,
 * or a chapter already above the build line when the page loads).
 */
export function registerChapter(
  el: HTMLElement,
  shape: number,
  opts: { builtNow?: boolean; onBuilt?: () => void } = {},
): () => void {
  const entry: ChapterEntry = { el, shape, progress: 0, top: 0, bottom: 0, built: !!opts.builtNow, onBuilt: opts.onBuilt };
  entries.push(entry);
  // Keep document order whatever the mount order.
  entries.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  if (!listening) {
    listening = true;
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  measure();
  return () => {
    const i = entries.indexOf(entry);
    if (i >= 0) entries.splice(i, 1);
    if (!entries.length && listening) {
      listening = false;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/** True when the chapter starts below the build line and should wait to be built. */
export function startsBelow(el: HTMLElement): boolean {
  return el.getBoundingClientRect().top > window.innerHeight * BUILD_END;
}

export function chapters(): { entries: readonly ChapterEntry[]; viewport: number } {
  return { entries, viewport };
}

/** The WebGL loop calls this every frame so the state is never a frame late. */
export function measureChapters() {
  measure();
}

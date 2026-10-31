/**
 * The homepage chapters and where they are on screen. The WebGL loop reads
 * this every frame to place and shape the picture; the chapters use it for
 * one event, the moment their text is read in. That happens once: scrolling
 * back up never replays it (Hugo, 2026-10-31: replaying is friction).
 *
 * Plain module state instead of React state, so a frame never waits on a render.
 */

export type ChapterEntry = {
  el: HTMLElement;
  /** The box in the chapter where the picture sits ([data-stage]). */
  stage: HTMLElement | null;
  top: number;
  bottom: number;
  stageRect: { cx: number; cy: number; w: number; h: number };
  revealed: boolean;
  onReveal?: () => void;
};

/** A chapter's text is read in when its top reaches this fraction of the viewport. */
export const REVEAL_AT = 0.6;

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
    const s = (e.stage ?? e.el).getBoundingClientRect();
    e.stageRect = { cx: s.left + s.width / 2, cy: s.top + s.height / 2, w: s.width, h: s.height };
    if (!e.revealed && r.top <= viewport * REVEAL_AT) {
      e.revealed = true;
      e.onReveal?.();
    }
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

/** Registers a chapter. `revealedNow` skips the reveal (the hero, or a chapter already passed on load). */
export function registerChapter(el: HTMLElement, opts: { revealedNow?: boolean; onReveal?: () => void } = {}): () => void {
  const entry: ChapterEntry = {
    el,
    stage: el.querySelector<HTMLElement>("[data-stage]"),
    top: 0,
    bottom: 0,
    stageRect: { cx: 0, cy: 0, w: 1, h: 1 },
    revealed: !!opts.revealedNow,
    onReveal: opts.onReveal,
  };
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

/** True when the chapter starts below the reveal line and its text should wait. */
export function startsBelow(el: HTMLElement): boolean {
  return el.getBoundingClientRect().top > window.innerHeight * REVEAL_AT;
}

export function chapters(): { entries: readonly ChapterEntry[]; viewport: number } {
  return { entries, viewport };
}

/** The WebGL loop calls this every frame so the picture is never a frame behind the page. */
export function measureChapters() {
  measure();
}

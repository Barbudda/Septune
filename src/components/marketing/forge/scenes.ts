import type { ForgeSlot } from "./engine";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export type Scene = {
  /** Structure id, see structures.ts: 0 tree, 1 stream, 2 code, 3 sites. */
  sid: number;
  /** The chapter's state from its own progress (progressOf in chapters.ts). */
  state: (p: number) => ForgeSlot["state"];
  rotY: (p: number) => number;
  rotX: number;
};

/** Which plan the sites picture shows at a point of the start chapter: 0 free, 1 pro, 2 studio. */
export const tierAt = (p: number) => (p < 0.3 ? 0 : p < 0.62 ? 1 : 2);

/**
 * What each chapter shows, keyed by the chapter's id. Every picture says
 * what its text says, and moves with the scroll while the chapter is read.
 * The captions under the pictures read the same states (readouts.ts).
 */
export const SCENES: Record<string, Scene> = {
  // A site as a crawler reads it, rising from the horizon, turning slowly.
  top: { sid: 0, state: () => [-1, 0, 0, 0], rotY: (p) => 0.15 + p * 0.5, rotX: -0.04 },
  // The crawl: a molten front runs from the home page out to the last pages as the chapter is read.
  features: { sid: 0, state: (p) => [-0.1 + p * 1.3, 0, 0, 0], rotY: (p) => 0.35 + p * 0.55, rotX: 0.1 },
  // Deploys through three checkpoints; the pull-request gate heats up as the defect piles on it.
  "how-it-works": { sid: 1, state: (p) => [smooth(0, 0.45, p), 0, 0, 0], rotY: (p) => -0.42 + p * 0.12, rotX: 0.06 },
  // The file: the noindex line lifts out, the lines close up and turn green.
  fix: { sid: 2, state: (p) => [smooth(0.08, 0.8, p), 0, 0, 0], rotY: (p) => -0.32 + p * 0.22, rotX: 0.04 },
  // Sites watched: 1, then 5, then 25 as the plans go by.
  start: { sid: 3, state: (p) => [[0.02, 0.3, 1.01][tierAt(p)]!, 0, 0, 0], rotY: (p) => 0.2 - p * 0.35, rotX: -0.12 },
};
export const FALLBACK: Scene = SCENES.top!;

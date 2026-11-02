import { FIGURE, GALAXY_TILT, SITE_TIERS, TREE_PAGES, crawlOrder } from "./structures";
import { PRICING_TIERS } from "@/lib/pricing";

/** The homepage steps that have a figure, in page order. */
export const STEPS = ["hero", "read", "catch", "fix", "watch"] as const;
export type Step = (typeof STEPS)[number];

export type Scene = {
  sid: number;
  /** Seconds its story plays once the figure has formed; 0 when it has none. */
  story: number;
  /**
   * The figure's state (st.x in the shaders) at a point s (0 -> 1) of its
   * story; `tier` is the plan the visitor points at, for the watch step.
   */
  state: (s: number, tier: number) => number;
  /** A fixed three-quarter view: the scroll never turns the figure. */
  rotY: number;
  rotX: number;
};

/**
 * What each step shows. A step's story plays once, on a clock, after its
 * figure has formed; scrolling back shows it where it stopped (Hugo,
 * 2026-10-31: replaying is friction).
 */
export const SCENES: Record<Step, Scene> = {
  // septune.dev's 94 pages as a galaxy, turning; it reads one page at a time, and the pages under the cursor.
  hero: { sid: FIGURE.galaxy, story: 0, state: () => 0, rotY: 0, rotX: GALAXY_TILT },
  // septune.dev's own 94 pages, read from the home page down.
  read: { sid: FIGURE.tree, story: 6.5, state: (s) => -0.03 + s * 1.08, rotY: -0.1, rotX: 0.05 },
  // Pages fall through the check; the one that would leave Google lands on it and stays.
  catch: { sid: FIGURE.gate, story: 3.2, state: (s) => s, rotY: 0.16, rotX: 0.03 },
  // The noindex line slides out of the file, the file closes up.
  fix: { sid: FIGURE.code, story: 3.4, state: (s) => s, rotY: -0.14, rotX: 0.04 },
  // The free site lit, the others waiting; pointing at Pro or Studio lights 5 or 25.
  watch: { sid: FIGURE.sites, story: 0, state: (_s, tier) => SITE_TIERS[tier] ?? SITE_TIERS[0]!, rotY: 0.2, rotX: -0.12 },
};

/**
 * What the step's readout says at a point of its story. It reads the same
 * state as the particles, so the words and the figure never disagree; the
 * server HTML carries the end state (s = 1).
 */
export const READOUTS: Partial<Record<Step, (s: number, tier: number) => string>> = {
  read: (s) => {
    const front = SCENES.read.state(s, 0);
    let n = 0;
    for (let i = 0; i < TREE_PAGES; i++) if (crawlOrder(i) <= front) n++;
    if (n === 0) return "the crawl starts at the home page";
    return n >= TREE_PAGES ? `${TREE_PAGES} pages read in 8 seconds` : `${n} of ${TREE_PAGES} pages read`;
  },
  catch: (s) => (s < 0.55 ? "comparing the preview with production" : "1 critical change: /pricing became noindex"),
  fix: (s) => (s < 0.45 ? "finding: /pricing is set to noindex" : "/pricing can be indexed again"),
  watch: (_s, t) => {
    const tier = PRICING_TIERS[t] ?? PRICING_TIERS[0];
    if (!tier) return "";
    const { sites, frequency } = tier.limits;
    return `${tier.name}: ${sites} ${sites === 1 ? "site" : "sites"}, checked ${frequency}`;
  },
};

export const finalReadout = (step: Step) => READOUTS[step]?.(1, 0) ?? "";

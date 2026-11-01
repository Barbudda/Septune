import { PRICING_TIERS } from "@/lib/pricing";
import { CHILDREN, DEPTH } from "./shape";
import { clamp01, SCENES, tierAt } from "./scenes";

/*
 * The line under each picture that says what the picture is doing at this
 * point of the scroll. It reads the same state as the particles (SCENES), so
 * the words and the picture never disagree. Plain strings: the chapter writes
 * them into its [data-readout] only when they change.
 */

// Pages per depth of the drawn tree: 1 home page, 5 sections, 15, 45, 90, 180.
const PER_DEPTH = CHILDREN.reduce((acc, k) => [...acc, acc[acc.length - 1]! * k], [1]);
const PAGES = PER_DEPTH.reduce((s, n) => s + n, 0);

/**
 * Pages read once the crawl front is at `s`. A page of depth d is read when
 * its crawl order, (d + up to 0.6) / (DEPTH + 0.6) in structures.ts, is below
 * the front; spread evenly over that 0.6 the count climbs smoothly.
 */
function pagesRead(s: number) {
  const x = s * (DEPTH + 0.6);
  return Math.round(PER_DEPTH.reduce((sum, n, d) => sum + n * clamp01(d === 0 ? x / 0.05 : (x - d) / 0.6), 0));
}

const stateOf = (id: string, p: number) => SCENES[id]!.state(p)[0];

export const READOUTS: Record<string, (p: number) => string> = {
  features: (p) => {
    const n = pagesRead(stateOf("features", p));
    if (n === 0) return "the crawl starts at the home page";
    return n >= PAGES ? `all ${PAGES} pages read` : `${n} of ${PAGES} pages read`;
  },
  "how-it-works": (p) => {
    const s = stateOf("how-it-works", p);
    if (s < 0.3) return "comparing the preview with production";
    if (s < 0.85) return "1 critical change: /pricing became noindex";
    return "check failing: the merge waits for the fix";
  },
  fix: (p) => {
    const s = stateOf("fix", p);
    if (s < 0.05) return "finding: robots set to noindex";
    if (s < 0.6) return "the patch removes 1 line";
    return "/pricing can be indexed again";
  },
  start: (p) => {
    const tier = PRICING_TIERS[tierAt(p)];
    if (!tier) return "";
    const { sites, frequency } = tier.limits;
    return `${tier.name.toLowerCase()}: ${sites} ${sites === 1 ? "site" : "sites"} watched, checked ${frequency}`;
  },
};

/** The readout a chapter shows before any scroll: its end state, so the server HTML says the whole story. */
export const finalReadout = (id: string) => READOUTS[id]?.(1) ?? "";

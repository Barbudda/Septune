/*
 * The homepage's five features, in page order. Kept out of product-views.tsx:
 * a "use client" module only hands the server references to its exports, so
 * the page (a server component) could not read these labels from there.
 */
export const VIEWS = ["crawl", "pr", "fix", "monitor", "ai"] as const;
export type View = (typeof VIEWS)[number];

/** Short names, the same in the step labels and the panel's chips. */
export const VIEW_LABELS: Record<View, string> = {
  crawl: "Crawl",
  pr: "PR check",
  fix: "Fix",
  monitor: "Monitor",
  ai: "AI search",
};

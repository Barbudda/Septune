/**
 * The site tree's shape, shared by the particle structure (structures.ts)
 * and the crawl readout under it (readouts.ts), so the number of pages the
 * caption counts is the number of pages the picture draws.
 */

export const DEPTH = 5;
// The home page links to five sections, each to a few pages, and so on.
export const CHILDREN = [5, 3, 3, 2, 2];

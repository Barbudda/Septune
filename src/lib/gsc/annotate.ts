import type { SnapshotDiff } from "@/lib/audit/snapshot";
import { issueTraffic, trafficForPath, type TrafficIndex } from "./export";

const LEVEL_RANK = { critical: 3, warning: 2, info: 1 } as const;

/**
 * Put the Search Console clicks on each change of a diff: the page's own for a
 * page change, the sum of the listed pages for an issue change. Changes whose
 * pages the export doesn't list get no number, and within one level the ones
 * with the most clicks come first.
 */
export function annotateDiff(d: SnapshotDiff, idx: TrafficIndex): SnapshotDiff {
  const changes = d.changes.map((c) => {
    const t = c.paths ? issueTraffic(idx, c.paths.map((url) => ({ url }))) : c.path ? trafficForPath(idx, c.path) : null;
    return t ? { ...c, clicks: t.clicks, impressions: t.impressions } : c;
  });
  changes.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || (b.clicks ?? 0) - (a.clicks ?? 0));
  return { ...d, changes, traffic: { period: idx.period } };
}

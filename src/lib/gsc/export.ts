/**
 * Search Console Performance export (Pages tab) → traffic per page, so a
 * finding can say how many clicks it puts at stake. Pure parsing, no I/O.
 * Nothing is estimated: a page absent from the export gets no number.
 */

export interface PageTraffic {
  clicks: number;
  impressions: number;
}

export interface TrafficIndex {
  /** The export's date range when the file says so (zip's Filters sheet), else null. */
  period: string | null;
  byPath: Map<string, PageTraffic>;
}

export interface IssueTraffic extends PageTraffic {
  /** Pages of the finding that appear in the export, most clicks first. */
  pages: { url: string; clicks: number; impressions: number }[];
}

/** Host-free key: protocol, www, query, fragment and trailing slash don't matter. */
export function pathKey(urlOrPath: string): string {
  let p = urlOrPath.trim();
  try {
    p = new URL(p, "https://x.invalid").pathname;
  } catch {
    /* keep raw */
  }
  try {
    p = decodeURI(p);
  } catch {
    /* keep encoded */
  }
  return p.replace(/\/+$/, "") || "/";
}

/** RFC 4180 with a detected delimiter (Google writes commas; some locales save with ; or tabs). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => first.split(ch).length - 1;
  const delim = count("\t") > count(",") && count("\t") > count(";") ? "\t" : count(";") > count(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const CLICKS = /^(clicks?|clics?)$/i;
const IMPRESSIONS = /^(impressions?|impr\.?)$/i;

/** Integers only: "1 240", "1,240" and "1.240" (thousand separators) all read as 1240. */
function count(v: string | undefined): number | null {
  const digits = (v ?? "").replace(/[\s  .,]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/**
 * Parse the Pages sheet. Headers in English ("Top pages, Clicks, Impressions,
 * CTR, Position") or French ("Pages les plus populaires, Clics, Impressions,
 * CTR, Position"): the page is the first column, clicks and impressions are
 * found by name. Rows for the same page are summed.
 */
export function parseGscPages(csv: string, period: string | null = null): TrafficIndex {
  const rows = parseCsv(csv);
  const head = rows[0]?.map((h) => h.trim()) ?? [];
  const ci = head.findIndex((h) => CLICKS.test(h));
  const ii = head.findIndex((h) => IMPRESSIONS.test(h));
  if (ci < 0 || ii < 0) {
    throw new Error('not a Search Console Pages export: expected the columns "Top pages, Clicks, Impressions" (or "Clics" in French)');
  }
  const byPath = new Map<string, PageTraffic>();
  for (const r of rows.slice(1)) {
    const url = r[0]?.trim();
    const clicks = count(r[ci]);
    const impressions = count(r[ii]);
    if (!url || clicks === null || impressions === null) continue;
    const key = pathKey(url);
    const prev = byPath.get(key);
    byPath.set(key, { clicks: (prev?.clicks ?? 0) + clicks, impressions: (prev?.impressions ?? 0) + impressions });
  }
  if (byPath.size === 0) throw new Error("the Search Console export has no page rows");
  return { period, byPath };
}

/** The date range from the zip's Filters sheet ("Date,Last 3 months" / "Date,3 derniers mois"). */
export function parseGscPeriod(filtersCsv: string): string | null {
  for (const r of parseCsv(filtersCsv)) {
    if (/^(date|dates|plage de dates|date range)\b/i.test(r[0]?.trim() ?? "") && r[1]?.trim()) return r[1].trim();
  }
  return null;
}

export function trafficForPath(idx: TrafficIndex, urlOrPath: string): PageTraffic | null {
  return idx.byPath.get(pathKey(urlOrPath)) ?? null;
}

/** Clicks and impressions of a finding's pages that the export lists; null when none is. */
export function issueTraffic(idx: TrafficIndex, affected: { url: string }[]): IssueTraffic | null {
  const seen = new Set<string>();
  const pages: IssueTraffic["pages"] = [];
  for (const a of affected) {
    const key = pathKey(a.url);
    if (seen.has(key)) continue;
    seen.add(key);
    const t = idx.byPath.get(key);
    if (t) pages.push({ url: a.url, clicks: t.clicks, impressions: t.impressions });
  }
  if (!pages.length) return null;
  pages.sort((a, b) => b.clicks - a.clicks);
  return {
    clicks: pages.reduce((s, p) => s + p.clicks, 0),
    impressions: pages.reduce((s, p) => s + p.impressions, 0),
    pages,
  };
}

/** "in the export (Last 3 months)" / "in the export". */
export function periodLabel(idx: TrafficIndex): string {
  return idx.period ? `in the export (${idx.period})` : "in the export";
}

export function formatClicks(n: number): string {
  return `${n.toLocaleString("en-US")} click${n === 1 ? "" : "s"}`;
}

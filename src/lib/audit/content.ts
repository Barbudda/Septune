import { embed, cosine } from "@/lib/brain/embed";
import type { CrawledPage } from "./types";
import { normalizePath } from "./link-graph";

/**
 * Content-level analysis — near-duplicate detection and semantic internal-link
 * suggestions. Fully in-house: shingled Jaccard for duplication, and the
 * brain's local embeddings (no external API) for topical similarity. This is
 * the "maximize the site" layer that goes beyond checkbox SEO.
 */

/** 32-bit FNV-1a hash of a string. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Set of word-shingle hashes (k consecutive words) for near-dup detection. */
function shingles(text: string, k = 8): Set<number> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const set = new Set<number>();
  if (words.length < k) {
    if (words.length) set.add(hash(words.join(" ")));
    return set;
  }
  for (let i = 0; i + k <= words.length; i++) {
    set.add(hash(words.slice(i, i + k).join(" ")));
  }
  return set;
}

function jaccard(a: Set<number>, b: Set<number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * The words of each text that aren't template: any run of BOILER_K words
 * that recurs on at least BOILER_SHARE of the pages (menu, footer, the
 * headings every page of a section repeats) is set aside. What remains is
 * what the page is about. A page left with almost nothing keeps its text.
 */
const BOILER_K = 6;
const BOILER_SHARE = 0.3;
export function withoutBoilerplate(texts: string[]): string[] {
  const words = texts.map((t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
  if (texts.length < 5) return words.map((w) => w.join(" "));
  const runs = words.map((ws) => {
    const hs: number[] = [];
    for (let i = 0; i + BOILER_K <= ws.length; i++) hs.push(hash(ws.slice(i, i + BOILER_K).join(" ")));
    return hs;
  });
  const pagesWith = new Map<number, number>();
  for (const hs of runs) for (const h of new Set(hs)) pagesWith.set(h, (pagesWith.get(h) ?? 0) + 1);
  const limit = Math.max(3, Math.ceil(texts.length * BOILER_SHARE));
  return words.map((ws, p) => {
    const keep = ws.map(() => true);
    runs[p]!.forEach((h, i) => {
      if ((pagesWith.get(h) ?? 0) >= limit) for (let k = i; k < i + BOILER_K; k++) keep[k] = false;
    });
    const own = ws.filter((_, i) => keep[i]);
    return (own.length >= 20 ? own : ws).join(" ");
  });
}

export interface DuplicateCluster {
  paths: string[];
  similarity: number;
}

export interface LinkSuggestion {
  from: string;
  to: string;
  similarity: number;
  /** A human anchor hint = the target page's title/first heading. */
  anchorHint: string;
}

export interface ContentAnalysis {
  /** Near-duplicate content clusters (Jaccard ≥ threshold). */
  duplicateClusters: DuplicateCluster[];
  /** Semantic internal-link opportunities the site hasn't wired yet. */
  linkSuggestions: LinkSuggestion[];
}

/**
 * @param pages crawled pages (HTML 200s only should be passed).
 * @param startUrl base for path normalization.
 * @param alreadyLinks edges that already exist, as "fromPath toPath" (paths are
 *   URL-encoded, so a space never appears inside one).
 */
export function analyzeContent(
  pages: CrawledPage[],
  startUrl: string,
  alreadyLinks: Set<string>,
): ContentAnalysis {
  const paths = pages.map((p) => normalizePath(p.url, startUrl) ?? p.url);

  // ── Near-duplicate clusters via shingled Jaccard ──────────────────
  const shingleSets = pages.map((p) => shingles(p.textContent));
  const duplicateClusters: DuplicateCluster[] = [];
  const clustered = new Set<number>();
  const DUP_THRESHOLD = 0.72;
  for (let i = 0; i < pages.length; i++) {
    if (clustered.has(i) || shingleSets[i]!.size === 0) continue;
    const cluster = [i];
    for (let j = i + 1; j < pages.length; j++) {
      if (clustered.has(j)) continue;
      const sim = jaccard(shingleSets[i]!, shingleSets[j]!);
      if (sim >= DUP_THRESHOLD) {
        cluster.push(j);
        clustered.add(j);
      }
    }
    if (cluster.length > 1) {
      cluster.forEach((c) => clustered.add(c));
      const sims = cluster
        .slice(1)
        .map((j) => jaccard(shingleSets[i]!, shingleSets[j]!));
      duplicateClusters.push({
        paths: cluster.map((c) => paths[c]!),
        similarity: Math.round((sims.reduce((s, v) => s + v, 0) / sims.length) * 100) / 100,
      });
    }
  }

  // ── Semantic internal-link suggestions (local embeddings) ─────────
  // Compared on what each page is about, not on the template it shares: on a
  // site where every page carries the same menu, footer and section headings,
  // whole text made every page "related" to every other.
  const own = withoutBoilerplate(
    pages.map((p) => `${p.title ?? ""} ${p.headings.map((h) => h.text).join(" ")} ${p.textContent}`),
  );
  const vectors = own.map((text) => embed(text));
  const linkSuggestions: LinkSuggestion[] = [];
  const SIM_THRESHOLD = 0.55;
  const NEAREST = 3;
  for (let i = 0; i < pages.length; i++) {
    // Rank other pages by topical similarity to page i.
    const ranked: { j: number; sim: number }[] = [];
    for (let j = 0; j < pages.length; j++) {
      if (i === j) continue;
      const sim = cosine(vectors[i]!, vectors[j]!);
      if (sim >= SIM_THRESHOLD) ranked.push({ j, sim });
    }
    ranked.sort((a, b) => b.sim - a.sim);
    // Suggest, among page i's NEAREST closest pages, those it doesn't link to
    // and that aren't near-duplicates of it (a different problem). Only the
    // nearest: a page that already links to its closest topics is linked
    // well, even when a large section of similar pages lies further down
    // (before, the search went on until it found two unlinked pages, so a
    // docs section of 69 pages always had suggestions left).
    let added = 0;
    for (const { j, sim } of ranked.slice(0, NEAREST)) {
      if (added >= 2) break;
      const from = paths[i]!;
      const to = paths[j]!;
      if (alreadyLinks.has(`${from} ${to}`)) continue;
      if (duplicateClusters.some((c) => c.paths.includes(from) && c.paths.includes(to))) continue;
      const anchorHint =
        pages[j]!.title || pages[j]!.h1s[0] || pages[j]!.headings[0]?.text || to;
      linkSuggestions.push({
        from,
        to,
        similarity: Math.round(sim * 100) / 100,
        anchorHint: anchorHint.slice(0, 80),
      });
      added++;
    }
  }
  // Keep the strongest suggestions overall.
  linkSuggestions.sort((a, b) => b.similarity - a.similarity);

  return { duplicateClusters, linkSuggestions: linkSuggestions.slice(0, 40) };
}

import type { CrawledPage } from "./types";
import type { PageState, SiteChange } from "./snapshot";
import { shingles } from "./content";
import { jsonLdTypes, QUESTION_RE } from "./geo";
import { normalizePath } from "./link-graph";

/**
 * What a page says, kept small enough for a snapshot, and what changed in it
 * between two snapshots: H1 and title, the amount of text, internal links in,
 * schema types, a removed FAQ, and pages that turned into copies of each
 * other. The snapshot stores a few numbers per page, never the text.
 */

export interface ContentSignals {
  /** Visible words. */
  words: number;
  /** JSON-LD @type values, sorted, unique. */
  schema: string[];
  /** A FAQ block: FAQPage schema, or at least 3 <details> or question headings. */
  faq: boolean;
  /** Internal link targets (paths), unique, capped. */
  links: string[];
  /** Bottom-k sketch of the text's 8-word shingles, to estimate similarity. */
  sketch: number[];
}

const LINKS_CAP = 150;
const SKETCH_K = 48;
/** Under this many words a page has too little text for a share or a similarity to mean anything. */
const MIN_WORDS = 100;

export function contentSignals(p: CrawledPage): ContentSignals {
  const links = new Set<string>();
  const self = normalizePath(p.url, p.url);
  for (const l of p.links) {
    if (!l.internal) continue;
    const t = normalizePath(l.href, p.url);
    if (t && t !== self) links.add(t);
    if (links.size >= LINKS_CAP) break;
  }
  const schema = [...new Set(jsonLdTypes(p))].sort();
  const questions = p.headings.filter((h) => h.level >= 2 && h.level <= 3 && QUESTION_RE.test(h.text)).length;
  const details = (p.html.match(/<details[\s>]/gi) ?? []).length;
  return {
    words: p.wordCount,
    schema,
    faq: schema.includes("FAQPage") || questions >= 3 || details >= 3,
    links: [...links],
    sketch: [...shingles(p.textContent)].sort((a, b) => a - b).slice(0, SKETCH_K),
  };
}

/** Estimated Jaccard similarity of two bottom-k sketches. */
export function sketchSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const inA = new Set(a);
  const inB = new Set(b);
  const union = [...new Set([...a, ...b])].sort((x, y) => x - y).slice(0, SKETCH_K);
  return union.filter((h) => inA.has(h) && inB.has(h)).length / union.length;
}

const IMPORTANT_SCHEMA = new Set(["Product", "Offer", "FAQPage", "Article", "BreadcrumbList"]);

/** "/products/" when every path sits under one directory, else "". */
function scopeOf(paths: string[]): string {
  const parts = paths.map((p) => p.split("/").filter(Boolean).slice(0, -1));
  const first = parts[0] ?? [];
  let n = first.length;
  for (const q of parts) {
    let i = 0;
    while (i < n && i < q.length && q[i] === first[i]) i++;
    n = i;
  }
  return n > 0 ? ` under /${first.slice(0, n).join("/")}/` : "";
}

interface Hit {
  path: string;
  detail?: string;
}

/** One change per kind: the page itself for a single hit, "… on N pages under /x/" with the list for several. */
function group(kind: string, level: SiteChange["level"], hits: Hit[], one: (h: Hit) => string, many: (n: number, scope: string, h: Hit) => string, extra: Partial<SiteChange> = {}): SiteChange[] {
  if (!hits.length) return [];
  const paths = hits.map((h) => h.path);
  const single = hits.length === 1;
  return [
    {
      kind,
      level,
      path: paths[0],
      paths,
      title: single ? one(hits[0]!) : many(hits.length, scopeOf(paths), hits[0]!),
      ...(single ? { before: hits[0]!.detail } : {}),
      ...extra,
    },
  ];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Content regressions between the pages two snapshots share. Pass only pages OK in both. */
export function contentChanges(prev: Record<string, PageState>, next: Record<string, PageState>, paths: string[]): SiteChange[] {
  const h1Removed: Hit[] = [];
  const h1Changed: Hit[] = [];
  const titleEmptied: Hit[] = [];
  const shrunkHigh: Hit[] = [];
  const shrunkMedium: Hit[] = [];
  const faqGone: Hit[] = [];
  const schemaHigh: Hit[] = [];
  const schemaMedium: Hit[] = [];
  const dropped = new Set<string>();

  for (const path of paths) {
    const a = prev[path]!;
    const b = next[path]!;
    if (a.h1 && !b.h1) h1Removed.push({ path, detail: a.h1 });
    else if (a.h1 && b.h1 && a.h1.trim() !== b.h1.trim()) h1Changed.push({ path, detail: `${a.h1} → ${b.h1}` });
    if ((a.title ?? "").trim() && !(b.title ?? "").trim()) titleEmptied.push({ path, detail: a.title ?? "" });
    const ca = a.content;
    const cb = b.content;
    if (!ca || !cb) continue;
    if (ca.words >= MIN_WORDS) {
      const drop = (ca.words - cb.words) / ca.words;
      const hit = { path, detail: `${ca.words} → ${cb.words} words` };
      if (drop >= 0.4) shrunkHigh.push(hit);
      else if (drop >= 0.2) shrunkMedium.push(hit);
    }
    if (ca.faq && !cb.faq) faqGone.push({ path });
    const gone = ca.schema.filter((t) => !cb.schema.includes(t));
    if (gone.length) {
      const important = gone.filter((t) => IMPORTANT_SCHEMA.has(t));
      if (important.length) schemaHigh.push({ path, detail: important.join(", ") });
      if (gone.length > important.length) schemaMedium.push({ path, detail: gone.filter((t) => !IMPORTANT_SCHEMA.has(t)).join(", ") });
    }
    dropped.add(path);
  }

  // Internal links in: count only the sources both crawls saw, so a page the
  // preview didn't crawl never looks like a link that was removed.
  const sources = paths.filter((p) => prev[p]!.content && next[p]!.content);
  const inbound = (snap: Record<string, PageState>) => {
    const m = new Map<string, Set<string>>();
    for (const s of sources) for (const t of snap[s]!.content!.links) (m.get(t) ?? m.set(t, new Set()).get(t)!).add(s);
    return m;
  };
  const inPrev = inbound(prev);
  const inNext = inbound(next);
  const linksLost: Hit[] = [];
  for (const path of dropped) {
    const before = inPrev.get(path) ?? new Set<string>();
    const after = inNext.get(path) ?? new Set<string>();
    if (before.size >= 4 && after.size <= before.size / 2) {
      const gone = [...before].filter((s) => !after.has(s));
      linksLost.push({ path, detail: `${before.size} → ${after.size} internal links in (no longer from ${gone.slice(0, 4).join(", ")}${gone.length > 4 ? ", …" : ""})` });
    }
  }

  // Pages that turned into copies of each other.
  const withText = [...dropped].filter((p) => prev[p]!.content!.words >= MIN_WORDS && next[p]!.content!.words >= MIN_WORDS);
  const pairs: [string, string][] = [];
  for (let i = 0; i < withText.length; i++) {
    for (let j = i + 1; j < withText.length; j++) {
      const x = withText[i]!;
      const y = withText[j]!;
      if (sketchSimilarity(next[x]!.content!.sketch, next[y]!.content!.sketch) >= 0.9 && sketchSimilarity(prev[x]!.content!.sketch, prev[y]!.content!.sketch) < 0.9) pairs.push([x, y]);
    }
  }
  const dupPaths = [...new Set(pairs.flat())];

  const out: SiteChange[] = [];
  out.push(...group("h1-removed", "warning", h1Removed, (h) => `${h.path} lost its H1 heading`, (n, s) => `H1 removed on ${n} pages${s}`));
  out.push(...group("h1-changed", "info", h1Changed, (h) => `${h.path} H1 changed: ${h.detail}`, (n, s) => `H1 changed on ${n} pages${s}`));
  out.push(...group("title-emptied", "warning", titleEmptied, (h) => `${h.path} lost its title`, (n, s) => `Title emptied on ${n} pages${s}`));
  out.push(...group("content-shrunk", "warning", shrunkHigh, (h) => `${h.path} lost 40% or more of its text (${h.detail})`, (n, s, h) => `Visible text down 40% or more on ${n} pages${s} (e.g. ${h.path}: ${h.detail})`));
  out.push(...group("content-shrunk", "info", shrunkMedium, (h) => `${h.path} lost 20% or more of its text (${h.detail})`, (n, s, h) => `Visible text down 20% or more on ${n} pages${s} (e.g. ${h.path}: ${h.detail})`));
  out.push(...group("inlinks-dropped", "warning", linksLost, (h) => `${h.path} lost half or more of its internal links in: ${h.detail}`, (n, s, h) => `${n} pages${s} lost half or more of their internal links in (e.g. ${h.path}: ${h.detail})`));
  out.push(...group("schema-removed", "warning", schemaHigh, (h) => `${h.path} no longer declares ${h.detail} schema`, (n, s) => `${[...new Set(schemaHigh.flatMap((h) => h.detail!.split(", ")))].join(", ")} schema removed on ${n} pages${s}`));
  out.push(...group("schema-removed", "info", schemaMedium, (h) => `${h.path} no longer declares ${h.detail} schema`, (n, s) => `${[...new Set(schemaMedium.flatMap((h) => h.detail!.split(", ")))].join(", ")} schema removed on ${n} pages${s}`));
  out.push(...group("faq-removed", "warning", faqGone, (h) => `${h.path} lost its FAQ block`, (n, s) => `FAQ block removed on ${n} pages${s}`));
  if (pairs.length) {
    out.push({
      kind: "near-duplicate",
      level: "warning",
      path: dupPaths[0],
      paths: dupPaths,
      title:
        pairs.length === 1
          ? `${pairs[0]![0]} and ${pairs[0]![1]} became near-duplicates (the text is 90% or more the same)`
          : `${pairs.length} pairs of pages became near-duplicates (e.g. ${pairs[0]![0]} and ${pairs[0]![1]})`,
    });
  }
  return out;
}

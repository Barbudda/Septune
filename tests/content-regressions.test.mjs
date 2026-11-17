// Content regressions in the preview vs production diff. Run: npm run test:content
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let m;

before(async () => {
  const work = mkdtempSync(join(tmpdir(), "rf-content-"));
  await build({
    stdin: {
      contents:
        'export { buildSnapshot, diffSnapshots } from "./src/lib/audit/snapshot.ts"; export { annotateDiff } from "./src/lib/gsc/annotate.ts"; export { parseGscPages } from "./src/lib/gsc/export.ts";',
      resolveDir: ROOT,
      loader: "ts",
    },
    outfile: join(work, "c.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    tsconfig: join(ROOT, "tsconfig.json"),
    logLevel: "silent",
  });
  m = await import(pathToFileURL(join(work, "c.mjs")).href);
});

const PROD = "https://example.com";
const PREVIEW = "https://pr-7.vercel.app";

/** n distinct words, unique per seed so two pages never look alike by accident. */
const words = (seed, n) => Array.from({ length: n }, (_, i) => `w${seed}x${i}`).join(" ");

function page(origin, path, o = {}) {
  const text = o.text ?? words(path, o.words ?? 300);
  return {
    url: `${origin}${path}`,
    statusCode: 200,
    title: o.title === undefined ? `Title ${path}` : o.title,
    metaDescription: "d",
    metaRobots: null,
    xRobotsTag: null,
    canonical: `${origin}${path}`,
    h1s: o.h1 === undefined ? [`Heading ${path}`] : o.h1 ? [o.h1] : [],
    headings: o.headings ?? [],
    links: (o.links ?? []).map((href) => ({ href, internal: true, anchor: "a" })),
    jsonLd: (o.schema ?? []).map((t) => ({ "@type": t })),
    html: o.html ?? "",
    textContent: text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}
const snap = (origin, pages) =>
  m.buildSnapshot({ url: origin, pages, engine: { issues: [], categoryScores: {} }, overall: 90, siteFiles: { robotsTxt: "", robotsStatus: 200, hasSitemap: true }, takenAt: "2026-11-17T00:00:00Z" });
const diff = (a, b) => m.diffSnapshots(snap(PROD, a), snap(PREVIEW, b));
const find = (d, kind, level) => d.changes.find((c) => c.kind === kind && (!level || c.level === level));
const same = (paths, o = {}) => (origin) => paths.map((p) => page(origin, p, o));

test("H1 removed on many pages is one finding with the list; one page keeps its own sentence", () => {
  const paths = ["/products/a", "/products/b", "/products/c", "/about"];
  const prod = paths.map((p) => page(PROD, p));
  const preview = paths.map((p) => page(PREVIEW, p, { h1: p.startsWith("/products") ? null : undefined }));
  const d = diff(prod, preview);
  const c = find(d, "h1-removed");
  assert.equal(c.title, "H1 removed on 3 pages under /products/");
  assert.deepEqual(c.paths, ["/products/a", "/products/b", "/products/c"]);
  assert.equal(c.level, "warning");
  assert.equal(d.changes.filter((x) => x.kind === "h1-removed").length, 1);

  const one = diff([page(PROD, "/x")], [page(PREVIEW, "/x", { h1: null })]);
  assert.equal(find(one, "h1-removed").title, "/x lost its H1 heading");
});

test("H1 changed is info, an emptied title is a warning", () => {
  const d = diff([page(PROD, "/a"), page(PROD, "/b")], [page(PREVIEW, "/a", { h1: "Something else" }), page(PREVIEW, "/b", { title: "" })]);
  assert.equal(find(d, "h1-changed").level, "info");
  assert.match(find(d, "h1-changed").title, /Heading \/a → Something else/);
  assert.equal(find(d, "title-emptied").level, "warning");
  assert.equal(find(d, "titles-changed").level, "info");
});

test("visible words: 40% down is a warning, 20% a notice, 10% nothing, thin pages are not judged", () => {
  const prod = [page(PROD, "/big", { words: 1000 }), page(PROD, "/mid", { words: 1000 }), page(PROD, "/small", { words: 1000 }), page(PROD, "/thin", { words: 60 })];
  const preview = [page(PREVIEW, "/big", { words: 550 }), page(PREVIEW, "/mid", { words: 780 }), page(PREVIEW, "/small", { words: 900 }), page(PREVIEW, "/thin", { words: 10 })];
  const d = diff(prod, preview);
  const high = find(d, "content-shrunk", "warning");
  assert.match(high.title, /\/big lost 40% or more of its text \(1000 → 550 words\)/);
  assert.deepEqual(high.paths, ["/big"]);
  assert.deepEqual(find(d, "content-shrunk", "info").paths, ["/mid"]);
  assert.equal(d.changes.filter((c) => c.kind === "content-shrunk").length, 2);
});

test("internal links in: half or more gone is flagged, naming the pages that stopped linking", () => {
  const srcs = ["/s1", "/s2", "/s3", "/s4", "/s5", "/s6"];
  const prod = [page(PROD, "/pricing"), ...srcs.map((s) => page(PROD, s, { links: ["/pricing"] }))];
  const preview = [
    page(PREVIEW, "/pricing"),
    ...srcs.map((s, i) => page(PREVIEW, s, { links: i < 2 ? ["/pricing"] : ["/elsewhere"] })),
  ];
  const c = find(diff(prod, preview), "inlinks-dropped");
  assert.equal(c.level, "warning");
  assert.match(c.title, /\/pricing lost half or more of its internal links in: 6 → 2 internal links in \(no longer from \/s3, \/s4, \/s5, \/s6\)/);
  // The preview simply didn't crawl those pages: not a removed link.
  const partial = diff(prod, [page(PREVIEW, "/pricing"), page(PREVIEW, "/s1", { links: ["/pricing"] }), page(PREVIEW, "/s2", { links: ["/pricing"] })]);
  assert.equal(find(partial, "inlinks-dropped"), undefined);
});

test("schema types that disappeared: Product is a warning, others a notice", () => {
  const d = diff(
    [page(PROD, "/p1", { schema: ["Product", "Offer", "WebSite"] }), page(PROD, "/p2", { schema: ["Product"] }), page(PROD, "/p3", { schema: ["Organization"] })],
    [page(PREVIEW, "/p1", { schema: ["WebSite"] }), page(PREVIEW, "/p2", { schema: [] }), page(PREVIEW, "/p3", { schema: [] })],
  );
  const high = find(d, "schema-removed", "warning");
  assert.match(high.title, /Offer, Product schema removed on 2 pages/);
  assert.deepEqual(high.paths, ["/p1", "/p2"]);
  assert.deepEqual(find(d, "schema-removed", "info").paths, ["/p3"]);
});

test("a FAQ block removed: schema, or question headings", () => {
  const q = (n) => Array.from({ length: n }, (_, i) => ({ level: 2, text: `How does thing ${i} work?` }));
  const d = diff(
    [page(PROD, "/faq1", { schema: ["FAQPage"] }), page(PROD, "/faq2", { headings: q(4) }), page(PROD, "/keep", { headings: q(4) })],
    [page(PREVIEW, "/faq1"), page(PREVIEW, "/faq2", { headings: [{ level: 2, text: "Overview" }] }), page(PREVIEW, "/keep", { headings: q(4) })],
  );
  const c = find(d, "faq-removed");
  assert.equal(c.title, "FAQ block removed on 2 pages");
  assert.deepEqual(c.paths, ["/faq1", "/faq2"]);
});

test("two pages that became near-duplicates are flagged, a pair that already was is not", () => {
  const shared = words("shared", 300);
  const prod = [page(PROD, "/a"), page(PROD, "/b"), page(PROD, "/c", { text: shared }), page(PROD, "/d", { text: shared }), page(PROD, "/e")];
  const preview = [page(PREVIEW, "/a", { text: shared + " extra"}), page(PREVIEW, "/b", { text: shared }), page(PREVIEW, "/c", { text: shared }), page(PREVIEW, "/d", { text: shared }), page(PREVIEW, "/e")];
  const d = diff(prod, preview);
  const c = find(d, "near-duplicate");
  assert.match(c.title, /\/a and \/b became near-duplicates|pairs of pages became near-duplicates/);
  assert.ok(c.paths.includes("/a") && c.paths.includes("/b"));
  assert.ok(!c.paths.includes("/e"));
  assert.ok(!(c.paths.includes("/c") && c.paths.includes("/d") && c.paths.length === 2), "/c and /d were copies in production already");
});

test("clicks of every page in a grouped finding are summed with --gsc", () => {
  const paths = ["/products/a", "/products/b", "/products/c"];
  const d = diff(paths.map((p) => page(PROD, p)), paths.map((p) => page(PREVIEW, p, { h1: null })));
  const idx = m.parseGscPages("Top pages,Clicks,Impressions\nhttps://example.com/products/a,100,900\nhttps://example.com/products/b,50,400\n");
  const c = find(m.annotateDiff(d, idx), "h1-removed");
  assert.equal(c.clicks, 150);
});

test("snapshots stay light and older ones without content signals still diff", () => {
  const many = Array.from({ length: 400 }, (_, i) => `/l${i}`);
  const s = snap(PROD, [page(PROD, "/", { links: many, words: 2000 })]);
  assert.ok(s.pages["/"].content.links.length <= 150);
  assert.ok(s.pages["/"].content.sketch.length <= 48);
  assert.ok(!JSON.stringify(s).includes("w/x1999"), "no text is stored");
  const old = snap(PROD, [page(PROD, "/a")]);
  delete old.pages["/a"].content;
  assert.doesNotThrow(() => m.diffSnapshots(old, snap(PREVIEW, [page(PREVIEW, "/a")])));
});

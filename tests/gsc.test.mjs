// Search Console export → clicks at stake on findings and diff changes.
// Run: npm run test:gsc
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateRawSync } from "node:zlib";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(ROOT, "tests", "fixtures", "gsc-pages.csv");
let m;
let work;

before(async () => {
  work = mkdtempSync(join(tmpdir(), "rf-gsc-"));
  await build({
    stdin: {
      contents: [
        'export * from "./src/lib/gsc/export.ts";',
        'export { loadGscExport } from "./src/lib/gsc/file.ts";',
        'export { annotateDiff } from "./src/lib/gsc/annotate.ts";',
        'export { buildSnapshot, diffSnapshots, diffToMarkdown } from "./src/lib/audit/snapshot.ts";',
      ].join("\n"),
      resolveDir: ROOT,
      loader: "ts",
    },
    outfile: join(work, "g.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    tsconfig: join(ROOT, "tsconfig.json"),
    logLevel: "silent",
  });
  m = await import(pathToFileURL(join(work, "g.mjs")).href);
});

/** A minimal zip (deflate), the way Google packs the export. */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text, "utf8"));
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(text.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(text.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, data);
    centrals.push(ch, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test("the English CSV is read and URLs are normalised (www, protocol, slash, query)", () => {
  const idx = m.loadGscExport(FIXTURE);
  assert.equal(idx.period, null);
  assert.deepEqual(idx.byPath.get("/"), { clicks: 5200, impressions: 91000 });
  assert.deepEqual(idx.byPath.get("/pricing"), { clicks: 1240, impressions: 30500 });
  // http + query and https rows for the same page are summed
  assert.deepEqual(idx.byPath.get("/docs/setup"), { clicks: 400, impressions: 11900 });
  assert.equal(idx.byPath.get("/blog/a,b")?.clicks, 12, "quoted commas survive");
  assert.deepEqual(m.trafficForPath(idx, "https://preview.vercel.app/pricing/"), { clicks: 1240, impressions: 30500 });
});

test("French headers, spaced thousands and semicolons", () => {
  const idx = m.parseGscPages('Pages les plus populaires;Clics;Impressions;CTR;Position\nhttps://exemple.fr/tarifs;"1 240";"30 500";4 %;8,3\n');
  assert.deepEqual(idx.byPath.get("/tarifs"), { clicks: 1240, impressions: 30500 });
});

test("a file that is not a Pages export is refused", () => {
  assert.throws(() => m.parseGscPages("Query,Count\nfoo,1\n"), /not a Search Console Pages export/);
});

test("a finding's traffic counts only pages the export lists, never invents the rest", () => {
  const idx = m.loadGscExport(FIXTURE);
  const t = m.issueTraffic(idx, [{ url: "https://example.com/pricing" }, { url: "https://example.com/unlisted" }, { url: "https://example.com/docs/setup/" }]);
  assert.equal(t.clicks, 1640);
  assert.deepEqual(t.pages.map((p) => p.url), ["https://example.com/pricing", "https://example.com/docs/setup/"]);
  assert.equal(m.issueTraffic(idx, [{ url: "https://example.com/unlisted" }]), null);
});

test("the zip from Google: Pages sheet and the date range from Filters", () => {
  const f = join(work, "export.zip");
  writeFileSync(f, zip({ "Queries.csv": "Top queries,Clicks,Impressions\nx,1,2\n", "Filters.csv": "Filter,Value\nSearch type,Web\nDate,Last 3 months\n", "Pages.csv": readFileSync(FIXTURE, "utf8") }));
  const idx = m.loadGscExport(f);
  assert.equal(idx.period, "Last 3 months");
  assert.equal(idx.byPath.get("/pricing")?.clicks, 1240);
  assert.match(m.periodLabel(idx), /Last 3 months/);
  assert.throws(() => m.loadGscExport(join(work, "missing.csv")), /cannot read/);
});

const page = (origin, path, extra = {}) => ({
  url: `${origin}${path}`,
  statusCode: 200,
  title: "t",
  metaDescription: "d",
  metaRobots: null,
  xRobotsTag: null,
  canonical: `${origin}${path}`,
  h1s: ["h"],
  html: "",
  ...extra,
});
const snap = (origin, pages) =>
  m.buildSnapshot({ url: origin, pages, engine: { issues: [], categoryScores: {} }, overall: 90, siteFiles: { robotsTxt: "", robotsStatus: 200, hasSitemap: true }, takenAt: "2026-11-11T00:00:00Z" });

test("a regressing page carries its clicks in the diff and its Markdown, biggest first", () => {
  const prod = snap("https://example.com", [page("https://example.com", "/"), page("https://example.com", "/pricing"), page("https://example.com", "/docs/setup")]);
  const preview = snap("https://pr-9.vercel.app", [
    page("https://pr-9.vercel.app", "/"),
    page("https://pr-9.vercel.app", "/pricing", { metaRobots: "noindex" }),
    page("https://pr-9.vercel.app", "/docs/setup", { metaRobots: "noindex" }),
  ]);
  const plain = m.diffSnapshots(prod, preview);
  assert.ok(!/Clicks at stake/.test(m.diffToMarkdown(plain)), "no export, no traffic column");
  const d = m.annotateDiff(plain, m.loadGscExport(FIXTURE));
  const noindex = d.changes.filter((c) => c.kind === "noindex-added");
  assert.deepEqual(noindex.map((c) => [c.path, c.clicks]), [["/pricing", 1240], ["/docs/setup", 400]]);
  const md = m.diffToMarkdown(d);
  assert.match(md, /Clicks at stake/);
  assert.match(md, /\/pricing became noindex[^|]*\| 1,240 \|/);
});

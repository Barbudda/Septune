// Raw HTML vs rendered parity: the comparison is pure and the renderer is
// mocked, no real browser. Run: npm run test:render
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let renderParityCheck, runGeoAudit, renderPages, pagesToRender;

before(async () => {
  const outDir = mkdtempSync(join(tmpdir(), "rf-render-"));
  await build({
    stdin: {
      contents:
        'export { renderParityCheck } from "./src/lib/audit/render-parity.ts"; export { runGeoAudit } from "./src/lib/audit/geo.ts"; export { renderPages, pagesToRender } from "./cli/src/render.ts";',
      resolveDir: ROOT,
      loader: "ts",
    },
    outfile: join(outDir, "r.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    tsconfig: join(ROOT, "tsconfig.json"),
    logLevel: "silent",
  });
  ({ renderParityCheck, runGeoAudit, renderPages, pagesToRender } = await import(pathToFileURL(join(outDir, "r.mjs")).href));
});

const SITE = "https://example.com";
const raw = (path, { words = 400, links = [], jsonLd = 1 } = {}) => ({
  url: `${SITE}${path}`,
  statusCode: 200,
  html: "",
  title: "t",
  metaDescription: "d",
  metaRobots: null,
  wordCount: words,
  textContent: "",
  headings: [],
  links: links.map((href) => ({ href, internal: true, anchor: "a" })),
  jsonLd: Array.from({ length: jsonLd }, () => ({ "@type": "Thing" })),
});
const rendered = (path, { words = 400, links = [], jsonLd = 1 } = {}) => ({
  url: `${SITE}${path}`,
  wordCount: words,
  links: links.map((l) => `${SITE}${l}`),
  jsonLdBlocks: jsonLd,
});

test("a page whose HTML already has everything passes", () => {
  const c = renderParityCheck([raw("/", { links: ["/a", "/b"] })], { ok: true, pages: [rendered("/", { links: ["/a", "/b"] })] });
  assert.equal(c.status, "pass");
  assert.equal(c.informational, true);
});

test("under half the words in the HTML is flagged, and wording names the page", () => {
  const c = renderParityCheck([raw("/app", { words: 60 })], { ok: true, pages: [rendered("/app", { words: 400 })] });
  assert.equal(c.status, "fail");
  assert.match(c.detail, /\/app \(15% of the words in the HTML \(60 of 400\)/);
  assert.deepEqual(c.pages, ["/app"]);
});

test("links and JSON-LD only after JavaScript are flagged", () => {
  const c = renderParityCheck(
    [raw("/a"), raw("/b"), raw("/c"), raw("/d")],
    {
      ok: true,
      pages: [
        rendered("/a", { links: ["/1", "/2", "/3", "/4"] }),
        rendered("/b", { jsonLd: 2 }),
        rendered("/c"),
        rendered("/d"),
      ],
    },
  );
  assert.equal(c.status, "fail");
  assert.match(c.detail, /4 of 4 internal links/);
  assert.match(c.detail, /1 JSON-LD block only/);
});

test("a tiny rendered page is not judged on word share", () => {
  const c = renderParityCheck([raw("/x", { words: 2 })], { ok: true, pages: [rendered("/x", { words: 10 })] });
  assert.equal(c.status, "pass");
});

test("a skipped render is an informational note, and no flag adds no check", () => {
  const c = renderParityCheck([], { ok: false, reason: "no browser" });
  assert.equal(c.status, "warn");
  assert.match(c.detail, /^Skipped: no browser/);
  assert.equal(renderParityCheck([], undefined), null);
});

test("the GEO audit adds the check only when rendering was asked for, and its score does not move", () => {
  const pages = [raw("/", { words: 10 })];
  const base = runGeoAudit(pages, {});
  const withRender = runGeoAudit(pages, { rendered: { ok: true, pages: [rendered("/", { words: 500 })] } });
  assert.ok(!base.checks.some((c) => c.id === "geo-render-parity"));
  assert.ok(withRender.checks.some((c) => c.id === "geo-render-parity" && c.status === "fail"));
  assert.equal(withRender.score, base.score);
});

test("renderPages: a missing playwright-core or browser skips instead of throwing", async () => {
  const none = await renderPages([raw("/")], async () => {
    throw new Error("Cannot find package");
  });
  assert.equal(none.ok, false);
  assert.match(none.reason, /playwright-core/);
  const noBrowser = await renderPages([raw("/")], async () => ({
    chromium: { launch: async () => { throw new Error("no chrome"); } },
  }));
  assert.match(noBrowser.reason, /Chrome or Edge/);
});

test("renderPages: falls back to msedge, caps at 25 pages, skips noindex and errors, closes the browser", async () => {
  const tried = [];
  let closed = false;
  const visited = [];
  const fake = {
    chromium: {
      launch: async ({ channel }) => {
        tried.push(channel);
        if (channel === "chrome") throw new Error("no chrome");
        return {
          newPage: async () => {
            let url = "";
            return {
              goto: async (u) => { url = u; visited.push(u); },
              waitForLoadState: async () => { throw new Error("never idle"); },
              evaluate: async () => ({ text: "one two three", links: [`${SITE}/x`], jsonLd: 1 }),
              close: async () => {},
            };
          },
          close: async () => { closed = true; },
        };
      },
    },
  };
  const pages = Array.from({ length: 40 }, (_, i) => raw(`/p${i}`));
  pages.push({ ...raw("/hidden"), metaRobots: "noindex" }, { ...raw("/gone"), statusCode: 404 });
  assert.equal(pagesToRender(pages).length, 25);
  const r = await renderPages(pages, async () => fake);
  assert.deepEqual(tried, ["chrome", "msedge"]);
  assert.equal(r.ok, true);
  assert.equal(r.pages.length, 25);
  assert.equal(r.pages[0].wordCount, 3);
  assert.ok(!visited.some((u) => /hidden|gone/.test(u)));
  assert.equal(closed, true);
});

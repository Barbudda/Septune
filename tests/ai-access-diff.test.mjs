// AI crawler access, preview vs production: a bot production allows and the
// preview blocks is reported by the diff. Run: npm run test:ai-access
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let buildSnapshot, diffSnapshots, diffToMarkdown;

before(async () => {
  const outDir = mkdtempSync(join(tmpdir(), "rf-aiaccess-"));
  await build({
    stdin: {
      contents: 'export { buildSnapshot, diffSnapshots, diffToMarkdown } from "./src/lib/audit/snapshot.ts";',
      resolveDir: ROOT,
      loader: "ts",
    },
    outfile: join(outDir, "snap.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    tsconfig: join(ROOT, "tsconfig.json"),
    logLevel: "silent",
  });
  ({ buildSnapshot, diffSnapshots, diffToMarkdown } = await import(pathToFileURL(join(outDir, "snap.mjs")).href));
});

const page = (origin, xRobotsTag = null) => ({
  url: `${origin}/`,
  statusCode: 200,
  title: "Home",
  metaDescription: "d",
  metaRobots: null,
  xRobotsTag,
  canonical: `${origin}/`,
  h1s: ["Home"],
  html: "",
});
const engine = { issues: [], categoryScores: {} };
const snap = (origin, robotsTxt, xRobotsTag) =>
  buildSnapshot({
    url: origin,
    pages: [page(origin, xRobotsTag)],
    engine,
    overall: 90,
    siteFiles: { robotsTxt, robotsStatus: 200, hasSitemap: true },
    takenAt: "2026-11-11T00:00:00Z",
  });

const PROD = "https://example.com";
const PREVIEW = "https://example-git-feat.vercel.app";
const OPEN = "User-agent: *\nAllow: /\n";

test("a search bot blocked on the preview only is critical", () => {
  const d = diffSnapshots(snap(PROD, OPEN), snap(PREVIEW, `${OPEN}\nUser-agent: OAI-SearchBot\nDisallow: /\n`));
  const c = d.changes.find((x) => x.kind === "ai-search-blocked");
  assert.ok(c, "reported");
  assert.equal(c.level, "critical");
  assert.match(c.title, /OAI-SearchBot/);
  assert.equal(d.level, "critical");
  assert.match(diffToMarkdown(d), /OAI-SearchBot/);
});

test("a training bot blocked on the preview only is info", () => {
  const d = diffSnapshots(snap(PROD, OPEN), snap(PREVIEW, `${OPEN}\nUser-agent: GPTBot\nDisallow: /\n`));
  const c = d.changes.find((x) => x.kind === "ai-training-blocked");
  assert.equal(c?.level, "info");
  assert.ok(!d.changes.some((x) => x.kind === "ai-search-blocked"));
  assert.equal(d.level, "info");
});

test("a bot blocked on both sides is not a difference", () => {
  const robots = `${OPEN}\nUser-agent: ClaudeBot\nDisallow: /\n`;
  const d = diffSnapshots(snap(PROD, robots), snap(PREVIEW, robots));
  assert.equal(d.changes.length, 0);
});

test("a staging-style blanket block is an environment note, not critical", () => {
  const d = diffSnapshots(snap(PROD, OPEN), snap(PREVIEW, "User-agent: *\nDisallow: /\n"));
  assert.ok(!d.changes.some((x) => x.kind.startsWith("ai-")));
  assert.ok(d.environment.some((e) => /blocks every crawler/.test(e)));
});

test("a new noai header on the home page is reported, noindex stays an environment note", () => {
  const d = diffSnapshots(snap(PROD, OPEN), snap(PREVIEW, OPEN, "noai, noimageai"));
  assert.equal(d.changes.find((x) => x.kind === "ai-header-added")?.level, "info");
  const n = diffSnapshots(snap(PROD, OPEN), snap(PREVIEW, OPEN, "noindex"));
  assert.ok(!n.changes.some((x) => x.kind === "noindex-added"));
  assert.ok(n.environment.some((e) => /home page/.test(e)));
});

test("an older production snapshot without aiBlocked still compares", () => {
  const old = snap(PROD, OPEN);
  delete old.robots.aiBlocked;
  const d = diffSnapshots(old, snap(PREVIEW, `${OPEN}\nUser-agent: PerplexityBot\nDisallow: /\n`));
  assert.equal(d.changes.find((x) => x.kind === "ai-search-blocked")?.level, "critical");
});

// Search Console API scaffold: off without the env vars, and the query/OAuth
// helpers behave with a mocked fetch (no network). Run: npm run test:gsc-api
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
  const work = mkdtempSync(join(tmpdir(), "rf-gscapi-"));
  await build({
    stdin: {
      contents: 'export * from "./src/lib/gsc/api.ts"; export { fetchMonitorTraffic } from "./src/lib/gsc/monitor.ts";',
      resolveDir: ROOT,
      loader: "ts",
    },
    outfile: join(work, "a.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    tsconfig: join(ROOT, "tsconfig.json"),
    logLevel: "silent",
  });
  m = await import(pathToFileURL(join(work, "a.mjs")).href);
});

const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

test("everything is off without the Google env vars", async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  assert.equal(m.gscConfigured(), false);
  assert.equal(await m.fetchMonitorTraffic("user-1", "https://example.com"), null, "no query, no throw");
});

test("the consent URL asks for the read-only scope, offline, with the state", () => {
  process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  assert.equal(m.gscConfigured(), true);
  const u = new URL(m.gscAuthUrl("https://www.septune.dev/", "abc"));
  assert.equal(u.searchParams.get("scope"), "https://www.googleapis.com/auth/webmasters.readonly");
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("redirect_uri"), "https://www.septune.dev/api/gsc/callback");
  assert.equal(u.searchParams.get("state"), "abc");
  assert.ok(!u.toString().includes("secret"), "the secret never goes in the URL");
});

test("the property is the domain one, else a prefix on the same host", () => {
  const sites = ["https://other.com/", "https://www.example.com/", "sc-domain:example.com"];
  assert.equal(m.pickProperty(sites, "https://www.example.com/pricing"), "sc-domain:example.com");
  assert.equal(m.pickProperty(sites.slice(0, 2), "https://www.example.com/pricing"), "https://www.example.com/");
  assert.equal(m.pickProperty(["https://other.com/"], "https://example.com/"), null);
});

test("queryPages asks for the last 28 days by page and returns the same index as a file", async () => {
  let sent;
  const f = async (url, init) => {
    sent = { url, body: JSON.parse(init.body), auth: init.headers.authorization };
    return json({ rows: [{ keys: ["https://www.example.com/pricing/"], clicks: 1240, impressions: 30500 }, { keys: ["https://www.example.com/"], clicks: 5200.4, impressions: 91000 }] });
  };
  const r = await m.queryPages("tok", "sc-domain:example.com", { now: new Date("2026-11-11T12:00:00Z"), fetch: f });
  assert.match(sent.url, /sites\/sc-domain%3Aexample\.com\/searchAnalytics\/query$/);
  assert.deepEqual(sent.body.dimensions, ["page"]);
  assert.equal(sent.body.startDate, "2026-10-13");
  assert.equal(sent.body.endDate, "2026-11-09");
  assert.equal(sent.auth, "Bearer tok");
  assert.deepEqual(r.index.byPath.get("/pricing"), { clicks: 1240, impressions: 30500 });
  assert.equal(r.index.byPath.get("/").clicks, 5200);
  assert.equal(r.index.period, "2026-10-13 to 2026-11-09");
  assert.equal(m.storableRows(r.index)[0].path, "/");
});

test("an API error surfaces, and an empty answer is an empty index, not invented numbers", async () => {
  await assert.rejects(m.queryPages("tok", "p", { fetch: async () => json({}, false, 403) }), /HTTP 403/);
  const r = await m.queryPages("tok", "p", { fetch: async () => json({}) });
  assert.equal(r.index.byPath.size, 0);
});

test("token exchange returns the refresh token; a refusal throws", async () => {
  const ok = await m.exchangeCode("code", "https://x.dev", async () => json({ access_token: "a", refresh_token: "r" }));
  assert.equal(ok.refresh_token, "r");
  await assert.rejects(m.refreshAccessToken("r", async () => json({}, false, 400)), /HTTP 400/);
});

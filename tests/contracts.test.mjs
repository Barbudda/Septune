// Contrats SEO par motif d'URL (septune.yml) : parseur, validation, assertions,
// exceptions, seuil, puis `septune init` / `septune test` de bout en bout.
// Run: npm run test:contracts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let m;
let work;

before(async () => {
  work = mkdtempSync(join(tmpdir(), "rf-contracts-"));
  await build({
    stdin: { contents: 'export * from "./src/lib/audit/contracts.ts";', resolveDir: ROOT, loader: "ts" },
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

const YAML = `
# commentaire
fail_on: medium
contracts:
  - match: /products/*
    severity: critical
    status: 200
    indexable: true
    canonical: self
    h1: present
    title: present
    schema: [Product, Offer]
    min_words: 5
    links_in_min: 1
  - match: "/blog/**"
    schema:
      - Article
    h1: Hello world   # texte exact
ignore:
  - match: /products/legacy-*
    rules: [contract-schema, structure-thin-content]
    reason: Old catalogue, no Offer markup.
`;

const page = (path, o = {}) => ({
  url: `https://shop.test${path}`,
  statusCode: 200,
  html: "",
  title: "T",
  metaDescription: "d",
  canonical: `https://shop.test${path}`,
  h1s: ["Hi"],
  headings: [],
  images: [],
  links: [],
  jsonLd: [{ "@type": "Product", offers: { "@type": "Offer" } }],
  renderMs: 1,
  lang: "en",
  metaRobots: null,
  viewport: null,
  hreflang: [],
  og: {},
  twitterCard: null,
  textContent: "",
  wordCount: 200,
  htmlBytes: 1,
  responseTimeMs: 1,
  renderBlocking: { scripts: 0, stylesheets: 0 },
  imagesMissingDims: 0,
  ...o,
});

test("le YAML se lit : mappings, listes de mappings, listes inline et en bloc, guillemets, commentaires", () => {
  const c = m.parseConfig(YAML);
  assert.equal(c.failOn, "medium");
  assert.equal(c.contracts.length, 2);
  assert.deepEqual(c.contracts[0].schema, ["Product", "Offer"]);
  assert.equal(c.contracts[0].minWords, 5);
  assert.equal(c.contracts[0].indexable, true);
  assert.equal(c.contracts[0].severity, "critical");
  assert.equal(c.contracts[1].match, "/blog/**");
  assert.deepEqual(c.contracts[1].schema, ["Article"]);
  assert.equal(c.contracts[1].h1, "Hello world");
  assert.equal(c.contracts[1].severity, "high");
  assert.equal(c.ignore[0].reason, "Old catalogue, no Offer markup.");
});

test("le fichier de démarrage est valide", () => {
  const c = m.parseConfig(m.STARTER_CONFIG);
  assert.equal(c.contracts.length, 1);
  assert.equal(c.failOn, "high");
});

function errorsOf(src) {
  try {
    m.parseConfig(src, "septune.yml");
  } catch (e) {
    return e.errors;
  }
  assert.fail("devait refuser le fichier");
}

test("les erreurs donnent la ligne et la clé", () => {
  const e1 = errorsOf("contracts:\n  - match: /a\n    min_words: beaucoup\n");
  assert.deepEqual([e1[0].line, e1[0].key], [3, "contracts[0].min_words"]);
  const e2 = errorsOf("contracts:\n  - match: /a\n    statuss: 200\n    status: 200\n");
  assert.equal(e2[0].line, 3);
  assert.match(e2[0].message, /clé inconnue/);
  const e3 = errorsOf("fail_on: sometimes\n");
  assert.deepEqual([e3[0].line, e3[0].key], [1, "fail_on"]);
  const e4 = errorsOf("ignore:\n  - match: /a/*\n    rules: [meta-title-missing]\n");
  assert.equal(e4[0].key, "ignore[0].reason");
  const e5 = errorsOf("ignore:\n  - match: /a/*\n    rules: [pas-une-regle]\n    reason: x\n");
  assert.match(e5[0].message, /règle inconnue/);
  assert.equal(e5[0].line, 3);
  const e6 = errorsOf("contracts:\n  - match: products\n    status: 200\n");
  assert.equal(e6[0].key, "contracts[0].match");
  const e7 = errorsOf("contracts:\n\t- match: /a\n");
  assert.match(e7[0].message, /tabulation/);
  const e8 = errorsOf("contracts:\n  - match: /a\n");
  assert.match(e8[0].message, /aucune assertion/);
});

test("les motifs : * = un segment, ** = plusieurs, slash final toléré", () => {
  assert.ok(m.pathMatches("/products/*", "https://x.test/products/a"));
  assert.ok(m.pathMatches("/products/*", "https://x.test/products/a/"));
  assert.ok(!m.pathMatches("/products/*", "https://x.test/products/a/b"));
  assert.ok(!m.pathMatches("/products/*", "https://x.test/products"));
  assert.ok(m.pathMatches("/blog/**", "https://x.test/blog/2026/post"));
  assert.ok(m.pathMatches("/", "https://x.test/"));
  assert.ok(m.pathMatches("/products/legacy-*", "https://x.test/products/legacy-1"));
  assert.ok(!m.pathMatches("/products/legacy-*", "https://x.test/products/new"));
});

test("chaque assertion cassée devient un finding avec page, attendu, trouvé", () => {
  const cfg = m.parseConfig(YAML);
  const pages = [
    page("/products/ok", { links: [] }),
    page("/products/bad", {
      statusCode: 404,
      canonical: "https://shop.test/products/other",
      h1s: [],
      title: null,
      jsonLd: [{ "@type": "Product" }],
      wordCount: 2,
      metaRobots: "noindex, follow",
    }),
    page("/", { links: [{ href: "/products/ok", internal: true, anchor: "ok" }] }),
  ];
  const r = m.evaluateContracts(cfg, pages);
  const ids = r.issues.map((i) => i.ruleId).sort();
  assert.deepEqual(ids, [
    "contract-canonical",
    "contract-h1",
    "contract-indexable",
    "contract-links-in-min",
    "contract-min-words",
    "contract-schema",
    "contract-status",
    "contract-title",
  ]);
  const schema = r.issues.find((i) => i.ruleId === "contract-schema");
  assert.equal(schema.impact, "critical");
  assert.equal(schema.affectedUrls.length, 1);
  assert.match(schema.affectedUrls[0].note, /expected JSON-LD Product, Offer, found Product \(missing Offer\)/);
  assert.match(schema.evidence, /\/products\/bad/);
  const st = r.issues.find((i) => i.ruleId === "contract-status");
  assert.match(st.affectedUrls[0].note, /expected 200, found 404/);
  // /products/ok reçoit un lien depuis « / » ; /products/bad n'en reçoit aucun, ok passe.
  const links = r.issues.find((i) => i.ruleId === "contract-links-in-min");
  assert.deepEqual(links.affectedUrls.map((u) => u.url), ["https://shop.test/products/bad"]);
  // Le contrat /blog/** ne correspond à rien : signalé, pas un finding.
  assert.deepEqual(r.unmatched.map((u) => u.match), ["/blog/**"]);
});

test("canonical : self, absolu et chemin ; h1 : texte exact", () => {
  const cfg = m.parseConfig("contracts:\n  - match: /a\n    canonical: /b\n    h1: Hello\n");
  const bad = m.evaluateContracts(cfg, [page("/a", { h1s: ["Bye"] })]);
  assert.deepEqual(bad.issues.map((i) => i.ruleId).sort(), ["contract-canonical", "contract-h1"]);
  const ok = m.evaluateContracts(cfg, [page("/a", { canonical: "https://shop.test/b/", h1s: ["hello"] })]);
  assert.equal(ok.issues.length, 0);
});

test("le schema se lit aussi dans @graph et dans les @type en liste", () => {
  const cfg = m.parseConfig("contracts:\n  - match: /a\n    schema: [Product, Offer]\n");
  const p = page("/a", { jsonLd: [{ "@graph": [{ "@type": ["Thing", "Product"] }, { "@type": "https://schema.org/Offer" }] }] });
  assert.equal(m.evaluateContracts(cfg, [p]).issues.length, 0);
});

test("les exceptions retirent la page et gardent la raison pour le rapport", () => {
  const cfg = m.parseConfig(YAML);
  const pages = [page("/products/legacy-1", { jsonLd: [] }), page("/products/new", { jsonLd: [] })];
  const r = m.evaluateContracts(cfg, pages);
  const { kept, ignored } = m.applyIgnores(r.issues, cfg.ignore);
  const schema = kept.find((i) => i.ruleId === "contract-schema");
  assert.deepEqual(schema.affectedUrls.map((u) => u.url), ["https://shop.test/products/new"]);
  assert.equal(ignored.length, 1);
  assert.equal(ignored[0].url, "https://shop.test/products/legacy-1");
  assert.equal(ignored[0].reason, "Old catalogue, no Offer markup.");
  // Une exception qui couvre toutes les pages supprime le finding.
  const all = m.applyIgnores([schema], [{ match: "/products/*", rules: ["contract-schema"], reason: "r", line: 1 }]);
  assert.equal(all.kept.length, 0);
});

test("fail_on : le seuil décide ce qui bloque", () => {
  assert.equal(m.contractsFail([{ impact: "medium" }], "high"), false);
  assert.equal(m.contractsFail([{ impact: "high" }], "high"), true);
  assert.equal(m.contractsFail([{ impact: "high" }], "critical"), false);
  assert.equal(m.contractsFail([{ impact: "medium" }], "medium"), true);
  assert.equal(m.contractsFail([{ impact: "low" }], "medium"), false);
  const d = (impact, level = "info") => ({ changes: [{ level }], newIssues: impact ? [{ impact }] : [], worsenedIssues: [] });
  assert.equal(m.diffFailsOn(d("high"), "critical"), false);
  assert.equal(m.diffFailsOn(d("high"), "high"), true);
  assert.equal(m.diffFailsOn(d("medium"), "high"), false);
  assert.equal(m.diffFailsOn(d(null, "critical"), "critical"), true);
});

test("les exceptions s'appliquent aussi à un diff", () => {
  const d = {
    changes: [{ kind: "new-issue", level: "warning", path: "/legal/a", title: "New issue: thin (1)" }, { kind: "page-error", level: "critical", path: "/x", title: "x" }],
    newIssues: [{ ruleId: "structure-thin-content", impact: "medium", title: "thin", paths: ["/legal/a"] }],
    worsenedIssues: [],
  };
  const { diff, ignored } = m.ignoreInDiff(d, [{ match: "/legal/*", rules: ["structure-thin-content"], reason: "short by design", line: 1 }]);
  assert.equal(diff.newIssues.length, 0);
  assert.deepEqual(diff.changes.map((c) => c.kind), ["page-error"]);
  assert.equal(ignored[0].reason, "short by design");
});

// ── CLI de bout en bout ──────────────────────────────────────────────
const CLI = join(ROOT, "cli", "dist", "index.js");
let server;
let base;
let proj;

before(async () => {
  const html = (title, body, head = "") =>
    `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${title} page of the contracts fixture."><meta name="viewport" content="width=device-width">${head}</head><body>${body}</body></html>`;
  const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
  const routes = {
    "/": () => html("Home", `<h1>Home</h1><a href="/products/a">a</a><a href="/products/b">b</a>`),
    "/products/a": () => html("A", `<h1>A</h1><p>${words}</p>`, `<link rel="canonical" href="${base}/products/a"><script type="application/ld+json">{"@type":"Product"}</script>`),
    "/products/b": () => html("B", `<p>${words}</p>`, `<link rel="canonical" href="${base}/products/a">`),
    "/robots.txt": () => "User-agent: *\nAllow: /\n",
  };
  server = createServer((req, res) => {
    const f = routes[req.url.split("?")[0]];
    if (!f) return void res.writeHead(404).end("nope");
    res.writeHead(200, { "content-type": req.url.endsWith(".txt") ? "text/plain" : "text/html" }).end(f());
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  proj = mkdtempSync(join(tmpdir(), "rf-contracts-proj-"));
});

after(() => server?.close());

// Asynchrone : le site de test tourne dans ce processus, un spawnSync le bloquerait.
const run = (args, cwd = proj) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [CLI, ...args, "--no-color"], { cwd });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => resolve({ status, stdout, stderr }));
  });

test("septune init écrit un septune.yml valide et refuse d'écraser", async () => {
  const a = await run(["init"]);
  assert.equal(a.status, 0, a.stderr);
  assert.ok(existsSync(join(proj, "septune.yml")));
  m.parseConfig(readFileSync(join(proj, "septune.yml"), "utf8"));
  const b = await run(["init"]);
  assert.equal(b.status, 2);
  assert.match(b.stderr, /already exists/);
});

test("septune test : exit 1 sur un contrat cassé, avec page, attendu et trouvé", async () => {
  writeFileSync(
    join(proj, "septune.yml"),
    "contracts:\n  - match: /products/*\n    canonical: self\n    h1: present\n    schema: [Product]\n",
  );
  const r = await run(["test", base, "--json", "--pages", "10"]);
  assert.equal(r.status, 1, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.passed, false);
  const ids = out.findings.map((f) => f.ruleId).sort();
  assert.deepEqual(ids, ["contract-canonical", "contract-h1", "contract-schema"]);
  assert.match(JSON.stringify(out.findings), /expected an H1/);
});

test("septune test : une exception avec raison et fail_on laissent passer, le rapport la montre", async () => {
  writeFileSync(
    join(proj, "septune.yml"),
    [
      "fail_on: critical",
      "contracts:",
      "  - match: /products/*",
      "    h1: present",
      "ignore:",
      "  - match: /products/b",
      "    rules: [contract-h1]",
      "    reason: B is a legacy page",
      "",
    ].join("\n"),
  );
  const r = await run(["test", base, "--pages", "10"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stderr, /ignored by .*septune\.yml/);
  assert.match(r.stderr, /B is a legacy page/);
});

test("septune test : fichier invalide, erreur avec ligne et clé", async () => {
  writeFileSync(join(proj, "septune.yml"), "contracts:\n  - match: /a\n    min_words: lots\n");
  const r = await run(["test", base]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /septune\.yml:3 \(contracts\[0\]\.min_words\)/);
});

test(".septune.yml est lu aussi, et sans fichier septune test le dit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rf-contracts-dot-"));
  const none = await run(["test", base], dir);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /septune init/);
  writeFileSync(join(dir, ".septune.yml"), "contracts:\n  - match: /\n    status: 200\n");
  const ok = await run(["test", base, "--pages", "3"], dir);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
});

// Pages de règles (/docs/issues/<id>) : une par règle du catalogue, sans
// phrase recopiée d'une page à l'autre (la duplication que Septune signale
// chez les autres). Run: npm run test:rule-docs
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
  const outDir = mkdtempSync(join(tmpdir(), "rf-ruledocs-"));
  await build({
    stdin: {
      contents:
        'export * from "./src/lib/audit/rule-docs.ts"; export { RULE_CATALOG } from "./src/lib/audit/catalog.ts"; export { RULE_DOC_DATA } from "./src/lib/audit/rule-docs.data.ts"; export { FIXABLE_RULE_IDS } from "./src/lib/audit/deterministic-fix.ts"; export { GUIDES } from "./src/lib/seo/guides.ts"; export { FRAMEWORK_PAGES } from "./src/lib/seo/content.ts"; export { TOPICS, HUBS } from "./src/lib/seo/topics/index.ts";',
      resolveDir: ROOT,
      loader: "ts",
    },
    outfile: join(outDir, "rule-docs.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    tsconfig: join(ROOT, "tsconfig.json"),
    logLevel: "silent",
  });
  m = await import(pathToFileURL(join(outDir, "rule-docs.mjs")).href);
});

const TEXT_FIELDS = ["summary", "measured", "consequence", "fix", "verify"];

function allText(doc) {
  return [
    ...TEXT_FIELDS.map((f) => doc[f]),
    doc.failing.label,
    doc.failing.code,
    ...Object.values(doc.frameworks ?? {}),
  ];
}

test("every catalog rule has a page, and no page is orphaned", () => {
  const ids = m.RULE_CATALOG.map((r) => r.id);
  assert.deepEqual(Object.keys(m.RULE_DOC_DATA).sort(), [...ids].sort());
  assert.equal(m.RULE_PAGES.length, ids.length);
});

test("each page has every section filled", () => {
  for (const p of m.RULE_PAGES) {
    for (const f of TEXT_FIELDS) assert.ok(p[f]?.trim().length > 20, `${p.id}.${f}`);
    assert.ok(p.failing.code.trim().length > 0, `${p.id}.failing.code`);
    assert.ok(["html", "http", "text", "xml"].includes(p.failing.lang), `${p.id}.failing.lang`);
    assert.ok(p.failing.code.split("\n").length <= 14, `${p.id}.failing.code is too long`);
    assert.match(p.published, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(p.updated, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("related checks exist, are distinct and never the page itself", () => {
  const ids = new Set(m.RULE_CATALOG.map((r) => r.id));
  for (const p of m.RULE_PAGES) {
    assert.ok(p.related.length >= 1 && p.related.length <= 4, `${p.id}: ${p.related.length} related`);
    assert.equal(new Set(p.related).size, p.related.length, `${p.id}: duplicate related`);
    for (const r of p.related) {
      assert.ok(ids.has(r), `${p.id} → unknown ${r}`);
      assert.notEqual(r, p.id, `${p.id} links to itself`);
    }
  }
});

test("no em dash, no command for the unpublished package", () => {
  for (const p of m.RULE_PAGES) {
    for (const t of allText(p)) {
      assert.ok(!t.includes("—"), `${p.id}: em dash in "${t.slice(0, 60)}"`);
      assert.ok(!/npx\s+septune/.test(t), `${p.id}: npx septune`);
    }
  }
});

test("no sentence is shared between two pages", () => {
  const seen = new Map();
  for (const p of m.RULE_PAGES) {
    const sentences = new Set(
      [...TEXT_FIELDS.map((f) => p[f]), ...Object.values(p.frameworks ?? {})]
        .flatMap((t) => t.split(/(?<=[.!?])\s+/))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length >= 40),
    );
    for (const s of sentences) {
      const other = seen.get(s);
      assert.ok(!other, `"${s}" is on ${other} and ${p.id}`);
      seen.set(s, p.id);
    }
  }
});

test("old doc slugs point at existing pages", () => {
  const ids = new Set(m.RULE_CATALOG.map((r) => r.id));
  for (const [from, to] of Object.entries(m.LEGACY_DOC_SLUGS)) {
    assert.ok(ids.has(to), `${from} → ${to}`);
    assert.ok(!ids.has(from), `${from} is still a rule id`);
  }
});

test("every fixable rule shows a generated patch for Next.js", () => {
  for (const id of m.FIXABLE_RULE_IDS) {
    const fix = m.fixTemplateFor(id, "nextjs");
    assert.ok(fix?.diff?.length > 0, id);
    assert.ok(!fix.diff.includes("—"), `${id}: em dash in the patch`);
  }
  assert.equal(m.fixTemplateFor("meta-title-duplicate", "nextjs"), null);
});

test("every rule page title passes Septune's own length check", () => {
  for (const p of m.RULE_PAGES) {
    const full = `${m.pageTitle(p)} · Septune`;
    assert.ok(full.length <= 65, `${p.id}: ${full.length} chars`);
  }
});

test("the no-sitemap patch adds one line and keeps the existing robots.txt", () => {
  for (const fw of ["nextjs", "nuxt", "astro", "sveltekit"]) {
    const { diff } = m.fixTemplateFor("framework-robots-no-sitemap", fw);
    assert.ok(!diff.includes("new file mode"), `${fw}: rewrites the file`);
    assert.equal(diff.split("\n").filter((l) => /^\+.*sitemap/i.test(l)).length, 1, fw);
    assert.ok(!diff.includes("+Allow: /"), `${fw}: adds rules`);
  }
});

test("Astro patches use sitemap-index.xml, the file @astrojs/sitemap writes", () => {
  assert.match(m.fixTemplateFor("framework-robots-no-sitemap", "astro").diff, /\+Sitemap: https:\/\/example\.com\/sitemap-index\.xml/);
  assert.match(m.fixTemplateFor("framework-robots-missing", "astro").diff, /sitemap-index\.xml/);
  assert.match(m.fixTemplateFor("framework-sitemap-missing", "astro").diff, /\+  integrations: \[sitemap\(\)\]/);
  assert.match(m.fixTemplateFor("framework-robots-no-sitemap", "nextjs").diff, /sitemap: "https:\/\/example\.com\/sitemap\.xml"/);
});

test("the og:image URL patch sets metadataBase on Next.js", () => {
  assert.match(m.fixTemplateFor("meta-og-image-url", "nextjs").diff, /\+  metadataBase: new URL\("https:\/\/example\.com"\)/);
});

// Guides (/frameworks/<framework>/<slug>): same bar as the rule pages, plus a
// dated source for every page and internal links that resolve.
const guideText = (g) => [
  g.title, g.h1, g.description, g.answer,
  ...g.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap((b) => (b.kind === "p" ? [b.text] : b.kind === "list" ? b.items : [b.label]))]),
];

test("every guide fits Septune's own metadata checks and cites dated sources", () => {
  const frameworks = new Set(m.FRAMEWORK_PAGES.map((f) => f.slug));
  const rules = new Set(m.RULE_CATALOG.map((r) => r.id));
  const keys = new Set();
  for (const g of m.GUIDES) {
    const key = `${g.framework}/${g.slug}`;
    assert.ok(!keys.has(key), `${key} twice`);
    keys.add(key);
    assert.ok(frameworks.has(g.framework), `${key}: no framework page`);
    assert.ok(`${g.title} · Septune`.length <= 65, `${key}: title too long`);
    assert.ok(g.description.length <= 155, `${key}: description ${g.description.length} chars`);
    const words = g.answer.split(/\s+/).length;
    assert.ok(words >= 40 && words <= 70, `${key}: answer has ${words} words`);
    assert.ok(g.rules.length >= 1 && g.rules.every((r) => rules.has(r)), `${key}: unknown rule`);
    assert.ok(g.sources.length >= 1 && g.sources.every((x) => /^https:\/\//.test(x.url) && /^\d{4}-\d{2}-\d{2}$/.test(x.read)), `${key}: sources`);
    for (const t of guideText(g)) {
      assert.ok(!t.includes("—"), `${key}: em dash in "${t.slice(0, 60)}"`);
      assert.ok(!/npx\s+septune/.test(t), `${key}: npx septune`);
    }
  }
});

// Topic pages (/hosting, /guides, /search-console, /ai-crawlers): the guides'
// bar, plus no sentence repeated from another page, so Septune's own
// near-duplicate check has nothing to say about them.
test("every topic page fits Septune's own metadata checks and cites dated sources", () => {
  const rules = new Set(m.RULE_CATALOG.map((r) => r.id));
  const keys = new Set();
  const sentences = new Map();
  for (const t of m.TOPICS) {
    const key = `/${t.hub}/${t.slug}`;
    assert.ok(!keys.has(key), `${key} twice`);
    keys.add(key);
    assert.ok(m.HUBS[t.hub], `${key}: unknown section`);
    assert.match(t.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${key}: slug`);
    assert.ok(`${t.title} · Septune`.length <= 65, `${key}: title too long (${t.title.length})`);
    assert.ok(t.description.length <= 155, `${key}: description ${t.description.length} chars`);
    const words = t.answer.split(/\s+/).length;
    assert.ok(words >= 40 && words <= 70, `${key}: answer has ${words} words`);
    assert.ok(t.sections.length >= 3, `${key}: fewer than 3 sections`);
    assert.ok(t.rules.length >= 1 && t.rules.every((r) => rules.has(r)), `${key}: unknown rule`);
    assert.ok(t.sources.length >= 2 && t.sources.every((x) => /^https:\/\//.test(x.url) && /^\d{4}-\d{2}-\d{2}$/.test(x.read)), `${key}: sources`);
    assert.match(t.published, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(t.updated, /^\d{4}-\d{2}-\d{2}$/);
    for (const text of guideText(t)) {
      assert.ok(!text.includes("—"), `${key}: em dash in "${text.slice(0, 60)}"`);
      assert.ok(!/npx\s+septune/.test(text), `${key}: npx septune`);
      assert.ok(!/lorem ipsum/i.test(text), `${key}: placeholder text`);
    }
    for (const b of t.sections.flatMap((s) => s.blocks)) {
      for (const text of b.kind === "p" ? [b.text] : b.kind === "list" ? b.items : []) {
        for (const sentence of text.split(/(?<=[.!?])\s+/).filter((x) => x.split(/\s+/).length >= 8)) {
          const seen = sentences.get(sentence);
          assert.ok(!seen || seen === key, `${key} repeats a sentence of ${seen}: "${sentence.slice(0, 70)}"`);
          sentences.set(sentence, key);
        }
      }
    }
  }
});

test("internal links in guides, topics and framework sections point at real pages", () => {
  const pages = new Set([
    "/", "/audit", "/pricing", "/docs", "/docs/agent", "/changelog",
    "/tools/noindex-checker", "/tools/llms-txt-generator",
    ...m.FRAMEWORK_PAGES.map((f) => `/frameworks/${f.slug}`),
    ...m.GUIDES.map((g) => `/frameworks/${g.framework}/${g.slug}`),
    ...m.RULE_CATALOG.map((r) => `/docs/issues/${r.id}`),
    ...Object.keys(m.HUBS).map((h) => `/${h}`),
    ...m.TOPICS.map((t) => `/${t.hub}/${t.slug}`),
  ]);
  const blocks = [...m.GUIDES.flatMap((g) => g.sections), ...m.TOPICS.flatMap((t) => t.sections), ...m.FRAMEWORK_PAGES.flatMap((f) => f.sections ?? [])].flatMap((s) => s.blocks);
  const text = blocks.flatMap((b) => (b.kind === "p" ? [b.text] : b.kind === "list" ? b.items : [])).join("\n");
  const links = [...text.matchAll(/\]\((\/[^)]+)\)/g)].map((x) => x[1]);
  assert.ok(links.length > 0);
  for (const href of links) assert.ok(pages.has(href.split("#")[0]), `dead internal link ${href}`);
});

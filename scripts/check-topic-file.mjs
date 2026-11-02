// Vérifie un seul fichier de pages thématiques (src/lib/seo/topics/<fichier>.ts)
// avec les mêmes règles que tests/rule-docs.test.mjs, sans dépendre des autres
// fichiers en cours d'écriture. Usage : node scripts/check-topic-file.mjs hosting
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
const out = join(mkdtempSync(join(tmpdir(), "rf-topic-")), "t.mjs");
await build({
  stdin: {
    contents: `export * as data from "./src/lib/seo/topics/${file}.ts"; export { RULE_CATALOG } from "./src/lib/audit/catalog.ts"; export { GUIDES } from "./src/lib/seo/guides.ts"; export { FRAMEWORK_PAGES } from "./src/lib/seo/content.ts";`,
    resolveDir: ROOT,
    loader: "ts",
  },
  outfile: out,
  bundle: true,
  platform: "node",
  format: "esm",
  tsconfig: join(ROOT, "tsconfig.json"),
  logLevel: "error",
});
const m = await import(pathToFileURL(out).href);
const pages = Object.values(m.data).flat();
const PLANNED = [
  "hosting/github-pages", "hosting/cloudflare-pages", "hosting/netlify", "hosting/vercel", "hosting/firebase", "hosting/aws-amplify",
  "guides/hugo-seo", "guides/eleventy-seo", "guides/mkdocs-seo", "guides/starlight-seo", "guides/angular-seo", "guides/docusaurus-seo", "guides/vitepress-seo",
  "guides/x-robots-tag", "guides/trailing-slash", "guides/redirect-status-codes", "guides/404-vs-410", "guides/meta-refresh", "guides/canonical-vs-noindex", "guides/self-referencing-canonical",
  "guides/sitemap-lastmod", "guides/sitemap-index", "guides/sitemap-priority", "guides/crawl-delay", "guides/favicon-google-search", "guides/og-image-not-updating", "guides/twitter-card-not-showing",
  "search-console/duplicate-without-canonical", "search-console/403-forbidden", "search-console/blocked-by-robots-txt", "search-console/alternate-page-with-canonical", "search-console/soft-404", "search-console/server-error-5xx", "search-console/page-with-redirect",
  "guides/seo-testing-playwright", "guides/seo-checks-in-ci", "guides/seo-regression-testing", "guides/staging-site-indexed",
  "ai-crawlers/gptbot", "ai-crawlers/oai-searchbot", "ai-crawlers/claudebot", "ai-crawlers/perplexitybot", "ai-crawlers/applebot-extended", "ai-crawlers/meta-externalagent", "guides/llms-txt-examples",
].map((p) => `/${p}`);
const known = new Set([
  "/", "/audit", "/pricing", "/docs", "/docs/agent", "/changelog", "/tools/noindex-checker", "/tools/llms-txt-generator",
  "/hosting", "/guides", "/search-console", "/ai-crawlers", ...PLANNED,
  ...m.FRAMEWORK_PAGES.map((f) => `/frameworks/${f.slug}`),
  ...m.GUIDES.map((g) => `/frameworks/${g.framework}/${g.slug}`),
  ...m.RULE_CATALOG.map((r) => `/docs/issues/${r.id}`),
]);
const rules = new Set(m.RULE_CATALOG.map((r) => r.id));
const errors = [];
const sentences = new Map();
const err = (k, msg) => errors.push(`${k}: ${msg}`);
for (const t of pages) {
  const key = `/${t.hub}/${t.slug}`;
  if (!["hosting", "guides", "search-console", "ai-crawlers"].includes(t.hub)) err(key, "unknown hub");
  if (!PLANNED.includes(key)) err(key, "not in the planned list (ask before adding pages)");
  if (`${t.title} · Septune`.length > 65) err(key, `title ${t.title.length} chars, max 55`);
  if (t.description.length > 155) err(key, `description ${t.description.length} chars, max 155`);
  const words = t.answer.split(/\s+/).length;
  if (words < 40 || words > 70) err(key, `answer ${words} words, 40 to 70`);
  if (t.sections.length < 3) err(key, "fewer than 3 sections");
  for (const r of t.rules) if (!rules.has(r)) err(key, `unknown rule ${r}`);
  if (t.rules.length < 1) err(key, "no rule");
  if (t.sources.length < 2) err(key, "fewer than 2 sources");
  for (const s of t.sources) if (!/^https:\/\//.test(s.url) || !/^\d{4}-\d{2}-\d{2}$/.test(s.read)) err(key, `bad source ${s.url}`);
  const texts = [t.title, t.h1, t.description, t.answer, ...t.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap((b) => (b.kind === "p" ? [b.text] : b.kind === "list" ? b.items : [b.label]))])];
  for (const x of texts) {
    if (x.includes("—")) err(key, `em dash in "${x.slice(0, 60)}"`);
    if (/npx\s+septune/.test(x)) err(key, "npx septune (the npm package is not published)");
    for (const [, href] of x.matchAll(/\]\(([^)\s]+)\)/g)) if (href.startsWith("/") && !known.has(href.split("#")[0])) err(key, `dead internal link ${href}`);
  }
  for (const b of t.sections.flatMap((s) => s.blocks)) {
    for (const x of b.kind === "p" ? [b.text] : b.kind === "list" ? b.items : []) {
      for (const sentence of x.split(/(?<=[.!?])\s+/).filter((y) => y.split(/\s+/).length >= 8)) {
        if (sentences.has(sentence) && sentences.get(sentence) !== key) err(key, `repeats a sentence of ${sentences.get(sentence)}`);
        sentences.set(sentence, key);
      }
    }
  }
}
console.log(`${pages.length} pages checked in ${file}.ts`);
if (errors.length) {
  console.log(errors.join("\n"));
  process.exit(1);
}
console.log("OK");

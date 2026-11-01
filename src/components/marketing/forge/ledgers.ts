import { RULE_CATALOG } from "@/lib/audit/catalog";
import { FRAMEWORK_PAGES } from "@/lib/seo/content";
import { GUIDES } from "@/lib/seo/guides";

/*
 * The writing set faintly behind each picture: what the picture is made of,
 * as the tool would log it. Real material only. The crawl lists this site's
 * own public pages (the same routes as sitemap.ts), the checks are the rule
 * catalogue, the patches are the noindex fix in each framework's own syntax.
 * The deploy log replays the example of the pull-request panel above it.
 */

const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s.padEnd(n));

/** This site's public pages in crawl order: home, its links, then the pages they lead to. */
const PATHS = [
  "/",
  "/audit",
  "/pricing",
  "/docs",
  "/docs/agent",
  "/changelog",
  "/tools/noindex-checker",
  "/tools/llms-txt-generator",
  ...FRAMEWORK_PAGES.map((f) => `/frameworks/${f.slug}`),
  ...RULE_CATALOG.slice(0, 12).map((r) => `/docs/issues/${r.id}`),
  ...GUIDES.slice(0, 6).map((g) => `/frameworks/${g.framework}/${g.slug}`),
];

export const CRAWL_LOG = PATHS.map((p) => `200  ${p}`);

export const DEPLOY_LOG = PATHS.slice(0, 18).map((p) =>
  p === "/pricing"
    ? `${pad(p, 26)}index → noindex   critical`
    : p === "/docs"
      ? `${pad(p, 26)}canonical changed  warning`
      : `${pad(p, 26)}unchanged`,
);

export const PATCH_LOG = [
  "app/pricing/page.tsx",
  "  export const metadata = {",
  '    title: "Pricing",',
  "-   robots: { index: false },",
  "  };",
  "",
  "pages/pricing.vue",
  "  useSeoMeta({",
  "    title: 'Pricing',",
  "-   robots: 'noindex',",
  "  })",
  "",
  "src/pages/pricing.astro",
  "  <title>Pricing</title>",
  '- <meta name="robots" content="noindex" />',
  "",
  "src/routes/pricing/+page.svelte",
  "  <svelte:head>",
  '-   <meta name="robots" content="noindex" />',
  "  </svelte:head>",
  "",
];

export const CHECK_LOG = RULE_CATALOG.map((r, i) => `${String(i + 1).padStart(2, "0")}  ${r.id}`);

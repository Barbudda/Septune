/**
 * septune.dev as Septune crawled it on 2026-11-01 (septune audit
 * https://www.septune.dev --pages 100): 93 pages, breadth first. The home
 * page, the 16 pages it links to, then the 76 one link deeper. A snapshot of
 * that run, not of the live catalogue: the homepage says "93 pages read on
 * 1 November", so the figures draw exactly those. Run the crawl again and
 * replace this list when the site changes.
 */

export const HOME_PAGE = "septune.dev";

/** Linked from the home page, in the order the figures lay them out. */
export const LINKED_PAGES = [
  "/audit",
  "/pricing",
  "/changelog",
  "/docs",
  "/frameworks/nextjs",
  "/frameworks/nuxt",
  "/frameworks/astro",
  "/frameworks/sveltekit",
  "/frameworks/vite-react",
  "/tools/noindex-checker",
  "/tools/llms-txt-generator",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/preorder",
] as const;

/** The check pages under /docs/issues/, one per check of the 2026-11-01 catalogue (69). */
const CHECK_PAGES = [
  "meta-title-missing",
  "meta-title-duplicate",
  "meta-title-length",
  "meta-description-missing",
  "meta-description-duplicate",
  "meta-og-image-missing",
  "meta-og-image-url",
  "content-keyword-alignment",
  "indexing-noindex",
  "indexing-noindex-utility",
  "indexing-robots-unavailable",
  "indexing-robots-blocks-google",
  "indexing-robots-blocks-pages",
  "indexing-robots-html",
  "indexing-robots-format",
  "indexing-broken-page",
  "indexing-soft-404-site",
  "indexing-soft-404",
  "indexing-canonical-missing",
  "indexing-canonical-mismatch",
  "indexing-canonical-target-invalid",
  "indexing-canonical-multiple",
  "indexing-meta-refresh",
  "indexing-hreflang-invalid",
  "indexing-duplicate-content",
  "indexing-redirect-chain",
  "indexing-temporary-redirect",
  "indexing-html-lang-missing",
  "indexing-sitemap-hygiene",
  "indexing-sitemap-gaps",
  "indexing-sitemap-format",
  "indexing-https-certificate",
  "indexing-host-duplicate",
  "indexing-http-not-redirected",
  "structure-h1-missing",
  "structure-h1-multiple",
  "structure-heading-skip",
  "structure-thin-content",
  "structure-url-format",
  "content-readability",
  "content-keyword-stuffing",
  "img-alt-missing",
  "img-dimensions-missing",
  "img-lazy-missing",
  "img-legacy-format",
  "img-broken",
  "schema-missing",
  "schema-invalid",
  "schema-website-missing",
  "link-orphan-pages",
  "link-deep-pages",
  "link-broken-internal",
  "link-broken-external",
  "link-malformed",
  "link-generic-anchors",
  "link-missing-internal-opportunities",
  "perf-core-web-vitals",
  "perf-slow-ttfb",
  "perf-render-blocking",
  "perf-oversized-images",
  "perf-heavy-html",
  "perf-mixed-content",
  "perf-broken-assets",
  "perf-viewport-missing",
  "perf-viewport-no-width",
  "framework-sitemap-missing",
  "framework-robots-missing",
  "framework-robots-no-sitemap",
  "framework-js-only-content",
].map((id) => `/docs/issues/${id}`);

/** One link deeper: the agent guide, the 69 check pages, the 6 framework guides. */
export const DEEP_PAGES = [
  "/docs/agent",
  ...CHECK_PAGES,
  "/frameworks/nextjs/metadatabase-not-set",
  "/frameworks/nextjs/og-image-not-working",
  "/frameworks/nextjs/noindex",
  "/frameworks/nextjs/canonical-url",
  "/frameworks/astro/sitemap-not-working",
  "/frameworks/vite-react/lovable-seo",
];

/** Kept out of search on purpose (noindex, not in the sitemap), as the report says. */
export const NOINDEX_PAGES = new Set<string>(["/login", "/signup", "/preorder"]);

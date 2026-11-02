import type { TopicPage } from "./types";

// Pages du hub « guides » sur les sitemaps, robots.txt Crawl-delay, le favicon
// dans Google et les cartes de partage (Open Graph, X). Chaque fait vient
// d'une page lue le 2026-11-02 ou du code source de la version citée.
// La doc des cartes X n'est plus en ligne (les anciennes adresses redirigent
// vers l'accueil du portail développeur) : ses faits viennent de copies
// archivées par la Wayback Machine, datées dans chaque source.

const READ = "2026-11-02";

const SITEMAPS_ORG = "https://www.sitemaps.org/protocol.html";
const GOOGLE_BUILD_SITEMAP = "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap";
const GOOGLE_LASTMOD_BLOG = "https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping";
const GSC_SITEMAPS_HELP = "https://support.google.com/webmasters/answer/7451001?hl=en";
const BING_LASTMOD_2023 = "https://blogs.bing.com/webmaster/february-2023/The-Importance-of-Setting-the-lastmod-Tag-in-Your-Sitemap";
const BING_SITEMAPS_2025 = "https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search";
const NEXT_SITEMAP_DOCS = "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap";
const NEXT_RESOLVE_ROUTE_DATA = "https://app.unpkg.com/next@16.2.9/files/dist/build/webpack/loaders/metadata/resolve-route-data.js";
const NEXT_IMAGE_LOADER = "https://app.unpkg.com/next@16.2.9/files/dist/build/webpack/loaders/next-metadata-image-loader.js";
const NEXT_SITEMAP_DEFAULTS = "https://unpkg.com/next-sitemap@4.2.3/dist/esm/utils/defaults.js";
const X_GETTING_STARTED = "https://web.archive.org/web/20251215221623/https://developer.x.com/en/docs/x-for-websites/cards/guides/getting-started";
const X_TROUBLESHOOTING = "https://web.archive.org/web/20251231142717/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards";
const X_MARKUP = "https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup";
const X_LARGE_IMAGE = "https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image";

export const SITEMAPS: TopicPage[] = [
  {
    hub: "guides",
    slug: "sitemap-lastmod",
    title: "Sitemap lastmod date format, and when Google uses it",
    h1: "Sitemap lastmod date format: what's valid, and how to set a date Google will trust",
    description:
      "The W3C Datetime formats lastmod accepts, when Google and Bing use the date, what counts as a real change, and how to set it from content dates in Next.js.",
    answer:
      "Use W3C Datetime: a date such as `2026-11-02`, or a date and time with a time zone, such as `2026-11-02T09:30:00+00:00`. A time without a zone is invalid. Google uses lastmod only when it's consistently and verifiably accurate, so set it to the page's last significant change, never to the time the sitemap was built.",
    sections: [
      {
        heading: "Which date formats does lastmod accept?",
        blocks: [
          {
            kind: "p",
            text: "The sitemap protocol asks for W3C Datetime, a profile of ISO 8601 published as a W3C note in 1998. Google's help for the Sitemaps report narrows it to two forms and adds one rule: the time is optional, but a time given without a time zone is an error.",
          },
          {
            kind: "list",
            items: [
              "`2026-11-02`: the date alone. Google reads the missing time as `00:00:00Z`.",
              "`2026-11-02T09:30:15+01:00`, or `2026-11-02T09:30:15Z` for UTC: date, hours, minutes, seconds and the zone.",
              "The W3C note also defines `2026`, `2026-11`, minutes without seconds (`2026-11-02T09:30+01:00`) and fractions of a second (`2026-11-02T09:30:15.25Z`). Google's help lists only the two forms above.",
              "Not valid in any profile: `2026-11-02T09:30:00` (no zone), `2026-11-02 09:30` (a space instead of the `T`), `11/02/2026`.",
            ],
          },
          {
            kind: "p",
            text: "In Next.js, `lastModified` in `app/sitemap.ts` takes a `Date` or a string. In next 16.2.9 a `Date` is printed with `toISOString()`, which gives milliseconds and a `Z` (`2026-11-02T09:30:15.250Z`): valid W3C Datetime, but not one of the two forms Google's help shows, and we found no Google page that says either way. A string is copied into `<lastmod>` exactly as written, without any check, so a database value such as `2026-11-02 09:30:00` ships as an invalid date. Passing `YYYY-MM-DD` strings matches Google's first form exactly.",
          },
        ],
      },
      {
        heading: "Does Google use lastmod?",
        blocks: [
          {
            kind: "p",
            text: "Yes, on one condition. Google's guide to building sitemaps says it uses the value if it's consistently and verifiably accurate, for example when it matches the page's own last modification. In a June 2023 post on the Search Central blog, Gary Illyes wrote that Google uses lastmod to schedule recrawls of URLs it already knows, and that if a page changed seven years ago while lastmod says yesterday, Google eventually stops believing the site's dates.",
          },
          {
            kind: "p",
            text: "Bing reads it as well. Its webmaster blog asked in February 2023 for the date the page was last modified, not the date the sitemap was generated, and repeated it in July 2025, this time asking for a date with a time.",
          },
          {
            kind: "list",
            items: [
              "Update lastmod when the main text changes, when structured data is added or changed, or when links on the page change.",
              "Leave it alone for a new copyright year or a small edit in a sidebar or footer.",
              "Leaving it out is allowed. The same Google post says it's fine to omit lastmod on pages such as a homepage or a category page whose date your software can't tell.",
            ],
          },
        ],
      },
      {
        heading: "Why stamping the build time on every URL backfires",
        blocks: [
          {
            kind: "p",
            text: "The shortcut is common because the tools ship it. The main example in the Next.js sitemap docs sets `lastModified: new Date()` on every entry. next-sitemap 4.2.3 does the same by default: `autoLastmod` is on, and its default transform writes `new Date().toISOString()` for each URL. Each deploy then claims that every page changed at the same second.",
          },
          {
            kind: "p",
            text: "Both search engines describe that pattern. Bing wrote that when dates are consistently set to the current date, it suspects them and may disregard them. Google only uses the field when it matches reality. The pages you did edit lose the one hint that would have sent a crawler to them first.",
          },
        ],
      },
      {
        heading: "Set lastmod from real content dates in Next.js",
        blocks: [
          {
            kind: "p",
            text: "Take the date from wherever the content lives: a front-matter field, the CMS's `updatedAt`, a column in your database. Give listing pages the date of their newest item, since a new link on the page counts as a significant change. Leave the field out where no such date exists.",
          },
          {
            kind: "code",
            label: "app/sitemap.ts",
            code: 'import type { MetadataRoute } from "next";\nimport { getPosts } from "@/lib/posts"; // front matter: { slug, updated: "2026-10-28" }\n\nconst SITE = "https://www.example.com";\n\nexport default async function sitemap(): Promise<MetadataRoute.Sitemap> {\n  const posts = await getPosts();\n  const newest = posts.map((p) => p.updated).sort().at(-1);\n\n  return [\n    // The blog index gains a link whenever a post is added, so it takes the newest date.\n    { url: `${SITE}/blog`, lastModified: newest },\n    ...posts.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: p.updated })),\n    // No content date for this page: no lastmod rather than a build stamp.\n    { url: `${SITE}/pricing` },\n  ];\n}',
          },
          {
            kind: "p",
            text: "`YYYY-MM-DD` strings sort correctly as text and pass through Next.js untouched. If the dates come from git instead (`git log -1 --format=%cI -- <file>` prints a strict ISO 8601 date with its offset), the build needs the history: in a clone of depth 1, every file reports the date of that single commit, which is the build stamp again under another name. The rest of the framework's defaults are on [the Next.js page](/frameworks/nextjs).",
          },
        ],
      },
      {
        heading: "How to check the dates your sitemap sends",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -s https://www.example.com/sitemap.xml | grep -o '<lastmod>[^<]*' | sort | uniq -c | sort -rn | head -5",
          },
          {
            kind: "p",
            text: "If one value covers most URLs, the dates come from the build. Run it again after a deploy that changed no content: accurate dates stay put. Search Console's Sitemaps report flags invalid dates per file. Septune's sitemap checks read each file and the URLs it lists but not the dates, so this one stays a manual check; a file that can't be parsed at all is covered in [sitemap files that can't be read](/docs/issues/indexing-sitemap-format). The two other optional fields are covered in [sitemap priority and changefreq](/guides/sitemap-priority), and splitting large sites in [sitemap index best practices](/guides/sitemap-index).",
          },
        ],
      },
    ],
    rules: ["indexing-sitemap-format", "indexing-sitemap-hygiene"],
    sources: [
      { label: "sitemaps.org, Sitemaps XML format (lastmod)", url: SITEMAPS_ORG, read: READ },
      { label: "W3C, Date and Time Formats (NOTE-datetime, 1998)", url: "https://www.w3.org/TR/NOTE-datetime", read: READ },
      { label: "Google Search Central, build and submit a sitemap", url: GOOGLE_BUILD_SITEMAP, read: READ },
      { label: "Search Console Help, Sitemaps report (Invalid date)", url: GSC_SITEMAPS_HELP, read: READ },
      { label: "Google Search Central blog, sitemaps ping and lastmod (June 26, 2023)", url: GOOGLE_LASTMOD_BLOG, read: READ },
      { label: "Bing Webmaster blog, setting the lastmod tag (February 1, 2023)", url: BING_LASTMOD_2023, read: READ },
      { label: "Bing Webmaster blog, sitemaps in AI powered search (July 31, 2025)", url: BING_SITEMAPS_2025, read: READ },
      { label: "Next.js docs, sitemap.xml", url: NEXT_SITEMAP_DOCS, read: READ },
      { label: "Next.js 16.2.9, resolve-route-data.js (how lastModified is printed)", url: NEXT_RESOLVE_ROUTE_DATA, read: READ },
      { label: "next-sitemap 4.2.3, default config (autoLastmod)", url: NEXT_SITEMAP_DEFAULTS, read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "sitemap-index",
    title: "Sitemap index best practices: limits, splits, gzip",
    h1: "Sitemap index best practices: the real limits, how to split, and where to declare the index",
    description:
      "A sitemap holds 50,000 URLs and 50 MB uncompressed; an index lists 50,000 sitemaps and can't nest. How to split, gzip and declare it, with Next.js code.",
    answer:
      "Each sitemap holds at most 50,000 URLs and 50 MB uncompressed. An index lists at most 50,000 sitemaps, within the same 50 MB, and may not list another index. Split by section so each file changes for one reason, gzip if you want (the limit still applies uncompressed), and declare the index in robots.txt and in Search Console.",
    sections: [
      {
        heading: "What are the limits of a sitemap and of a sitemap index?",
        blocks: [
          {
            kind: "list",
            items: [
              "One sitemap file: 50,000 URLs and 50 MB (52,428,800 bytes) uncompressed, whichever comes first. sitemaps.org and Google give the same numbers.",
              "One sitemap index: 50,000 sitemaps and 50 MB, per sitemaps.org. Google's page on large sitemaps gives the same 50,000 `<loc>` entries.",
              "One site in Search Console: up to 500 sitemap index files, according to that same Google page.",
              "Bing's July 2025 post multiplies it out: 50,000 sitemaps of 50,000 URLs, so 2.5 billion URLs behind one index.",
            ],
          },
          {
            kind: "p",
            text: "At least one page that ranks for this query gives 50 as the number of sitemaps per index. The protocol's number is 50,000. Generators split well below the ceiling anyway: next-sitemap 4.2.3 starts a new file every 5,000 URLs by default (`sitemapSize`) and writes the index for you, and @astrojs/sitemap 3.7.4 cuts at 45,000 entries (`entryLimit`) and always writes `sitemap-index.xml`, as described in [the Astro sitemap guide](/frameworks/astro/sitemap-not-working).",
          },
        ],
      },
      {
        heading: "Can a sitemap index point to another sitemap index?",
        blocks: [
          {
            kind: "p",
            text: "No. Google's help for the Sitemaps report says a sitemap index file can list sitemap files only, never other index files, and reports an index that does as \"Incorrect sitemap index format\". An index that lists its own URL gets the same error. Past 50,000 sitemaps, write several index files and submit each of them.",
          },
          {
            kind: "p",
            text: "Two more constraints come from the docs. The files an index lists must be on the same site as the index, and Google wants them in the index's directory or below it. Google waives the same-site rule when cross-site submission is set up. And the `<lastmod>` of a `<sitemap>` entry describes the child file itself, not the pages inside it.",
          },
        ],
      },
      {
        heading: "How should you split a large sitemap?",
        blocks: [
          {
            kind: "p",
            text: "Split along the lines your content changes on: one file per section (`/blog`, `/docs`, `/products`) and, inside a big section, ranges that don't move. Google says the `<lastmod>` on each index entry may help it schedule which sitemap to fetch, so a section that rarely changes keeps an old date and can be left alone.",
          },
          {
            kind: "p",
            text: "Avoid splitting by offset (rows 0 to 49,999, then the next 50,000). One product inserted near the start pushes every later URL into the next file, so every file changes on every insert. Ranges of IDs, or one file per creation month, leave old files untouched.",
          },
          {
            kind: "code",
            label: "sitemap-index.xml",
            code: '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>https://www.example.com/sitemaps/pages.xml</loc>\n    <lastmod>2026-10-14</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>https://www.example.com/sitemaps/blog.xml</loc>\n    <lastmod>2026-11-01T16:20:00+00:00</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>https://www.example.com/sitemaps/products-2026-10.xml.gz</loc>\n    <lastmod>2026-11-02</lastmod>\n  </sitemap>\n</sitemapindex>',
          },
          {
            kind: "p",
            text: "The date rules for those `<lastmod>` values are in [the lastmod guide](/guides/sitemap-lastmod).",
          },
        ],
      },
      {
        heading: "Should sitemap files be gzipped?",
        blocks: [
          {
            kind: "p",
            text: "If you like. sitemaps.org allows gzip to save bandwidth, but the 50 MB limit is measured on the file once uncompressed, so compression doesn't let one file hold more URLs. A `.gz` that Google can't inflate shows up in the Sitemaps report as a compression error; recompress it and submit it again. Index files can be compressed too.",
          },
        ],
      },
      {
        heading: "Building the index in Next.js",
        blocks: [
          {
            kind: "p",
            text: "`generateSitemaps` splits one `sitemap.ts` into `/product/sitemap/0.xml`, `/product/sitemap/1.xml` and so on, but nothing lists them: next 16.2.9 contains no code that writes a `<sitemapindex>`. Add a route handler for the index, fed by the same function that gives `generateSitemaps` its IDs.",
          },
          {
            kind: "code",
            label: "app/sitemap-index.xml/route.ts",
            code: 'import { productSitemapIds } from "@/lib/sitemaps"; // also returned by generateSitemaps()\n\nconst SITE = "https://www.example.com";\nexport const revalidate = 3600;\n\nexport async function GET() {\n  const ids = await productSitemapIds(); // [{ id: 0 }, { id: 1 }, ...]\n  const files = [`${SITE}/sitemap.xml`, ...ids.map(({ id }) => `${SITE}/product/sitemap/${id}.xml`)];\n  const entries = files.map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`).join("\\n");\n\n  return new Response(\n    `<?xml version="1.0" encoding="UTF-8"?>\\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n${entries}\\n</sitemapindex>\\n`,\n    { headers: { "Content-Type": "application/xml" } },\n  );\n}',
          },
          {
            kind: "p",
            text: "The Next.js docs use the same folder pattern for `app/rss.xml/route.ts`. Since Next.js 15, `GET` route handlers are dynamic by default; the `revalidate` export caches the response instead of rebuilding the index on every request.",
          },
        ],
      },
      {
        heading: "Where to declare the sitemap index",
        blocks: [
          {
            kind: "code",
            label: "robots.txt",
            code: "User-agent: *\nAllow: /\n\nSitemap: https://www.example.com/sitemap-index.xml",
          },
          {
            kind: "p",
            text: "Google requires a full URL with protocol and host on the `Sitemap:` line, accepts it anywhere in the file, and sets no limit on how many you add. Submit the index in Search Console's Sitemaps report and in Bing Webmaster Tools as well: both fetch it right after submission, and Bing says it rechecks it typically at least once a day. A robots.txt with no such line is the case of [robots.txt without a Sitemap line](/docs/issues/framework-robots-no-sitemap), and a child file that won't parse is one of the [sitemap files that can't be read](/docs/issues/indexing-sitemap-format).",
          },
          {
            kind: "code",
            label: "terminal: every child file should answer 200",
            code: "curl -s https://www.example.com/sitemap-index.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//' |\n  while read -r u; do curl -s -o /dev/null -w \"%{http_code} $u\\n\" \"$u\"; done",
          },
        ],
      },
    ],
    rules: ["indexing-sitemap-format", "framework-sitemap-missing", "framework-robots-no-sitemap"],
    sources: [
      { label: "sitemaps.org, Sitemaps XML format (limits, index files, gzip)", url: SITEMAPS_ORG, read: READ },
      { label: "Google Search Central, build and submit a sitemap", url: GOOGLE_BUILD_SITEMAP, read: READ },
      { label: "Google Search Central, manage large sitemaps with an index", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps", read: READ },
      { label: "Search Console Help, Sitemaps report (index errors)", url: GSC_SITEMAPS_HELP, read: READ },
      { label: "Google Search Central, robots.txt specification (sitemap field)", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ },
      { label: "Bing Webmaster blog, sitemaps in AI powered search (July 31, 2025)", url: BING_SITEMAPS_2025, read: READ },
      { label: "Next.js docs, generateSitemaps", url: "https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps", read: READ },
      { label: "Next.js 16.2.9, next-metadata-route-loader.js (generateSitemaps routes)", url: "https://app.unpkg.com/next@16.2.9/files/dist/build/webpack/loaders/next-metadata-route-loader.js", read: READ },
      { label: "Next.js docs, route.js (non-UI responses, GET caching)", url: "https://nextjs.org/docs/app/api-reference/file-conventions/route", read: READ },
      { label: "next-sitemap 4.2.3, default config (sitemapSize)", url: NEXT_SITEMAP_DEFAULTS, read: READ },
      { label: "Astro docs, @astrojs/sitemap (entryLimit)", url: "https://docs.astro.build/en/guides/integrations-guide/sitemap/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "sitemap-priority",
    title: "Sitemap priority in Google: ignored. Set this instead",
    h1: "Does Google use sitemap priority? No, and it ignores changefreq too",
    description:
      "Google ignores <priority> and <changefreq> in sitemaps, and so does Bing. Where those values in your build come from, and what to generate instead.",
    answer:
      "No. Google's sitemap documentation says it ignores `<priority>` and `<changefreq>`, and Bing wrote in July 2025 that it ignores both as well. Drop them from generated sitemaps. What both engines do read is the list of URLs and an accurate `<lastmod>`, so spend the effort on listing only canonical, indexable pages with their real modification dates.",
    sections: [
      {
        heading: "What Google and Bing say about priority and changefreq",
        blocks: [
          {
            kind: "list",
            items: [
              "Google, in its guide to building a sitemap: \"Google ignores `<priority>` and `<changefreq>` values.\"",
              "Google Search Central blog, June 2023: Google \"still doesn't use the changefreq or priority elements at all\". The post explains that changefreq overlaps with lastmod, and that priority is a heavily subjective field that generally doesn't reflect a page's actual priority among the site's other pages.",
              "Bing, February 2023: its analysis found most changefreq and priority values set incorrectly, often to the same value across a whole sitemap, so Bing \"largely disregards these fields\".",
              "Bing, July 2025: changefreq and priority are ignored and influence neither crawling nor ranking.",
            ],
          },
          {
            kind: "p",
            text: "Bing's wording hardened between its two posts, from largely disregarded to ignored. Neither engine documents any use of the two fields today.",
          },
        ],
      },
      {
        heading: "What priority was meant to do",
        blocks: [
          {
            kind: "p",
            text: "In the sitemaps.org protocol, `<priority>` runs from 0.0 to 1.0 with a default of 0.5, and only compares URLs of your own site with each other: it was never a way to rank against other sites, and the protocol warns that marking every URL high gains nothing. `<changefreq>` takes `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly` or `never`, and the protocol already calls it \"a hint and not a command\": crawlers may visit an hourly page less often, or a yearly one more often.",
          },
        ],
      },
      {
        heading: "Where the 0.7 and daily in your sitemap come from",
        blocks: [
          {
            kind: "p",
            text: "Few people type these values. The tools write them:",
          },
          {
            kind: "list",
            items: [
              "next-sitemap 4.2.3 puts `priority` 0.7 and `changefreq` daily on every URL by default, plus a `lastmod` set to the build time because `autoLastmod` is on.",
              "Next.js `app/sitemap.ts`: next 16.2.9 prints `<priority>` and `<changefreq>` only when your function returns them, but the first example in the Next.js docs returns both on every entry, and copied code keeps them.",
              "@astrojs/sitemap offers `changefreq` and `priority` as site-wide options, and the Astro docs themselves add that Google ignores them.",
            ],
          },
          {
            kind: "p",
            text: "Nothing documented says these values hurt. They are bytes the crawler skips, and they invite someone to tune them in the hope of moving a page up, which no engine has said it rewards.",
          },
        ],
      },
      {
        heading: "What to put in a generated sitemap instead",
        blocks: [
          {
            kind: "p",
            text: "Keep what search engines use: an absolute URL for each page that is indexable and its own canonical, and a `<lastmod>` taken from the content, as explained in [the lastmod guide](/guides/sitemap-lastmod). Add image, video or hreflang entries only if you need them.",
          },
          {
            kind: "code",
            label: "app/sitemap.ts",
            code: 'import type { MetadataRoute } from "next";\nimport { getPages } from "@/lib/content";\n\nexport default async function sitemap(): Promise<MetadataRoute.Sitemap> {\n  const pages = await getPages(); // only indexable pages that are their own canonical\n  return pages.map((page) => ({\n    url: `https://www.example.com${page.path}`,\n    lastModified: page.updated, // "2026-10-28" from the content, or undefined\n  }));\n}',
          },
          {
            kind: "code",
            label: "next-sitemap.config.js",
            code: '/** @type {import(\'next-sitemap\').IConfig} */\nmodule.exports = {\n  siteUrl: "https://www.example.com",\n  // Replaces the default transform, which adds priority 0.7, changefreq daily\n  // and the build time as lastmod to every URL.\n  transform: async (config, loc) => ({ loc }),\n};',
          },
          {
            kind: "p",
            text: "next-sitemap 4.2.3 writes a field only when the transform returns a value for it, so this config produces bare `<loc>` entries. More of the framework's defaults are on [the Next.js page](/frameworks/nextjs).",
          },
        ],
      },
      {
        heading: "What matters more than any optional field: the URL list",
        blocks: [
          {
            kind: "p",
            text: "Every entry is a claim that the URL deserves indexing, so an entry that redirects, answers an error, carries noindex or points its canonical elsewhere works against you, as described in [sitemap URLs that shouldn't be indexed](/docs/issues/indexing-sitemap-hygiene). An indexable page missing from the list is the opposite gap, and only gets found through links.",
          },
        ],
      },
    ],
    rules: ["indexing-sitemap-hygiene", "indexing-sitemap-gaps"],
    sources: [
      { label: "Google Search Central, build and submit a sitemap", url: GOOGLE_BUILD_SITEMAP, read: READ },
      { label: "Google Search Central blog, sitemaps ping and lastmod (June 26, 2023)", url: GOOGLE_LASTMOD_BLOG, read: READ },
      { label: "Bing Webmaster blog, setting the lastmod tag (February 1, 2023)", url: BING_LASTMOD_2023, read: READ },
      { label: "Bing Webmaster blog, sitemaps in AI powered search (July 31, 2025)", url: BING_SITEMAPS_2025, read: READ },
      { label: "sitemaps.org, Sitemaps XML format (priority, changefreq)", url: SITEMAPS_ORG, read: READ },
      { label: "next-sitemap 4.2.3, default config", url: NEXT_SITEMAP_DEFAULTS, read: READ },
      { label: "next-sitemap 4.2.3, sitemap-builder.js (fields written only when set)", url: "https://unpkg.com/next-sitemap@4.2.3/dist/esm/builders/sitemap-builder.js", read: READ },
      { label: "Next.js 16.2.9, resolve-route-data.js", url: NEXT_RESOLVE_ROUTE_DATA, read: READ },
      { label: "Astro docs, @astrojs/sitemap", url: "https://docs.astro.build/en/guides/integrations-guide/sitemap/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "crawl-delay",
    title: "robots.txt crawl-delay: Google ignores it, Bing obeys",
    h1: "robots.txt Crawl-delay and Google: why Googlebot ignores it, and how to slow it down instead",
    description:
      "Googlebot ignores Crawl-delay; Bingbot honours it and Yandex dropped it. How Google sets its crawl rate, and the 503 or 429 that slows it in an emergency.",
    answer:
      "Googlebot ignores `Crawl-delay`. Google's robots.txt documentation supports only user-agent, allow, disallow and sitemap, and names crawl-delay as unsupported. Bingbot honours it, as one fetch per window of 1 to 30 seconds; Yandex has ignored it since 2018. To slow Googlebot in an emergency, answer 503 or 429 for a day or two at most.",
    sections: [
      {
        heading: "Does Googlebot respect Crawl-delay?",
        blocks: [
          {
            kind: "p",
            text: "No. Google's robots.txt specification lists the four fields Google supports, `user-agent`, `allow`, `disallow` and `sitemap`, and says that other fields such as `crawl-delay` aren't supported. The line has no effect on Googlebot; the other rules of its group still apply.",
          },
          {
            kind: "p",
            text: "Google sets the pace on its own. Its crawl budget documentation describes a crawl capacity limit that starts at the same conservative default for every site. The limit rises while the server answers quickly and steadily, and drops when responses slow down or when the server returns 5xx errors or 429 rate-limiting answers.",
          },
        ],
      },
      {
        heading: "What happened to the crawl rate setting in Search Console?",
        blocks: [
          {
            kind: "p",
            text: "Search Console used to have a crawl rate limiter. Google announced on November 24, 2023 that it would be removed on January 8, 2024, saying new limits took more than a day to apply and that Googlebot now reacts by itself: it slows down almost immediately when a server keeps returning HTTP 500 for a range of URLs, or when response times grow significantly. Google also lowered its minimum crawl rate to a level comparable to the old limits, so settings made with the tool effectively still apply when search interest in a site is low.",
          },
        ],
      },
      {
        heading: "What to do when Googlebot overloads your server",
        blocks: [
          {
            kind: "p",
            text: "Google documents one emergency brake: answer crawl requests with 500, 503 or 429 instead of 200. Its crawlers then slow down for the whole hostname, normal URLs included, and speed up again by themselves once the errors stop. With 503 or 429 you can add a `Retry-After` header, in seconds or as a date.",
          },
          {
            kind: "code",
            label: "response to Googlebot during the incident",
            code: "HTTP/1.1 503 Service Unavailable\nRetry-After: 3600\nContent-Type: text/plain\n\nTemporarily overloaded.",
          },
          {
            kind: "p",
            text: "Keep it short. Google advises against doing this for longer than one or two days: a URL that answers errors for several days running can be dropped from the index, fewer new pages get discovered, and Google Ads campaigns may be paused. For a lasting reduction, Google points to a form in Search Console where you report the unusually high crawl rate and state the rate you want. It can't be used to ask for more crawling, and the review can take several days.",
          },
          {
            kind: "p",
            text: "Send the errors from page routes, never from robots.txt. When robots.txt itself answers 5xx, Google stops crawling the whole site for the first 12 hours and then works from its last good copy for up to 30 days, the case described in [robots.txt answering a server error](/docs/issues/indexing-robots-unavailable). How those failures surface in Search Console is covered in [server error (5xx)](/search-console/server-error-5xx).",
          },
        ],
      },
      {
        heading: "How Bingbot reads Crawl-delay",
        blocks: [
          {
            kind: "p",
            text: "Bing explained it on its webmaster blog in May 2012: the value is the size of a time window, from 1 to 30 seconds, in which Bingbot fetches at most one page. At 5, a day holds 17,280 windows, so 17,280 pages at most. A Crawl-delay in robots.txt overrides the crawl control set in Bing Webmaster Tools, and each subdomain's own robots.txt carries its own delay.",
          },
          {
            kind: "p",
            text: "Bingbot follows a single group: `bingbot` if it exists, else `msnbot`, else `*`. A `bingbot` group added just for the delay therefore drops every `*` rule for Bing, so repeat the Disallow lines in it.",
          },
          {
            kind: "code",
            label: "robots.txt",
            code: "User-agent: *\nDisallow: /search\nDisallow: /cart\n\nUser-agent: bingbot\nCrawl-delay: 5\nDisallow: /search\nDisallow: /cart",
          },
          {
            kind: "p",
            text: "In Next.js, each rule in `app/robots.ts` accepts `crawlDelay`, and next 16.2.9 prints it as a `Crawl-delay:` line inside that rule's group:",
          },
          {
            kind: "code",
            label: "app/robots.ts",
            code: 'import type { MetadataRoute } from "next";\n\nexport default function robots(): MetadataRoute.Robots {\n  return {\n    rules: [\n      { userAgent: "*", disallow: ["/search", "/cart"] },\n      { userAgent: "bingbot", crawlDelay: 5, disallow: ["/search", "/cart"] },\n    ],\n    sitemap: "https://www.example.com/sitemap.xml",\n  };\n}',
          },
          {
            kind: "p",
            text: "Yandex is the counter-example: its help says it hasn't taken Crawl-delay into account since February 22, 2018, and points to the crawl rate setting in Yandex Webmaster instead. For any other crawler, read its operator's documentation before relying on the line.",
          },
        ],
      },
      {
        heading: "Check which group your Crawl-delay sits in",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -s https://www.example.com/robots.txt | grep -n -i -B4 'crawl-delay'",
          },
          {
            kind: "p",
            text: "The lines printed above each match show the group it belongs to. A delay under `User-agent: *` does nothing for Google and slows every crawler that honours it, Bing included. Misspelled directive names are a different fault, listed under [robots.txt lines crawlers can't read](/docs/issues/indexing-robots-format).",
          },
        ],
      },
    ],
    rules: ["indexing-robots-format", "indexing-robots-unavailable"],
    sources: [
      { label: "Google Search Central, how Google interprets the robots.txt specification", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ },
      { label: "Google crawling docs, reduce the Google crawl rate", url: "https://developers.google.com/crawling/docs/crawlers-fetchers/reduce-crawl-rate", read: READ },
      { label: "Google crawling docs, crawl budget (crawl capacity limit)", url: "https://developers.google.com/crawling/docs/crawl-budget", read: READ },
      { label: "Google Search Central blog, the crawl rate limiter tool is going away (November 24, 2023)", url: "https://developers.google.com/search/blog/2023/11/sc-crawl-limiter-byebye", read: READ },
      { label: "Bing Webmaster blog, to crawl or not to crawl (May 3, 2012)", url: "https://blogs.bing.com/webmaster/May-2012/To-crawl-or-not-to-crawl,-that-is-BingBot-s-questi/", read: READ },
      { label: "Yandex Webmaster help, Crawl-delay", url: "https://yandex.com/support/webmaster/en/robot-workings/crawl-delay", read: READ },
      { label: "Next.js docs, robots.txt (crawlDelay)", url: "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots", read: READ },
      { label: "Next.js 16.2.9, resolve-route-data.js (Crawl-delay output)", url: NEXT_RESOLVE_ROUTE_DATA, read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "favicon-google-search",
    title: "Favicon not showing in Google search: what to check",
    h1: "Favicon not showing in Google search results: Google's requirements, and why an SVG alone doesn't qualify",
    description:
      "Google shows a favicon only if the home page links a square icon in a supported format that Googlebot can fetch. SVG isn't listed. The full checklist.",
    answer:
      "Google shows a favicon only when the home page declares it with `<link rel=\"icon\">` (or `apple-touch-icon`), the file is square and at least 8x8 px, its format is one Google lists, and Googlebot and Googlebot-Image can both fetch it. SVG isn't on that list. After a fix, Google says recrawling takes several days to several weeks.",
    sections: [
      {
        heading: "What Google requires for a favicon in search results",
        blocks: [
          {
            kind: "list",
            items: [
              "A `<link>` tag in the head of the home page, with `rel` set to `icon`, `shortcut icon`, `apple-touch-icon` or `apple-touch-icon-precomposed`. The `href` can be relative or absolute, and the file can live on a CDN.",
              "One favicon per hostname: `www.example.com` and `docs.example.com` can each have their own, while `example.com/docs` shares the root's. A home page in a subdirectory isn't supported.",
              "Googlebot can crawl the home page and follow its redirects, and Googlebot-Image can crawl the icon file. Neither may be blocked by robots.txt or anything else.",
              "A square image (1:1) of at least 8x8 px. Google recommends going larger than 48x48 px.",
              "A supported file format, and a URL that stays stable.",
              "An icon that represents the brand. Google replaces inappropriate icons with a default one, and doesn't guarantee to show any icon even when every rule is met.",
            ],
          },
        ],
      },
      {
        heading: "Does Google support SVG favicons?",
        blocks: [
          {
            kind: "p",
            text: "Not according to its guidelines. The page (last updated October 27, 2026, read November 2) says: \"Google Search supports the following favicon file formats: BMP, GIF, ICO, PNG, JPEG, PPM, and TIFF.\" SVG isn't named, and neither is WebP. A site whose only icon is an SVG gives Google nothing it accepts.",
          },
          {
            kind: "p",
            text: "That was our own case on septune.dev. The site declared a single icon, `app/icon.svg`, `/favicon.ico` answered 404, and Google showed no favicon for the domain. On November 2, 2026 we added a `favicon.ico` holding 16, 32 and 48 px images, a 180x180 `apple-icon.png`, and 192 and 512 px PNGs for the web app manifest. The home page now declares:",
          },
          {
            kind: "code",
            label: "septune.dev, <head> on 2026-11-02",
            code: '<link rel="icon" href="/favicon.ico?favicon.0n8gjmg4xcv0y.ico" sizes="48x48" type="image/x-icon"/>\n<link rel="icon" href="/icon.svg?icon.0tqw7tgn6y4g_.svg" sizes="any" type="image/svg+xml"/>\n<link rel="apple-touch-icon" href="/apple-icon.png?apple-icon.0ynca3dw3r4_m.png" sizes="180x180" type="image/png"/>',
          },
          {
            kind: "p",
            text: "We kept the SVG for browsers. The ICO is in a format Google lists but stops at 48 px, short of the recommendation; the 180 px PNG is above it and uses a `rel` value Google supports. Google doesn't document which of several declared icons it picks.",
          },
        ],
      },
      {
        heading: "Setting it up in Next.js and in plain HTML",
        blocks: [
          {
            kind: "p",
            text: "The App Router's file conventions produce the tags. `favicon` accepts `.ico` only, and only at the root of `app/`; `icon` accepts `.ico`, `.jpg`, `.jpeg`, `.png` and `.svg`; `apple-icon` accepts `.jpg`, `.jpeg` and `.png`. `favicon` can't be generated with code, while `icon.tsx` can draw a PNG with `ImageResponse`.",
          },
          {
            kind: "code",
            label: "app/",
            code: "app/\n  favicon.ico      ICO with 16, 32 and 48 px inside: a format Google lists\n  apple-icon.png   180x180 PNG: above Google's 48 px recommendation\n  icon.svg         optional, for browsers",
          },
          {
            kind: "p",
            text: "Next.js appends a query string to these URLs. In the webpack loader of next 16.2.9 it's a hash of the file's content, so the URL changes only when the icon does, which fits Google's request for a stable URL. Other icon conventions are on [the Next.js page](/frameworks/nextjs). On any other stack, write the tags yourself on the home page:",
          },
          {
            kind: "code",
            label: "home page <head>",
            code: '<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
          },
          {
            kind: "p",
            text: "If the root URL redirects (to `/en/`, say), the tags have to be on the page it lands on, and Googlebot has to be able to follow the redirect.",
          },
        ],
      },
      {
        heading: "Can robots.txt block the favicon?",
        blocks: [
          {
            kind: "p",
            text: "Yes, in two places. A group that disallows `/` for Googlebot hides the home page and the tag on it, the case described in [robots.txt blocking Googlebot](/docs/issues/indexing-robots-blocks-google). A group that disallows the icon's path for Googlebot-Image hides the file. An image CDN that turns away unknown user agents, or a home page behind a login, has the same result.",
          },
          {
            kind: "code",
            label: "robots.txt that hides the icon",
            code: "User-agent: Googlebot-Image\nDisallow: /\n\nUser-agent: *\nAllow: /",
          },
          {
            kind: "p",
            text: "Delete that Disallow, or add `Allow: /favicon.ico` to the group: Google applies the longest matching rule, and the longer path wins over `/`. Search Console reports pages it can't fetch this way under [blocked by robots.txt](/search-console/blocked-by-robots-txt).",
          },
        ],
      },
      {
        heading: "How long until Google shows the new favicon?",
        blocks: [
          {
            kind: "p",
            text: "Google gives a range: crawling can take anywhere from several days to several weeks. To ask for it sooner, inspect the home page with Search Console's URL Inspection tool and request indexing. Before that, check what Googlebot will find:",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -s https://www.example.com/ | grep -io '<link[^>]*icon[^>]*>'\ncurl -sI https://www.example.com/favicon.ico | grep -i -E '^(HTTP|content-type)'\ncurl -s https://www.example.com/robots.txt | grep -i -A3 'googlebot'",
          },
          {
            kind: "p",
            text: "The first command should list at least one icon in a format from Google's list, the second a 200 with an image content type, and the third no rule that disallows the icon or the home page.",
          },
        ],
      },
    ],
    rules: ["indexing-robots-blocks-google"],
    sources: [
      { label: "Google Search Central, define a favicon to show in search results (updated 2026-10-27)", url: "https://developers.google.com/search/docs/appearance/favicon-in-search", read: READ },
      { label: "Google crawling docs, Google's common crawlers (Googlebot-Image)", url: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers", read: READ },
      { label: "Google Search Central, robots.txt specification (rule precedence)", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ },
      { label: "Next.js docs, favicon, icon and apple-icon", url: "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons", read: READ },
      { label: "Next.js 16.2.9, next-metadata-image-loader.js (content hash in icon URLs)", url: NEXT_IMAGE_LOADER, read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "og-image-not-updating",
    title: "og:image not updating? Refresh each platform's cache",
    h1: "og:image not updating after you changed it: the caches involved, and how to clear each one",
    description:
      "Facebook, LinkedIn and X cache link cards, and images by URL. Give the new image a new URL, then make each platform re-fetch the page. Sizes per platform.",
    answer:
      "Platforms cache the card when a link is first shared, and cache images by their URL. Give the new image a new URL (`og.png?v=2`), keep it absolute and public, then make each platform fetch the page again: Facebook's Sharing Debugger, LinkedIn's Post Inspector, and on X a post of a URL it hasn't cached. Posts already published keep the old card.",
    sections: [
      {
        heading: "Why does the old image keep showing?",
        blocks: [
          {
            kind: "p",
            text: "Each platform keeps its own copy. Facebook says images are cached based on the URL and won't be updated unless the URL changes. X's card documentation said the same about images, and that card data stays cached for 7 days after a link is posted. The LinkedIn help pages we read give no duration. Replacing the file at the same address, even with your CDN purged, changes nothing for them.",
          },
          {
            kind: "p",
            text: "Shares that already exist are a second layer. Facebook states that updating the image for a URL doesn't update the preview of older shares.",
          },
        ],
      },
      {
        heading: "Give the new image a new URL",
        blocks: [
          {
            kind: "code",
            label: "<head>",
            code: '<meta property="og:image" content="https://www.example.com/og/launch.png?v=2">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">',
          },
          {
            kind: "p",
            text: "Facebook's image guide says it plainly: use a new URL for the new image, and don't delete the old one, since existing stories may still reference it. X's troubleshooting guide used the same trick, an extra parameter at the end of the image URL. A query string works as long as the server ignores it and still returns the image.",
          },
          {
            kind: "p",
            text: "Next.js does part of this for you. File-based Open Graph images get a hash in their URL (septune.dev's reads `/opengraph-image?f99261d482975ea6`). In the webpack loader of next 16.2.9 that hash comes from the file's source. For `opengraph-image.png`, the source is the picture, so a new picture means a new URL. For a generated `opengraph-image.tsx`, the source is the code: when only the data it draws changes, such as a post title from a CMS, the URL stays the same and platforms keep the old picture. Put a version in the URL yourself:",
          },
          {
            kind: "code",
            label: "app/blog/[slug]/page.tsx",
            code: 'import type { Metadata } from "next";\nimport { openGraphBase } from "../../shared-metadata";\nimport { getPost } from "@/lib/posts";\n\nexport async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {\n  const { slug } = await params;\n  const post = await getPost(slug);\n  return {\n    openGraph: {\n      ...openGraphBase, // a page\'s openGraph replaces the layout\'s whole object\n      // /og/[slug] is a route handler returning an ImageResponse.\n      images: [{ url: `/og/${slug}?v=${post.updatedAt.getTime()}`, width: 1200, height: 630 }],\n    },\n  };\n}',
          },
        ],
      },
      {
        heading: "How do you make each platform fetch the page again?",
        blocks: [
          {
            kind: "list",
            items: [
              "Facebook: paste the URL into the Sharing Debugger (`developers.facebook.com/tools/debug`). It shows the tags the crawler read and triggers a new scrape. Facebook also documents a forced scrape through the Graph API.",
              "LinkedIn: run the URL through Post Inspector (`linkedin.com/post-inspector`) before sharing it again.",
              "X: the Card Validator address (`cards-dev.twitter.com/validator`) redirects to X's sign-in page as of November 2, 2026, and the docs that described it are offline. X's last published guide refreshed a card by posting a URL X hadn't seen yet; its example ran the page URL, made unique with an added parameter, through a link shortener. Details in [Twitter card not showing](/guides/twitter-card-not-showing).",
            ],
          },
          {
            kind: "p",
            text: "Order matters on Facebook. Its crawler has to process an image once before it can render it, so the first person to share a new URL may get a card without the picture. Sending `og:image:width` and `og:image:height` lets it render right away, and running the URL through the Sharing Debugger before you post pre-caches it.",
          },
        ],
      },
      {
        heading: "What size and format does each platform document?",
        blocks: [
          {
            kind: "list",
            items: [
              "Facebook: at least 1200x630 for high-resolution screens, 600x315 for the large layout, 200x200 at the very least, close to 1.91:1, 8 MB at most. `og:image:type` lists JPEG, GIF and PNG.",
              "LinkedIn: at least 1200x627, a 1.91:1 ratio, 5 MB at most. Images under 401 px wide show as a thumbnail.",
              "X, summary_large_image card: a 2:1 ratio, from 300x157 up to 4096x4096, under 5 MB, in JPG, PNG, WEBP or GIF (first frame only). No SVG.",
            ],
          },
          {
            kind: "p",
            text: "A 1200x630 PNG or JPEG under 5 MB meets Facebook's and LinkedIn's numbers and sits inside X's size range, although X describes its frame as 2:1.",
          },
        ],
      },
      {
        heading: "The image URL has to work from their servers",
        blocks: [
          {
            kind: "p",
            text: "Share crawlers fetch the image from outside your network, without your cookies. Every example on ogp.me is a full URL, and the protocol's URL type only covers `http://` and `https://`. A relative path, a localhost address from a Next.js build without `metadataBase` (see [the metadataBase warning](/frameworks/nextjs/metadatabase-not-set)), a preview deployment behind a login, or an image route that errors all leave the card empty. [The Next.js og:image checklist](/frameworks/nextjs/og-image-not-working) goes through each of those.",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -s -A 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' https://www.example.com/blog/launch | grep -io '<meta[^>]*og:image[^>]*>'\ncurl -sI 'https://www.example.com/og/launch?v=2' | grep -i -E '^(HTTP|content-type|content-length)'",
          },
          {
            kind: "p",
            text: "Facebook only reads Open Graph tags within the first 1 MB of the page, so keep them early in `<head>`.",
          },
        ],
      },
    ],
    rules: ["meta-og-image-url", "meta-og-image-missing"],
    sources: [
      { label: "Meta for Developers, webmaster sharing guide", url: "https://developers.facebook.com/docs/sharing/webmasters/", read: READ },
      { label: "Meta for Developers, images in link shares", url: "https://developers.facebook.com/docs/sharing/webmasters/images/", read: READ },
      { label: "Meta for Developers, web crawlers (1 MB limit, forced crawl)", url: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers", read: READ },
      { label: "LinkedIn Help, making your website shareable (image requirements)", url: "https://www.linkedin.com/help/linkedin/answer/a521928", read: READ },
      { label: "LinkedIn Post Inspector", url: "https://www.linkedin.com/post-inspector/", read: READ },
      { label: "X developer docs, Getting started with Cards (archived 2025-12-15)", url: X_GETTING_STARTED, read: READ },
      { label: "X developer docs, Troubleshooting Cards (archived 2025-12-31)", url: X_TROUBLESHOOTING, read: READ },
      { label: "X developer docs, Summary Card with Large Image (archived 2026-02-04)", url: X_LARGE_IMAGE, read: READ },
      { label: "The Open Graph protocol", url: "https://ogp.me/", read: READ },
      { label: "Next.js 16.2.9, next-metadata-image-loader.js (hash in image URLs)", url: NEXT_IMAGE_LOADER, read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "twitter-card-not-showing",
    title: "Twitter card not showing on X: tags, robots, cache",
    h1: "Twitter card not showing on X: the tags it needs, the crawler it sends and the cache it keeps",
    description:
      "Why X shows a bare link instead of a card: no twitter:card tag, Twitterbot blocked in robots.txt, an image X can't use, or a cached card. Fixes and tests.",
    answer:
      "X picks the card type from `twitter:card`. Without it, X may show a small summary card built from og:type, og:title and og:description rather than the large-image one. Set `twitter:card` to `summary_large_image`; title, description and image can come from Open Graph. Then check that robots.txt lets Twitterbot in, that the image is under 5 MB and not SVG, and test with a fresh post.",
    sections: [
      {
        heading: "Which tags does X read, and which fall back to Open Graph?",
        blocks: [
          {
            kind: "p",
            text: "A note on sources first: X's card documentation is no longer online at its old addresses, which redirect to the developer portal's home page as of November 2, 2026. The facts below come from archived copies of those pages, captured between December 2025 and February 2026.",
          },
          {
            kind: "list",
            items: [
              "`twitter:card` sets the type: `summary`, `summary_large_image`, `app` or `player`. If it's missing but og:type, og:title and og:description are present, X may render a summary card. With two `twitter:card` tags on a page, the last one wins.",
              "`twitter:title` falls back to `og:title`, `twitter:description` to `og:description`, `twitter:image` to `og:image`, and `twitter:image:alt` to `og:image:alt`.",
              "`twitter:site` and `twitter:creator` have no Open Graph equivalent.",
              "X's tags use `name`, Open Graph's use `property`. X's parser also reads `property`, so existing Open Graph tags need no rewrite.",
            ],
          },
          {
            kind: "code",
            label: "the smallest head that asks for a large card",
            code: '<meta name="twitter:card" content="summary_large_image">\n<meta property="og:title" content="Launch notes for version 3">\n<meta property="og:description" content="What changed in the importer, and how to upgrade.">\n<meta property="og:image" content="https://www.example.com/og/launch-v3.png">\n<meta property="og:image:alt" content="The importer settings screen in version 3">',
          },
        ],
      },
      {
        heading: "In Next.js the card tag is written for you",
        blocks: [
          {
            kind: "p",
            text: "When the metadata sets `openGraph` and leaves `twitter` alone, next 16.2.9 copies the title, description and images into Twitter tags and chooses the card itself: `summary_large_image` when there is an image, `summary` when there isn't. On a Next.js site, look at the image URL first: a build without `metadataBase` writes it on localhost, where X can't fetch it, as explained in [the metadataBase warning](/frameworks/nextjs/metadatabase-not-set).",
          },
          {
            kind: "p",
            text: "The exception is a page that defines its own `twitter` object with `card: \"summary\"`: next 16.2.9 keeps that value, so the page gets the small card even with an image.",
          },
        ],
      },
      {
        heading: "Is robots.txt blocking Twitterbot?",
        blocks: [
          {
            kind: "p",
            text: "X fetches cards with the user agent `Twitterbot` (for example `Twitterbot/1.0`), which follows Google's robots.txt specification. A blocked page gets no card, and a blocked image URL gets a card without a picture. One easy way to get there is a staging rule shipped to production: `User-agent: *` with `Disallow: /` shuts out Twitterbot along with everyone else. The opposite accident, staging pages reaching Google, is covered in [staging site indexed](/guides/staging-site-indexed).",
          },
          {
            kind: "code",
            label: "robots.txt: X's own example, every crawler out except Twitterbot",
            code: "User-agent: Twitterbot\nDisallow:\n\nUser-agent: *\nDisallow: /",
          },
          {
            kind: "p",
            text: "X's troubleshooting guide lists other blocks: an Apache `.htaccess` deny rule, a host or firewall filtering X's IP ranges, a TLS setup older than version 1.1, and an HTML response over 2 MB, the most its crawler reads.",
          },
        ],
      },
      {
        heading: "Does the image meet X's limits?",
        blocks: [
          {
            kind: "list",
            items: [
              "Under 5 MB.",
              "JPG, PNG, WEBP or GIF, with only the first frame of a GIF used. SVG is not supported.",
              "For `summary_large_image`: a 2:1 ratio, between 300x157 and 4096x4096 px.",
              "Reachable from the public internet. An image on an internal or staging network fails with \"Failed to get a proxied URL for the image\" in X's guide.",
              "`twitter:image:alt` up to 420 characters.",
            ],
          },
          {
            kind: "p",
            text: "The value also has to be a full URL. A relative or localhost value is what [og:image with a relative or localhost URL](/docs/issues/meta-og-image-url) reports, and X falls back to that same `og:image` when `twitter:image` is absent.",
          },
        ],
      },
      {
        heading: "How do you test a card now?",
        blocks: [
          {
            kind: "p",
            text: "On November 2, 2026, the Card Validator address (`cards-dev.twitter.com/validator`) redirects to X's sign-in page, and the pages that described it no longer load, so we couldn't check what it shows today. What X did document is the cache: card data is kept for 7 days after a link is posted, and images are cached by their URL. Testing means posting.",
          },
          {
            kind: "list",
            items: [
              "Post the link from a test account. If the card is stale, post the same page with a parameter X hasn't seen, such as `?v=3`. X's guide made its test URLs unique the same way, so the crawler fetched them fresh.",
              "If the text updates but the picture doesn't, version the image URL too (`launch-v3.png?v=3`).",
              "Attach no image or video to the test post: attached media take precedence over the card, and a post shows one card at most, from the first URL in it that has one.",
            ],
          },
          {
            kind: "p",
            text: "Facebook and LinkedIn cache cards the same way and have their own refresh tools, covered in [og:image not updating](/guides/og-image-not-updating).",
          },
        ],
      },
    ],
    rules: ["meta-og-image-missing", "meta-og-image-url"],
    sources: [
      { label: "X developer docs, Cards markup tag reference (archived 2026-02-01)", url: X_MARKUP, read: READ },
      { label: "X developer docs, Getting started with Cards (archived 2025-12-15)", url: X_GETTING_STARTED, read: READ },
      { label: "X developer docs, Troubleshooting Cards (archived 2025-12-31)", url: X_TROUBLESHOOTING, read: READ },
      { label: "X developer docs, Summary Card with Large Image (archived 2026-02-04)", url: X_LARGE_IMAGE, read: READ },
      { label: "Next.js 16.2.9, resolve-opengraph.js (default twitter card)", url: "https://app.unpkg.com/next@16.2.9/files/dist/lib/metadata/resolvers/resolve-opengraph.js", read: READ },
      { label: "Next.js 16.2.9, resolve-metadata.js (Twitter tags filled from openGraph)", url: "https://app.unpkg.com/next@16.2.9/files/dist/lib/metadata/resolve-metadata.js", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

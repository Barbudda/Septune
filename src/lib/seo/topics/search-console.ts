import type { TopicPage } from "./types";

/**
 * Sept pages, une par statut du rapport « Indexation des pages » de Search
 * Console. Angle commun : les réponses existantes visent WordPress ; ici chaque
 * statut est ramené au réglage de framework, d'hébergeur ou de pare-feu qui le
 * produit, avec la vérification (curl, test en direct) et le moment de cliquer
 * sur « Valider la correction ». Tout fait vient d'une page lue le 2026-11-02
 * ou du code source cité avec sa version (next 16.2.9 dans node_modules,
 * nuxt 4.6.3 et h3 1.15.11 sur unpkg).
 *
 * Laissé de côté faute de source officielle : la date à laquelle le rapport
 * robots.txt a remplacé l'ancien testeur (les pages d'aide Google n'en donnent
 * pas), le code HTTP des « Pretty URLs » de Netlify, l'en-tête X-Robots-Tag des
 * previews Netlify, et le statut HTTP des pages de challenge Cloudflare/Vercel.
 */

const READ = "2026-11-02";

/** Code blocks are written line by line, so quotes don't need escaping twice. */
const lines = (...l: string[]) => l.join("\n");

const GSC_INDEXING = { label: "Google Search Console Help, Page indexing report", url: "https://support.google.com/webmasters/answer/7440203", read: READ };
const GSC_INSPECTION = { label: "Google Search Console Help, URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289", read: READ };
const G_STATUS_CODES = { label: "Google crawling docs, HTTP status codes, network and DNS errors", url: "https://developers.google.com/crawling/docs/troubleshooting/http-status-codes", read: READ };
const G_CANONICAL = { label: "Google Search Central, how to specify a canonical URL", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls", read: READ };
const G_ROBOTS_SPEC = { label: "Google crawling docs, how Google interprets the robots.txt specification", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ };
const G_FACETED = { label: "Google crawling docs, managing crawling of faceted navigation URLs", url: "https://developers.google.com/crawling/docs/faceted-navigation", read: READ };
const VERCEL_JSON = { label: "Vercel docs, vercel.json: trailingSlash and redirects", url: "https://vercel.com/docs/project-configuration/vercel-json#trailingslash", read: READ };

export const SEARCH_CONSOLE: TopicPage[] = [
  {
    hub: "search-console",
    slug: "duplicate-without-canonical",
    title: "Duplicate without user-selected canonical: the fix",
    h1: "Duplicate without user-selected canonical: find the URL variant your host serves and close it",
    description:
      "Why Search Console reports Duplicate without user-selected canonical, the URL variants Vercel, Netlify and Cloudflare serve, and how to close each.",
    answer:
      "Google found this URL serving the same content as another one, saw no canonical on it, and chose the other URL for search. On a Next.js, Nuxt or Astro site, look for a host variant: a trailing slash, http, the www or apex spelling, a query string, or a default domain like *.vercel.app. Redirect the variant to the URL you want, then give each page a self-referencing canonical.",
    sections: [
      {
        heading: "What the status says, in Google's words",
        blocks: [
          {
            kind: "p",
            text: "Google's Page indexing help describes the flagged URL as a duplicate of another page that doesn't name a preferred canonical. Google picked the other page as canonical and won't serve this one in Search. The help is clear that this isn't an error: Google doesn't show duplicates, so dropping one is the system working as intended.",
          },
          {
            kind: "p",
            text: "It becomes your problem in two cases. Google kept the wrong copy, such as the `*.vercel.app` address, the `http://` version or a URL carrying `?utm_source=`. Or the two pages aren't duplicates at all and the one you care about left the results, in which case Google's advice is to make their content substantially different.",
          },
        ],
      },
      {
        heading: "Which URL did Google keep?",
        blocks: [
          {
            kind: "p",
            text: "Open one flagged URL in URL Inspection and read two fields. `User-declared canonical` is the canonical the page declares, None for this reason. `Google-selected canonical` is the URL Google kept when it indexed the page. The live test can't show that second field, since it's decided at indexing time, so read it from the indexed result.",
          },
          {
            kind: "list",
            items: [
              "`https://example.com/pricing/` flagged, `https://example.com/pricing` selected: the site answers on both slash forms.",
              "`http://example.com/pricing` flagged: the plain-http address serves the page instead of redirecting.",
              "`https://example.com/pricing` flagged, `https://www.example.com/pricing` selected: both hostnames answer 200.",
              "`https://my-app.vercel.app/pricing` flagged, or worse, selected: the host's default domain is public next to yours.",
              "`https://example.com/pricing?ref=nav` flagged: a parameter variant spread by internal links or campaigns.",
            ],
          },
        ],
      },
      {
        heading: "The variants each host serves unless told otherwise",
        blocks: [
          {
            kind: "list",
            items: [
              "Vercel: `trailingSlash` in `vercel.json` defaults to undefined, and Vercel's docs say `/about` and `/about/` then serve the same content without a redirect, a setup they warn can get both indexed. Next.js on its own redirects `/about/` to `/about` by default.",
              "Vercel's default domain: preview deployments carry `X-Robots-Tag: noindex`, but Vercel's guide on duplicate content treats the production `.vercel.app` URL as a second public address and recommends a host-scoped permanent redirect.",
              "Netlify: its domain docs state that the `*.netlify.app` URLs always keep working after you add a custom domain.",
              "Cloudflare Pages: `<project>.pages.dev` stays live as well, and Cloudflare documents a Bulk Redirect with status 301 to send it to the custom domain.",
              "Astro: `trailingSlash` defaults to `'ignore'`, which matches both forms, and the docs warn that slashes on prerendered pages are handled by the host, which may not respect the setting.",
            ],
          },
          {
            kind: "p",
            text: "Hostnames are the other half. Vercel recommends `www` as the primary domain with a redirect from the apex. On a Next.js 16 site of ours hosted there, curl on 2026-11-02 showed the apex, the `http://` address and the slash form each answering a single 308 to the final URL, which is the state to aim for. The slash question per host is covered in [trailing slashes](/guides/trailing-slash), and the www case in [both hostnames serving the site](/docs/issues/indexing-host-duplicate).",
          },
        ],
      },
      {
        heading: "How do I tell Google which URL to keep?",
        blocks: [
          {
            kind: "p",
            text: "Google lists its canonical signals by strength: redirects first, then `rel=\"canonical\"`, then the sitemap, and they add up when combined. Redirect every variant that has no reason to exist. Keep the canonical tag for the variants that must stay reachable, such as parameter URLs.",
          },
          {
            kind: "code",
            label: "vercel.json (Vercel's example)",
            code: lines(
              '{',
              '  "$schema": "https://openapi.vercel.sh/vercel.json",',
              '  "redirects": [',
              '    {',
              '      "source": "/:path*",',
              '      "has": [{ "type": "host", "value": "your-project\\\\.vercel\\\\.app" }],',
              '      "destination": "https://www.example.com/:path*",',
              '      "permanent": true',
              '    }',
              '  ]',
              '}',
            ),
          },
          {
            kind: "p",
            text: "Matching the exact hostname keeps preview URLs out of the rule and stops the destination from redirecting to itself. Netlify's redirect docs show domain-level rules written for domain aliases, such as `https://blog.yoursite.com/* https://www.yoursite.com/blog/:splat 301!`. The same line written for your `.netlify.app` host should do the job, but the docs don't show that exact case, so confirm it with curl after the deploy.",
          },
          {
            kind: "p",
            text: "Then give every page a self-referencing canonical with an absolute URL built from its route. In Next.js that means `metadataBase` plus `alternates.canonical` in the root layout, with the one trap explained in [canonical URLs in Next.js](/frameworks/nextjs/canonical-url). Don't use `noindex` or robots.txt to pick the winner: Google's canonical docs advise against both.",
          },
        ],
      },
      {
        heading: "Next.js: a canonical that can arrive in the body",
        blocks: [
          {
            kind: "p",
            text: "Since Next.js 15.2, metadata from a slow `generateMetadata` can be streamed on routes rendered at request time: the page shell goes out first and the tags are appended to `<body>` when they resolve. Bots on Next.js's HTML-limited list get blocking metadata in `<head>` instead. In the source of next 16.2.9 that list matches `Google-InspectionTool` but not `Googlebot`, so the live test can show a canonical in the head that Googlebot receives later in the body.",
          },
          {
            kind: "p",
            text: "Google's canonical docs say the link element is only accepted in `<head>`. Next.js says it verified that Googlebot reads streamed metadata. The two statements don't settle it, so look at the evidence: if the indexed result reports `User-declared canonical` as None on a dynamic route that does print one, set `htmlLimitedBots: /.*/` in `next.config.ts`, the documented switch that turns streaming metadata off.",
          },
        ],
      },
      {
        heading: "Check the fix, then give Google time",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "# each variant: one 301 or 308 to the final URL",
              "curl -sI 'https://my-app.vercel.app/about?ref=test' | grep -iE '^(HTTP|location)'",
              "curl -sI http://example.com/about | grep -iE '^(HTTP|location)'",
              "curl -sI https://www.example.com/about/ | grep -iE '^(HTTP|location)'",
              "",
              "# the final page names itself",
              "curl -s https://www.example.com/about | grep -io '<link[^>]*rel=\"canonical\"[^>]*>'",
            ),
          },
          {
            kind: "p",
            text: "Google's troubleshooting page warns that pages can stay grouped in a duplicate cluster for up to two weeks after a fix, and suggests Request indexing in URL Inspection for the most important URLs, which is subject to a quota. Since Google files this reason under working as intended, the number to watch is how many flagged URLs still have the wrong Google-selected canonical, not the total.",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-missing", "indexing-host-duplicate", "indexing-http-not-redirected", "indexing-duplicate-content"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (Duplicate without user-selected canonical)" },
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (user-declared and Google-selected canonical)" },
      G_CANONICAL,
      { label: "Google Search Central, fix canonicalization issues", url: "https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting", read: READ },
      { label: "Vercel KB, avoiding duplicate content with vercel.app URLs (updated 2026-09-18)", url: "https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls", read: READ },
      { label: "Vercel KB, are preview deployments indexed by search engines (updated 2026-10-02)", url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines", read: READ },
      VERCEL_JSON,
      { label: "Vercel docs, deploying and redirecting domains", url: "https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting", read: READ },
      { label: "Netlify docs, understand domains", url: "https://docs.netlify.com/manage/domains/domains-fundamentals/understand-domains/", read: READ },
      { label: "Netlify docs, redirect options (domain-level redirects)", url: "https://docs.netlify.com/manage/routing/redirects/redirect-options/", read: READ },
      { label: "Cloudflare Pages docs, redirect *.pages.dev to a custom domain", url: "https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/", read: READ },
      { label: "Astro docs, configuration reference: trailingSlash", url: "https://docs.astro.build/en/reference/configuration-reference/", read: READ },
      { label: "Next.js docs, trailingSlash", url: "https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash", read: READ },
      { label: "Next.js docs, generateMetadata: streaming metadata", url: "https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata", read: READ },
      { label: "Next.js 16.2.9, html-bots.js (the HTML-limited bot list)", url: "https://app.unpkg.com/next@16.2.9/files/dist/shared/lib/router/utils/html-bots.js", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "search-console",
    slug: "403-forbidden",
    title: "Blocked due to access forbidden (403): find the block",
    h1: "Blocked due to access forbidden (403): the firewall or bot rule that refuses Googlebot",
    description:
      "Search Console's 403 status traced to Cloudflare, Vercel or S3 settings, how to prove a request was really Googlebot, and how to retest before validating.",
    answer:
      "Googlebot never sends credentials, so a 403 means a layer in front of your pages refused it: a firewall rule, bot protection, a country block, or a storage bucket that answers 403 for missing files. Find the matching event in the firewall log for an IP inside Google's crawler ranges, exempt verified Googlebot, then rerun the URL Inspection live test.",
    sections: [
      {
        heading: "What Google says a 403 means here",
        blocks: [
          {
            kind: "p",
            text: "In HTTP terms a 403 means the client sent credentials and wasn't granted access. Google's help points out that Googlebot never sends credentials, so the server is returning the error incorrectly, and the page won't be indexed. Its fix is to let signed-out visitors reach the page, or to let verified Googlebot requests through without authentication.",
          },
          {
            kind: "p",
            text: "Don't keep a 403 as a way to slow Google down. Google's HTTP status docs say every 4xx except 429 is handled the same way: indexed URLs are removed, and 401 and 403 have no effect on crawl rate. The pages leave the index and the load stays where it was.",
          },
        ],
      },
      {
        heading: "Which Cloudflare settings send the 403?",
        blocks: [
          {
            kind: "list",
            items: [
              "A WAF custom rule with the Block action answers 403 by default (429 for rate limiting rules), and the request never reaches your origin. Rules on country or network catch Googlebot easily: Google says its default crawler IPs appear to be in the USA, with some crawling from other countries.",
              "Bot Fight Mode, which Cloudflare presents as the way to challenge bot traffic on Free plans, sends computationally expensive challenges, and Cloudflare states it can't be skipped with WAF custom rules or Page Rules.",
              "Super Bot Fight Mode (Pro and up) sorts traffic into Definitely automated, Likely automated and Verified bots. Custom rules run before it, so a custom rule with the Skip action can exempt traffic from it.",
              "Cloudflare's verified bots page says verified bots are excluded in the default bot configurations on every plan. A rule you wrote yourself has no such exception until you add one.",
            ],
          },
          {
            kind: "p",
            text: "To exempt good crawlers from your own rules, add `and not cf.client.bot` to the rule's expression. Cloudflare describes the field as true when the request comes from a known good bot or crawler, the same information as `cf.bot_management.verified_bot`. The Security Events view (Analytics, then Events) lists each blocked request with its rule, user agent, IP and ASN, sampled on some plans.",
          },
        ],
      },
      {
        heading: "Vercel: Deny rules and the bot ruleset",
        blocks: [
          {
            kind: "list",
            items: [
              "A WAF custom rule with the Deny action returns `403 Forbidden`, and the request doesn't reach the application.",
              "The bot protection managed ruleset is off by default. When on, it challenges non-browser traffic and, per Vercel, automatically excludes verified bots such as Google's crawler. Vercel also warns that it doesn't work when a reverse proxy such as Cloudflare sits in front of the deployment.",
              "Attack Mode lets known bots through, search engine crawlers included, according to its docs.",
              "Custom rules are the exception: Vercel's bot management docs explain that a rule matching on User Agent can block verified bots too. A rule that denies anything containing `bot` takes Googlebot with it.",
            ],
          },
          {
            kind: "p",
            text: "Vercel shows each rule's actions in the Firewall and Observability sections of the dashboard. With an external proxy in front of the deployment, the 403 can come from either layer, so read both logs. Host-level settings that touch crawling are gathered in [Vercel and SEO](/hosting/vercel).",
          },
        ],
      },
      {
        heading: "A 403 that is really a missing page",
        blocks: [
          {
            kind: "p",
            text: "Not every 403 is a block. Amazon S3 answers a request for a key that doesn't exist with `403 Access Denied` when the caller lacks the `s3:ListBucket` permission, and with `404 Not Found` only when it has it. A static site served from a bucket therefore reports deleted pages as 403. If the flagged URLs are pages you removed, make missing keys return 404 and drop them from the sitemap, as described for [pages returning an error status](/docs/issues/indexing-broken-page).",
          },
        ],
      },
      {
        heading: "Was that request really Googlebot?",
        blocks: [
          {
            kind: "p",
            text: "User agents can be faked, so a log line that says Googlebot proves nothing. Google documents two checks. The manual one is a reverse DNS lookup that must end in `googlebot.com`, `google.com` or `googleusercontent.com`, followed by a forward lookup that returns the same IP:",
          },
          {
            kind: "code",
            label: "terminal (Google's example)",
            code: lines(
              "host 66.249.66.1",
              "1.66.249.66.in-addr.arpa domain name pointer crawl-66-249-66-1.googlebot.com.",
              "",
              "host crawl-66-249-66-1.googlebot.com",
              "crawl-66-249-66-1.googlebot.com has address 66.249.66.1",
            ),
          },
          {
            kind: "p",
            text: "The automatic one compares the IP with the JSON files Google publishes: `common-crawlers.json` for Googlebot, plus separate files for special-case crawlers and user-triggered fetchers. The older `googlebot.json` URL now answers 301 to `common-crawlers.json` (checked on 2026-11-02), so update scripts that fetch the old path. This one runs on Node 24 with no dependency:",
          },
          {
            kind: "code",
            label: "check-crawler-ip.mjs",
            code: lines(
              'import { BlockList } from "node:net";',
              "",
              'const url = "https://developers.google.com/static/crawling/ipranges/common-crawlers.json";',
              "const { prefixes } = await (await fetch(url)).json();",
              "const ranges = new BlockList();",
              "for (const p of prefixes) {",
              '  const [net, bits] = (p.ipv4Prefix ?? p.ipv6Prefix).split("/");',
              '  ranges.addSubnet(net, Number(bits), p.ipv4Prefix ? "ipv4" : "ipv6");',
              "}",
              "const ip = process.argv[2];",
              'const inside = ranges.check(ip, ip.includes(":") ? "ipv6" : "ipv4");',
              'console.log(`${ip} ${inside ? "is" : "is not"} in Google\'s common crawler ranges`);',
            ),
          },
          {
            kind: "p",
            text: "Run it as `node check-crawler-ip.mjs 66.249.66.1` with an IP taken from the firewall event.",
          },
        ],
      },
      {
        heading: "Retest, then validate",
        blocks: [
          {
            kind: "p",
            text: "The URL Inspection live test fetches as `Google-InspectionTool`, a user agent token separate from `Googlebot` and listed among Google's common crawlers. A firewall rule keyed on the string `Googlebot` treats the two differently, so a passing live test proves the page opens for the inspection tool. Confirm in the firewall log that Googlebot's own requests now get through.",
          },
          {
            kind: "p",
            text: "Then press Validate fix in the report. Search Console checks a few sample URLs straight away and ends the run if any still answers 403; otherwise the state moves to Started. Google says a run typically takes up to about two weeks, and asks you not to press the button again until it reports Passed or Failed. On a site behind Cloudflare, the [Cloudflare Pages guide](/hosting/cloudflare-pages) lists the other settings that reach crawlers.",
          },
        ],
      },
    ],
    rules: ["indexing-broken-page", "indexing-sitemap-hygiene"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (Blocked due to access forbidden)" },
      { label: "Google crawling docs, verifying Google's crawlers and fetchers", url: "https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests", read: READ },
      { label: "Google crawling docs, common crawlers (Googlebot, Google-InspectionTool)", url: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers", read: READ },
      G_STATUS_CODES,
      { label: "Google Search Central, locale-adaptive pages (where Googlebot crawls from)", url: "https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages", read: READ },
      { label: "Cloudflare docs, rule actions (Block, Skip)", url: "https://developers.cloudflare.com/ruleset-engine/rules-language/actions/", read: READ },
      { label: "Cloudflare docs, Bot Fight Mode", url: "https://developers.cloudflare.com/bots/get-started/bot-fight-mode/", read: READ },
      { label: "Cloudflare docs, Super Bot Fight Mode", url: "https://developers.cloudflare.com/bots/get-started/super-bot-fight-mode/", read: READ },
      { label: "Cloudflare docs, verified bots", url: "https://developers.cloudflare.com/bots/concepts/bot/verified-bots/", read: READ },
      { label: "Cloudflare docs, the cf.client.bot field", url: "https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/cf.client.bot/", read: READ },
      { label: "Cloudflare docs, Security Events", url: "https://developers.cloudflare.com/waf/analytics/security-events/", read: READ },
      { label: "Vercel docs, firewall concepts (Deny returns 403)", url: "https://vercel.com/docs/vercel-firewall/firewall-concepts", read: READ },
      { label: "Vercel docs, bot management (updated 2026-09-10)", url: "https://vercel.com/docs/bot-management", read: READ },
      { label: "Vercel docs, Attack Mode", url: "https://vercel.com/docs/vercel-firewall/attack-mode", read: READ },
      { label: "AWS docs, Amazon S3 GetObject (403 for missing keys)", url: "https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html", read: READ },
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (live test, validation)" },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "search-console",
    slug: "blocked-by-robots-txt",
    title: "Googlebot blocked by robots.txt: find the rule, fix it",
    h1: "URL blocked by robots.txt: the Disallow rule behind it, and when to leave it alone",
    description:
      "URL blocked by robots.txt: how it differs from Indexed, though blocked, the staging robots.txt that ships to production, and how to retest it.",
    answer:
      "Googlebot read your robots.txt, found a Disallow rule matching the URL, and didn't fetch the page. If you meant to block it, leave it: nothing needs fixing. If not, find the matching rule (the longest one wins), remove or narrow it in the file your framework generates, check the live file with curl, then request a recrawl in the robots.txt report.",
    sections: [
      {
        heading: "Blocked, or indexed though blocked?",
        blocks: [
          {
            kind: "p",
            text: "The two reasons look alike and ask for opposite fixes. URL blocked by robots.txt sits under Not indexed: a rule in your robots.txt stopped Googlebot from fetching the page. Google warns that this doesn't guarantee the page stays out of the index, since it can learn about the URL from links without loading it.",
          },
          {
            kind: "p",
            text: "Indexed, though blocked by robots.txt is a warning on a page that made it into the index anyway, because other pages link to it. Google never read it, so any snippet is thin. If you want such a page out of Search, robots.txt is the wrong tool: remove the block and serve `noindex`, which Google only sees on a page it may crawl. The [noindex checker](/tools/noindex-checker) shows what a page sends.",
          },
        ],
      },
      {
        heading: "Which line in robots.txt matched?",
        blocks: [
          {
            kind: "p",
            text: "Google picks one group per crawler: the one whose `User-agent` is the most specific match. A `Googlebot` group therefore replaces the `*` group entirely; the two are never combined. Inside that group, the rule with the longest matching path wins, and when an `allow` and a `disallow` are equally long, the less restrictive one applies.",
          },
          {
            kind: "code",
            label: "robots.txt",
            code: lines(
              "User-agent: *",
              "Disallow: /admin",
              "",
              "# From here on, Googlebot ignores the * group above",
              "User-agent: Googlebot",
              "Disallow: /shop",
              "Allow: /shop/catalog",
            ),
          },
          {
            kind: "p",
            text: "With this file Googlebot may crawl `/admin`, because its own group says nothing about it. `Disallow: /shop` matches by prefix, so it also blocks `/shop-guides` and `/shopping`, while `/shop/catalog/mugs` is allowed by the longer `Allow`. Paths are case-sensitive, so `/Shop` isn't covered. A file only governs its own protocol, host and port: `https://www.example.com/robots.txt` says nothing about `https://example.com`.",
          },
        ],
      },
      {
        heading: "The staging robots.txt that reached production",
        blocks: [
          {
            kind: "p",
            text: "A `Disallow: /` written for staging is the usual way a whole site lands in this report. Modern frameworks generate the file from configuration, so the mistake hides in an environment check rather than in a file you can read in the repository.",
          },
          {
            kind: "list",
            items: [
              "Next.js: `app/robots.ts` returns the rules, and the docs describe it as a special Route Handler that is cached by default unless it uses a request-time API. An environment check inside it therefore runs during `next build`, and an image built once with staging variables keeps the staging rules wherever it is deployed. More in the [Next.js guide](/frameworks/nextjs).",
              "Nuxt with `@nuxtjs/robots`: the module disables indexing whenever the site environment isn't production, writing `Disallow: /` plus a `noindex, nofollow` meta tag and header. For static sites its docs tell you to set `NUXT_SITE_ENV` in the CI build, so a staging build copied to the production host carries the block.",
              "Astro: the file is either `public/robots.txt`, copied as-is, or an endpoint such as `src/pages/robots.txt.ts` built from the `site` option, as in the sitemap integration docs. Check which of the two your build emits; the [Astro guide](/frameworks/astro) covers the rest.",
            ],
          },
          {
            kind: "code",
            label: "app/robots.ts",
            code: lines(
              'import type { MetadataRoute } from "next";',
              "",
              "// Cached by default: this check runs at build time, not per request.",
              "// Build production images with SITE_ENV=production.",
              "export default function robots(): MetadataRoute.Robots {",
              '  if (process.env.SITE_ENV !== "production") {',
              '    return { rules: { userAgent: "*", disallow: "/" } };',
              "  }",
              "  return {",
              '    rules: { userAgent: "*", allow: "/" },',
              '    sitemap: "https://www.example.com/sitemap.xml",',
              "  };",
              "}",
            ),
          },
          {
            kind: "p",
            text: "Authentication on the staging host keeps it out of search more reliably than a robots.txt that can travel between environments; [when a staging site gets indexed](/guides/staging-site-indexed) covers that side.",
          },
        ],
      },
      {
        heading: "When the block is deliberate",
        blocks: [
          {
            kind: "p",
            text: "Google recommends robots.txt for faceted navigation, with rules such as `disallow: /*?*color=`, and those URLs then land here by design. The Page indexing help says as much: URLs blocked by robots.txt are probably blocked on purpose, and not every reason calls for a fix.",
          },
          {
            kind: "p",
            text: "The test is whether you also asked Google to index the URL. Switch the report's filter from All known pages to All submitted pages. A URL that still appears is listed in your sitemap and disallowed at the same time, and one of the two is wrong.",
          },
        ],
      },
      {
        heading: "Check the live file and Google's copy",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "# What your server sends now, with line numbers",
              "curl -s https://www.example.com/robots.txt | cat -n",
              "",
              "# Status and type: expect 200 and text/plain",
              "curl -sI https://www.example.com/robots.txt | grep -iE '^(HTTP|content-type)'",
            ),
          },
          {
            kind: "p",
            text: "Google generally caches robots.txt for up to 24 hours, so a fix doesn't apply at once. The robots.txt report lists the files Google found for the top 20 hosts of the property, when it last fetched each one and any parsing errors, and its Request a recrawl option asks for a fresh fetch. Older answers send you to the robots.txt tester instead; Google's help pages give no date for that change, and the Page indexing help still links to the tester.",
          },
          {
            kind: "p",
            text: "For a single URL, URL Inspection's `Crawl allowed?` field shows whether robots.txt lets Googlebot in, and the live test runs the same check against the page as it is now. Once the rule is gone, start Validate fix. If the block was deliberate, skip validation: nothing changed for Google to confirm.",
          },
        ],
      },
    ],
    rules: ["indexing-robots-blocks-google", "indexing-robots-blocks-pages", "indexing-robots-format"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (URL blocked by robots.txt; Indexed, though blocked)" },
      { label: "Google Search Console Help, robots.txt report", url: "https://support.google.com/webmasters/answer/6062598", read: READ },
      G_ROBOTS_SPEC,
      { label: "Google crawling docs, update your robots.txt file (caching, recrawl)", url: "https://developers.google.com/crawling/docs/robots-txt/submit-updated-robots-txt", read: READ },
      G_FACETED,
      { label: "Next.js docs, robots.txt file convention", url: "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots", read: READ },
      { label: "Nuxt Robots docs, disabling indexing", url: "https://nuxtseo.com/docs/robots/guides/disable-indexing", read: READ },
      { label: "Astro docs, @astrojs/sitemap 3.7.4 (robots.txt endpoint)", url: "https://docs.astro.build/en/guides/integrations-guide/sitemap/", read: READ },
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (Crawl allowed?)" },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "search-console",
    slug: "alternate-page-with-canonical",
    title: "Alternate page with proper canonical tag: fix or ignore",
    h1: "Alternate page with proper canonical tag: when it's expected, and when it hides a canonical bug",
    description:
      "Alternate page with proper canonical tag needs no fix, says Google. When that holds, and three bugs it can hide: home canonicals, hreflang, AMP.",
    answer:
      "Usually nothing is broken. The URL declares another page as its canonical, Google agreed and indexed that page instead: a parameter or sorted copy, an AMP page, a mobile version. It hides a bug when the count jumps or real pages appear in the list, for example because a shared layout points every canonical at the home page or language versions point at one language.",
    sections: [
      {
        heading: "What counts as an alternate",
        blocks: [
          {
            kind: "p",
            text: "Google's help names the cases it has in mind: an AMP page pointing at a desktop canonical, a mobile version of a desktop canonical, or a desktop version of a mobile one. The URL points to its canonical, that canonical is indexed, and Google says there is nothing to do. The same help notes that Search Console doesn't detect alternate language pages.",
          },
          {
            kind: "p",
            text: "By that definition, any URL whose canonical names another indexed page, with Google in agreement, can end up here. That is also why a bug can hide in this list: a page that wrongly calls itself a copy gets the same reassuring label as a real variant.",
          },
        ],
      },
      {
        heading: "Expected entries you can leave alone",
        blocks: [
          {
            kind: "list",
            items: [
              "Parameter copies such as `/dresses/cocktail?gclid=ABCD` whose canonical is the clean URL. Google uses this exact case to show signals being merged into the preferred page.",
              "Filtered and sorted listings that canonicalize to the unfiltered page, an option Google's faceted navigation guide describes.",
              "AMP pages: Google requires every AMP page to link to a canonical, either a non-AMP page or itself.",
              "Separate mobile URLs that canonicalize to the desktop page.",
            ],
          },
          {
            kind: "p",
            text: "If the count roughly matches how many such variants the site has, there's nothing to fix and nothing to validate.",
          },
        ],
      },
      {
        heading: "Why are my real pages listed as alternates?",
        blocks: [
          {
            kind: "p",
            text: "The warning sign is a content page in the examples, say `/blog/launch-notes`, with URL Inspection showing `https://www.example.com/` as its user-declared canonical. A shared layout prints one fixed href on every route. In Next.js it's `alternates: { canonical: \"/\" }` in the root layout, covered in [canonical URLs in Next.js](/frameworks/nextjs/canonical-url); in other stacks, a `<link rel=\"canonical\">` written into the layout with a literal URL.",
          },
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "for path in / /pricing /blog/launch-notes; do",
              "  printf '%s -> ' \"$path\"",
              "  curl -s \"https://www.example.com$path\" | grep -io '<link[^>]*rel=\"canonical\"[^>]*>'",
              "done",
            ),
          },
          {
            kind: "p",
            text: "Every line should print the page's own URL. If they all print the home page, fix the layout, redeploy, and request indexing for the pages that matter most; the rest move out of this list as Google recrawls them.",
          },
        ],
      },
      {
        heading: "Language versions that point to one language",
        blocks: [
          {
            kind: "p",
            text: "Hreflang and canonical do different jobs. Each language version lists every version, itself included, with fully-qualified URLs, and each pair must link back or Google ignores the tags. Google's canonical docs ask for a canonical in the same language, or the best substitute when none exists. A French page whose canonical names the English page declares itself a copy, and if Google agrees it shows up here instead of in French results.",
          },
          {
            kind: "code",
            label: "app/[lang]/pricing/page.tsx",
            code: lines(
              'import type { Metadata } from "next";',
              "",
              "export async function generateMetadata(",
              "  { params }: { params: Promise<{ lang: string }> },",
              "): Promise<Metadata> {",
              "  const { lang } = await params;",
              "  return {",
              "    alternates: {",
              "      canonical: `/${lang}/pricing`,",
              "      languages: {",
              '        en: "/en/pricing",',
              '        fr: "/fr/pricing",',
              '        "x-default": "/en/pricing",',
              "      },",
              "    },",
              "  };",
              "}",
            ),
          },
          {
            kind: "p",
            text: "With `metadataBase` set in the root layout, Next.js prints these as absolute URLs, and its types accept `x-default` (checked in next 16.2.9). Next.js merges metadata shallowly, so a page that sets `alternates` with only a canonical drops the `languages` its layout declared. The [hreflang rules](/docs/issues/indexing-hreflang-invalid) list the other mistakes that make Google discard the tags.",
          },
        ],
      },
      {
        heading: "AMP pairs left half-removed",
        blocks: [
          {
            kind: "p",
            text: "If you dropped AMP, Google's removal steps are to delete the `rel=\"amphtml\"` link from the canonical page and answer the old AMP URL with a 301 or 302 to it. AMP URLs that still return 200 with their canonical stay in this list. Those whose canonical now names a redirecting or deleted URL need it updated, like any [canonical aimed at a page that can't be indexed](/docs/issues/indexing-canonical-target-invalid).",
          },
        ],
      },
      {
        heading: "Checking a URL, and why there's nothing to validate",
        blocks: [
          {
            kind: "p",
            text: "In URL Inspection, compare `User-declared canonical` with `Google-selected canonical`. When they match and the canonical is the page you intend, the entry is correct; inspect the canonical URL itself to confirm it is indexed. The live test reports the user-declared canonical but never the Google-selected one.",
          },
          {
            kind: "p",
            text: "Google labels this reason as needing no action, so a validation run proves nothing here. After fixing one of the bugs above, watch the affected pages move from this list to Indexed as Google recrawls them; Request indexing speeds that up for a handful of URLs within its daily limit.",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-mismatch", "indexing-canonical-target-invalid", "indexing-hreflang-invalid"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (Alternate page with proper canonical tag)" },
      G_CANONICAL,
      { label: "Google Search Central, localized versions of your pages (hreflang)", url: "https://developers.google.com/search/docs/specialty/international/localized-versions", read: READ },
      { label: "Google Search Central, enhance AMP content (AMP and canonical pages)", url: "https://developers.google.com/search/docs/crawling-indexing/amp/enhance-amp", read: READ },
      { label: "Google Search Central, remove AMP pages from Search", url: "https://developers.google.com/search/docs/crawling-indexing/amp/remove-amp", read: READ },
      G_FACETED,
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (canonical fields)" },
      { label: "Next.js docs, generateMetadata: alternates and merging", url: "https://nextjs.org/docs/app/api-reference/functions/generate-metadata#alternates", read: READ },
      { label: "Next.js 16.2.9, alternative-urls-types.d.ts (x-default)", url: "https://app.unpkg.com/next@16.2.9/files/dist/lib/metadata/types/alternative-urls-types.d.ts", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "search-console",
    slug: "soft-404",
    title: "Soft 404 error fix for Next.js, Nuxt, SvelteKit, Astro",
    h1: "Soft 404 in Search Console: the route that answers 200 for a page that isn't there",
    description:
      "Fix Soft 404: SPA fallbacks and catch-all routes that answer 200, and the call that returns a real 404 in Next.js, Nuxt, SvelteKit and Astro.",
    answer:
      "Google got a 200 for a page that reads like an error or an empty page, classed it as a soft 404, and left it out of the index. Find the route that rendered it. A missing record should return a real 404: `notFound()` in Next.js, `createError` with status 404 in Nuxt, `error(404)` in SvelteKit, a 404 Response in Astro. A thin but real page needs more content.",
    sections: [
      {
        heading: "Why does a page that loads fine count as a soft 404?",
        blocks: [
          {
            kind: "p",
            text: "Google's HTTP status docs say Search Console reports a soft 404 when a 2xx response carries content that suggests an error: an empty page or an error message. The status code says success, the page says nothing is here, and Google believes the page. Its help gives two exits: a real 404 for pages that are gone, more content for pages that aren't.",
          },
          {
            kind: "p",
            text: "To see what Google saw, run a live test in URL Inspection and open View tested page. The screenshot shows the rendered page and More info shows the HTTP response. A spinner, a blank template or a \"Product not found\" heading in that screenshot is the soft 404.",
          },
        ],
      },
      {
        heading: "Where modern stacks answer 200 for missing pages",
        blocks: [
          {
            kind: "list",
            items: [
              "Single-page app fallbacks. Netlify's documented rule `/* /index.html 200` serves index.html, in its own words, instead of giving a 404 no matter what URL the browser requests. Cloudflare Workers with `not_found_handling = \"single-page-application\"` serve `/index.html` with `200 OK`, and Cloudflare Pages assumes a single-page app when the build has no top-level `404.html`.",
              "Catch-all routes. Astro's docs say a page rendered on demand is served to any route it matches, and a `[...slug]` route in any framework does the same. If the lookup comes back empty and the template renders anyway, every invented URL becomes a page.",
              "Caught errors. A `try/catch` around the data call that renders an empty state on failure turns an API outage into a page of nothing.",
              "Empty listings: a tag with no posts, a filter with no products, an internal search with no results.",
            ],
          },
        ],
      },
      {
        heading: "Next.js and Nuxt: return the 404 from the page",
        blocks: [
          {
            kind: "p",
            text: "In the App Router, call `notFound()` from `next/navigation` once the lookup fails. It throws, renders the nearest `not-found` file with a 404, and Next.js adds a `noindex` tag to the response.",
          },
          {
            kind: "code",
            label: "app/products/[slug]/page.tsx",
            code: lines(
              'import { notFound } from "next/navigation";',
              "",
              "export default async function Product({ params }: { params: Promise<{ slug: string }> }) {",
              "  const { slug } = await params;",
              "  const product = await getProduct(slug);",
              "  if (!product) notFound();",
              "  return <h1>{product.name}</h1>;",
              "}",
            ),
          },
          {
            kind: "p",
            text: "Two traps from the Next.js docs. A `try/catch` around the call swallows it, and no not-found UI renders. A call made inside a `<Suspense>` boundary, once streaming has started, keeps the 200 status and only adds the `noindex` tag. Run the existence check before the first Suspense boundary when you want the status itself to be 404.",
          },
          {
            kind: "p",
            text: "In Nuxt, throw `createError` from the page when the fetch returns nothing. The current docs write `status` and `statusText`. In nuxt 4.6.3 the h3 helper underneath (1.15.11) reads `statusCode` first and `status` second, so older code passing `statusCode: 404` keeps working.",
          },
          {
            kind: "code",
            label: "app/pages/products/[slug].vue",
            code: lines(
              '<script setup lang="ts">',
              "const route = useRoute();",
              "const { data: product } = await useFetch(`/api/products/${route.params.slug}`);",
              "if (!product.value) {",
              '  throw createError({ status: 404, statusText: "Page Not Found" });',
              "}",
              "</script>",
            ),
          },
        ],
      },
      {
        heading: "SvelteKit and Astro",
        blocks: [
          {
            kind: "p",
            text: "SvelteKit: call `error(404, \"Not found\")` from `@sveltejs/kit` in the route's `load`. SvelteKit sets the response status to 404 and renders the nearest `+error.svelte`; since version 2 you don't write `throw` in front of it.",
          },
          {
            kind: "code",
            label: "src/routes/products/[slug]/+page.server.ts",
            code: lines(
              'import { error } from "@sveltejs/kit";',
              "",
              "export async function load({ params }) {",
              "  const product = await getProduct(params.slug);",
              '  if (!product) error(404, "Not found");',
              "  return { product };",
              "}",
            ),
          },
          {
            kind: "p",
            text: "Astro, on pages rendered on demand: return a `Response` with status 404, or set `Astro.response.status = 404` and render a not-found message in that branch. The first sends an empty body, so a visitor sees a blank page. On prerendered routes, leave the missing path out of `getStaticPaths()` and the host's 404 page answers for it.",
          },
          {
            kind: "code",
            label: "src/pages/products/[slug].astro",
            code: lines(
              "---",
              "export const prerender = false;",
              "const product = await getProduct(Astro.params.slug);",
              "if (!product) {",
              '  return new Response(null, { status: 404, statusText: "Not found" });',
              "}",
              "---",
              "<h1>{product.name}</h1>",
            ),
          },
        ],
      },
      {
        heading: "What if the app is a single-page app on a static host?",
        blocks: [
          {
            kind: "p",
            text: "Without a server, the status of every path is the host's decision, and the fallback answers 200. Google's JavaScript SEO guide gives two ways out when the app can't send a real status: redirect in JavaScript to a URL the server answers with 404, or add `<meta name=\"robots\" content=\"noindex\">` from JavaScript on error views.",
          },
          {
            kind: "code",
            label: "client-side product view",
            code: lines(
              "const res = await fetch(`/api/products/${id}`);",
              "if (res.status === 404) {",
              "  // /not-found must be a file or route the host serves with a 404",
              '  window.location.href = "/not-found";',
              "}",
            ),
          },
          {
            kind: "p",
            text: "The lasting fix is to stop shipping an empty shell: prerender the routes that exist, so the host can serve its 404 page for everything else, as laid out in the [Vite and React guide](/frameworks/vite-react). On Cloudflare Pages, adding a top-level `404.html` turns off the single-page assumption.",
          },
        ],
      },
      {
        heading: "Empty listings and internal search results",
        blocks: [
          {
            kind: "p",
            text: "Google's faceted navigation guide is explicit for filters: return a 404 when a filter combination has no results. The same logic fits a tag page with no posts or a category emptied by a migration. An internal search URL with no results is the same case: answer 404, or keep the search parameter out of crawling with robots.txt, the approach that guide gives for parameter URLs.",
          },
        ],
      },
      {
        heading: "Verify, then validate",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "# a missing record: expect 404",
              "curl -s -o /dev/null -w '%{http_code}\\n' https://www.example.com/products/does-not-exist",
              "",
              "# a path nothing could match: expect 404, not 200 or a redirect to /",
              "curl -sIL https://www.example.com/no-such-page-7f3k | grep -iE '^(HTTP|location)'",
            ),
          },
          {
            kind: "p",
            text: "Once both answer 404, start Validate fix for the Soft 404 reason. The fixed URLs then belong under Not found (404), which is where a page that doesn't exist should end up; [404 or 410](/guides/404-vs-410) covers which code to send. Pages you meant to keep need more content first, and the probe above is the same one behind [missing pages that return 200](/docs/issues/indexing-soft-404-site).",
          },
        ],
      },
    ],
    rules: ["indexing-soft-404-site", "indexing-soft-404", "structure-thin-content"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (Soft 404)" },
      G_STATUS_CODES,
      { label: "Google Search Central, JavaScript SEO basics (soft 404 in single-page apps)", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics", read: READ },
      G_FACETED,
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (View tested page)" },
      { label: "Next.js docs, notFound (updated 2026-09-23)", url: "https://nextjs.org/docs/app/api-reference/functions/not-found", read: READ },
      { label: "Nuxt 4.x docs, createError", url: "https://nuxt.com/docs/4.x/api/utils/create-error", read: READ },
      { label: "h3 1.15.11, createError (statusCode and status)", url: "https://app.unpkg.com/h3@1.15.11/files/dist/index.mjs", read: READ },
      { label: "SvelteKit docs, errors", url: "https://svelte.dev/docs/kit/errors", read: READ },
      { label: "Astro docs, on-demand rendering", url: "https://docs.astro.build/en/guides/on-demand-rendering/", read: READ },
      { label: "Astro docs, routing (on-demand dynamic routes)", url: "https://docs.astro.build/en/guides/routing/", read: READ },
      { label: "Netlify docs, rewrites and proxies (single-page apps)", url: "https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/", read: READ },
      { label: "Cloudflare Workers docs, single-page application routing", url: "https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/", read: READ },
      { label: "Cloudflare Pages docs, serving Pages", url: "https://developers.cloudflare.com/pages/configuration/serving-pages/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "search-console",
    slug: "server-error-5xx",
    title: "Server error (5xx) fix: timeouts, rate limits, logs",
    h1: "Server error (5xx) in Search Console: tracing the failed requests on serverless hosts",
    description:
      "Fix Server error (5xx): function timeouts and upstream failures during render, how Googlebot reacts to 5xx and 429, and where to find the logs.",
    answer:
      "Googlebot requested the URL and got a status from 500 to 599, so Google ignored the content and slowed its crawl of the host. On serverless hosts, look first at renders that hit the function time limit, upstream APIs or databases failing mid-render, and protection layers that throttle a busy crawler. Pull the failing requests from the host's logs quickly: on some plans they are kept for one hour.",
    sections: [
      {
        heading: "What a 5xx does to crawling",
        blocks: [
          {
            kind: "list",
            items: [
              "Google ignores anything a 5xx response contains.",
              "500, 502 and 503 make Google lower its crawl rate, in proportion to the number of URLs returning errors; once responses recover, the rate climbs back gradually.",
              "Already indexed URLs stay at first, but URLs that keep returning server errors are eventually dropped.",
              "429 Too Many Requests counts as a server error too, read as a sign of overload.",
              "robots.txt is a special case. If it fails with a 5xx, Google stops crawling the whole site for the first 12 hours, then works from its last cached copy for up to 30 days, as explained on [the robots.txt failure page](/docs/issues/indexing-robots-unavailable).",
            ],
          },
        ],
      },
      {
        heading: "Where do I find the failing requests?",
        blocks: [
          {
            kind: "p",
            text: "Search Console shows the URL, not the cause, and its data trails the crawl. The cause sits in your host's request logs, which don't keep it long. On Vercel, runtime logs are kept for 1 hour on Hobby, 1 day on Pro, 3 days on Enterprise, and 30 days with Observability Plus.",
          },
          {
            kind: "p",
            text: "In the Logs view, filter by Status Code and Request Path. Each entry's details give the user agent, the function's duration and its start type, which tells a cold start from a warm one. From the CLI:",
          },
          {
            kind: "code",
            label: "terminal",
            code: "vercel logs --environment production --query 'level:error' --since 1h",
          },
          {
            kind: "p",
            text: "When the logs have already expired, reproduce: request the flagged URLs several times and look for intermittent failures. Google's help also points to the Crawl Stats report, whose host status shows whether the errors are a site-wide availability problem or a few routes.",
          },
        ],
      },
      {
        heading: "Function timeouts and slow renders",
        blocks: [
          {
            kind: "p",
            text: "A Vercel function that runs past its maximum duration ends with `FUNCTION_INVOCATION_TIMEOUT`, a 504. Vercel lists the causes: a slow network call, a function that never returns a response, an infinite loop, a failing upstream API or database, and unhandled exceptions. With fluid compute, on by default, the limit is 300 seconds on every plan, and Pro and Enterprise can raise it to 800.",
          },
          {
            kind: "p",
            text: "A higher limit keeps the request open longer; it doesn't make the render faster. The lasting fix is to stop rendering the page per request: prerender it, or cache it with ISR. The Next.js docs add a property that matters here: if revalidation throws, Next.js keeps serving the last page it generated successfully and retries on a later request.",
          },
          {
            kind: "code",
            label: "app/blog/[slug]/page.tsx",
            code: lines(
              'import { notFound } from "next/navigation";',
              "",
              "export const revalidate = 3600;",
              "",
              "export default async function Post({ params }: { params: Promise<{ slug: string }> }) {",
              "  const { slug } = await params;",
              "  const res = await fetch(`https://cms.example.com/posts/${slug}`);",
              "  if (res.status === 404) notFound();",
              "  // Any other failure throws: ISR keeps serving the last good version",
              "  if (!res.ok) throw new Error(`CMS answered ${res.status}`);",
              "  const post = await res.json();",
              "  return <article><h1>{post.title}</h1></article>;",
              "}",
            ),
          },
          {
            kind: "p",
            text: "Keep the two failures apart: a post that doesn't exist is a 404, and turning it into an empty 200 trades this report for [Soft 404](/search-console/soft-404).",
          },
        ],
      },
      {
        heading: "Planned downtime: 503 with Retry-After",
        blocks: [
          {
            kind: "p",
            text: "For maintenance, Google's guidance is a 503 with a `Retry-After` header holding a best-effort date or duration, for a short period: a few days at most for a whole site. Its crawl-rate page speaks of a couple of hours or 1 to 2 days, and warns that a URL answering errors for several days may be dropped. Never send the 503 for robots.txt, which Google says blocks all crawling.",
          },
          {
            kind: "code",
            label: "proxy.ts (Next.js 16)",
            code: lines(
              "export function proxy() {",
              '  if (process.env.MAINTENANCE !== "1") return;',
              '  return new Response("Down for maintenance, back within the hour.", {',
              "    status: 503,",
              '    headers: { "Retry-After": "3600", "Content-Type": "text/plain" },',
              "  });",
              "}",
              "",
              "// robots.txt, the sitemap and static files stay out of the 503",
              "export const config = {",
              '  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],',
              "};",
            ),
          },
        ],
      },
      {
        heading: "Why does only Googlebot get errors?",
        blocks: [
          {
            kind: "p",
            text: "Google's help lists misconfigured firewalls and DoS protection among the causes: protection systems block high request volumes, and Googlebot makes many requests. Cloudflare rate limiting rules answer 429 by default, which Google counts as a server error, so a rule tuned for scrapers slows the crawl of the whole host. Exempt verified crawlers from rate limits the way the [403 page](/search-console/403-forbidden) does for firewall rules.",
          },
          {
            kind: "p",
            text: "If you really need Google to crawl less, its documented emergency brake is a 500, 503 or 429 for a couple of hours, up to 1 to 2 days, which lowers the crawl rate across the whole hostname. The other route Google documents is a special request in Search Console, which can take several days to be evaluated and can only lower the rate.",
          },
        ],
      },
      {
        heading: "Confirm it holds, then validate",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "# five requests in a row: every line should read 200",
              "for i in 1 2 3 4 5; do",
              "  curl -s -o /dev/null -w '%{http_code} %{time_total}s\\n' https://www.example.com/blog/launch-notes",
              "done",
            ),
          },
          {
            kind: "p",
            text: "One clean live test in URL Inspection proves little: Google's own help warns that server errors can be transient, so the test may not match what happened during the crawl. Run the loop at the hour the logs showed failures, and again after the deploy. Then start Validate fix. Its first sample check ends the run if any sampled URL still fails, so wait until the failures are gone, not merely rarer.",
          },
        ],
      },
    ],
    rules: ["indexing-broken-page", "indexing-robots-unavailable", "perf-slow-ttfb"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (Server error (5xx), fixing server connectivity errors)" },
      G_STATUS_CODES,
      G_ROBOTS_SPEC,
      { label: "Google crawling docs, reduce the Googlebot crawl rate", url: "https://developers.google.com/crawling/docs/crawlers-fetchers/reduce-crawl-rate", read: READ },
      { label: "Google Search Central, pause or disable a site", url: "https://developers.google.com/search/docs/crawling-indexing/pause-online-business", read: READ },
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (transient server errors)" },
      { label: "Vercel docs, FUNCTION_INVOCATION_TIMEOUT", url: "https://vercel.com/docs/errors/FUNCTION_INVOCATION_TIMEOUT", read: READ },
      { label: "Vercel docs, configuring maximum duration (updated 2026-08-24)", url: "https://vercel.com/docs/functions/configuring-functions/duration", read: READ },
      { label: "Vercel docs, runtime logs (updated 2026-08-28)", url: "https://vercel.com/docs/logs/runtime", read: READ },
      { label: "Next.js docs, incremental static regeneration", url: "https://nextjs.org/docs/app/guides/incremental-static-regeneration", read: READ },
      { label: "Next.js docs, proxy.js", url: "https://nextjs.org/docs/app/api-reference/file-conventions/proxy", read: READ },
      { label: "Cloudflare docs, rule actions (429 for rate limiting rules)", url: "https://developers.cloudflare.com/ruleset-engine/rules-language/actions/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "search-console",
    slug: "page-with-redirect",
    title: "Page with redirect: how to fix the ones that matter",
    h1: "Page with redirect in Search Console: the redirects that are fine, and the ones you publish by accident",
    description:
      "Page with redirect is often expected. Fix these: sitemap entries and links that point at redirects, redirect chains, and slash or www rules from the host.",
    answer:
      "Most of the time nothing is wrong: the URL redirects, so Google considers the target instead, as it should for an old slug, the http address or the non-www host. Act when the list holds URLs you still publish: sitemap entries, internal links or canonicals that point at a redirect, for example after a trailing-slash or www rule added by the host. Point them at the final URL.",
    sections: [
      {
        heading: "Why most entries are fine",
        blocks: [
          {
            kind: "p",
            text: "Google's help defines the reason as a non-canonical URL that redirects to another page, so it isn't indexed; whether the target is indexed depends on Google's own assessment of the target. It adds that a canonical URL with a redirect can be indexed. The list fills up naturally after a migration, a switch to https or a change of host.",
          },
          {
            kind: "p",
            text: "The redirect type decides what Google shows. A 301 or 308 is a strong signal that the target should be canonical, and Search shows the target; a 302, 303 or 307 is a weak signal, and Search keeps showing the source. In next 16.2.9, `redirect()` from `next/navigation` sends a 307, while `permanentRedirect()` and `permanent: true` in `next.config` send a 308. A page that moved for good needs one of the last two, as [redirect status codes](/guides/redirect-status-codes) explains.",
          },
        ],
      },
      {
        heading: "Which redirects do I actually need to fix?",
        blocks: [
          {
            kind: "p",
            text: "A redirect in this list is a problem when your own site keeps sending Google to it. Google wants the sitemap to hold the URLs you want shown in search results, and internal links to point consistently at the canonical URL. Three places to check:",
          },
          {
            kind: "list",
            items: [
              "The sitemap: switch the report filter from All known pages to All submitted pages. Any URL still listed under Page with redirect is a sitemap entry that redirects, the case covered by [sitemap hygiene](/docs/issues/indexing-sitemap-hygiene).",
              "Internal links: URL Inspection's Referring page field names a page Google possibly used to find the URL. It can be empty even when a link exists.",
              "Canonicals and hreflang: a canonical or alternate that names a redirecting URL sends Google a signal that the redirect contradicts.",
            ],
          },
          {
            kind: "p",
            text: "The report's example table stops at 1,000 URLs, so on a large site this loop is quicker. For a sitemap index, run it on each child file.",
          },
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "# print every sitemap URL that doesn't answer 200",
              "curl -s https://www.example.com/sitemap.xml \\",
              "  | grep -o '<loc>[^<]*</loc>' | sed -e 's/<loc>//' -e 's/<\\/loc>//' \\",
              "  | while read -r url; do",
              "      code=$(curl -s -o /dev/null -w '%{http_code}' \"$url\")",
              "      [ \"$code\" = \"200\" ] || echo \"$code $url\"",
              "    done",
            ),
          },
        ],
      },
      {
        heading: "Redirects your host or framework adds on its own",
        blocks: [
          {
            kind: "p",
            text: "Some redirects come from rules nobody wrote in the app code. Each is harmless until the sitemap or the links use the other form.",
          },
          {
            kind: "list",
            items: [
              "Next.js redirects `/about/` to `/about` by default, and the reverse with `trailingSlash: true`. In next 16.2.9 both rules are permanent, so they answer 308.",
              "Vercel's `trailingSlash` in `vercel.json` redirects with a 308 when set to true or false, and not at all when left undefined. Domain redirects live in the project's Domains settings, where Vercel recommends `www` as the primary host.",
              "Netlify: Pretty URLs, on by default, forward paths like `/about` to `/about/`, and a redirect rule can't add or remove a slash because Netlify matches paths with and without it.",
              "Cloudflare Pages redirects `/contact.html` to `/contact` and `/about/index.html` to `/about/`.",
              "Astro's `trailingSlash` redirects only on pages rendered on demand in production, with a 301 for GET requests; slashes on prerendered pages are left to the host.",
            ],
          },
          {
            kind: "p",
            text: "The fix is the same everywhere: pick one form, make the sitemap generator, the canonical tags and the internal links write exactly that form, and let the host redirect the rest. [Trailing slashes](/guides/trailing-slash) has the detail per host.",
          },
        ],
      },
      {
        heading: "Chains, loops and the Redirect error reason",
        blocks: [
          {
            kind: "p",
            text: "Googlebot generally follows up to 10 redirect hops. A chain that is too long, a loop, a URL that grows past the maximum length or an empty URL in the chain moves the URL to a different reason, Redirect error, which is a real error. Short chains stay under Page with redirect but cost a fetch per hop: an old slug that goes to `http://`, then `https://`, then `www` takes three requests before any content. Collapse it into one rule from the old URL to the final one, as in [links through redirect chains](/docs/issues/indexing-redirect-chain).",
          },
          {
            kind: "code",
            label: "terminal",
            code: lines(
              "curl -sIL http://example.com/blog/old-slug | grep -iE '^(HTTP|location)'",
              "# goal: one Location line, then a 200",
            ),
          },
        ],
      },
      {
        heading: "Inspecting a URL that redirects",
        blocks: [
          {
            kind: "p",
            text: "URL Inspection's indexed result describes the tested URL itself and ignores the redirect; to see the target's status, use the INSPECT button in the Page indexing section. The live test is murkier. Search Console's help says it follows the redirect and tests the final page without telling you, while Google's HTTP status code docs say Google's inspection tools don't follow redirects. With two official pages in disagreement, trust `curl -sIL` for the chain and inspect the final URL on its own.",
          },
        ],
      },
      {
        heading: "Should you click Validate fix?",
        blocks: [
          {
            kind: "p",
            text: "For true redirects there is nothing to repair. After cleaning the sitemap and the links, expect the count to stay above zero: old URLs that other sites link to keep redirecting, which is what you want. The check that matters is the All submitted pages filter showing no URL under this reason.",
          },
        ],
      },
    ],
    rules: ["indexing-sitemap-hygiene", "indexing-redirect-chain", "indexing-temporary-redirect"],
    sources: [
      { ...GSC_INDEXING, label: "Google Search Console Help, Page indexing report (Page with redirect, Redirect error)" },
      { ...GSC_INSPECTION, label: "Google Search Console Help, URL Inspection tool (redirects, Referring page)" },
      G_STATUS_CODES,
      { label: "Google Search Central, redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects", read: READ },
      { label: "Google Search Central, build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", read: READ },
      G_CANONICAL,
      { label: "Next.js docs, trailingSlash", url: "https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash", read: READ },
      { label: "Next.js 16.2.9, load-custom-routes.js (trailing-slash redirects)", url: "https://app.unpkg.com/next@16.2.9/files/dist/lib/load-custom-routes.js", read: READ },
      { label: "Next.js 16.2.9, redirect.js (redirect and permanentRedirect status)", url: "https://app.unpkg.com/next@16.2.9/files/dist/client/components/redirect.js", read: READ },
      VERCEL_JSON,
      { label: "Vercel docs, deploying and redirecting domains", url: "https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting", read: READ },
      { label: "Netlify docs, redirect options (trailing slash normalization)", url: "https://docs.netlify.com/manage/routing/redirects/redirect-options/", read: READ },
      { label: "Cloudflare Pages docs, serving Pages (route matching)", url: "https://developers.cloudflare.com/pages/configuration/serving-pages/", read: READ },
      { label: "Astro docs, configuration reference: trailingSlash", url: "https://docs.astro.build/en/reference/configuration-reference/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

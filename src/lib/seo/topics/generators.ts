import type { TopicPage } from "./types";

/**
 * Une page par générateur de site statique ou framework (hub « guides ») :
 * URL canonique, robots.txt, sitemap, noindex d'une page, image Open Graph,
 * et le réglage dont l'absence casse tout (souvent l'URL du site).
 *
 * Tout fait vient d'une doc officielle lue le 2026-11-02 ou du code source à
 * la version indiquée : Hugo 0.169.0, Eleventy 3.1.7, MkDocs 1.6.1 et Material
 * 9.8.0, Starlight 0.42.8, Angular 22.2 (CLI 22.2.5), Docusaurus 3.10.2,
 * VitePress 1.6.4 (le site vitepress.dev décrit déjà la 2.0 alpha).
 */

const READ = "2026-11-02";

export const GENERATORS: TopicPage[] = [
  {
    hub: "guides",
    slug: "hugo-seo",
    title: "Hugo SEO: canonical URL, robots.txt, sitemap, noindex",
    h1: "Hugo SEO: baseURL, canonical URL, robots.txt, sitemap, noindex and og:image",
    description:
      "Hugo SEO from the docs and the 0.169 source: baseURL, .Permalink as canonical, enableRobotsTXT, sitemap.disable, noindex and the Open Graph partial.",
    answer:
      "Set `baseURL` to your production URL with a trailing slash, because Hugo builds `.Permalink`, the sitemap and the Open Graph URLs from it, and its default is `https://example.org/`. Then print `.Permalink` as the canonical in your head partial, set `enableRobotsTXT = true` with a `layouts/robots.txt` template, and mark noindex pages with a front matter param plus `sitemap.disable`.",
    sections: [
      {
        heading: "baseURL: the setting the other four depend on",
        blocks: [
          {
            kind: "p",
            text: "Hugo's configuration reference defines `baseURL` as the absolute URL of the published site, with protocol, host, path and a trailing slash. Its default is `https://example.org/`. A site that never sets it ships canonicals, sitemap entries and `og:url` values on example.org, since all three are built from `.Permalink`.",
          },
          {
            kind: "code",
            label: "hugo.toml",
            code: 'baseURL = "https://www.example.com/"\ntitle = "Example"\nenableRobotsTXT = true\nenableGitInfo = true\n\n[params]\n  images = ["images/og-default.png"]',
          },
          {
            kind: "p",
            text: "To build a preview on another domain, override the value instead of editing the file. An environment variable takes precedence over the configuration file, so `HUGO_BASEURL=https://preview.example.net/ hugo build` works. A `config/production/` directory holds values used only in the production environment, which is the one `hugo build` uses by default.",
          },
        ],
      },
      {
        heading: "Where does the canonical tag come from in Hugo?",
        blocks: [
          {
            kind: "p",
            text: "From your theme or your own templates. In the Hugo 0.169.0 source, the only embedded template that writes a canonical is the one for alias redirect pages; the Open Graph, X card and schema partials don't. `.Permalink` gives you the value: with `baseURL` set to `https://example.org/docs/`, the about page's permalink is `https://example.org/docs/about/`.",
          },
          {
            kind: "code",
            label: "layouts/_partials/head/seo.html",
            code: '<link rel="canonical" href="{{ .Permalink }}">\n{{ if or .Params.noindex (not hugo.IsProduction) }}\n  <meta name="robots" content="noindex">\n{{ end }}\n{{ partial "opengraph.html" . }}\n{{ partial "twitter_cards.html" . }}',
          },
          {
            kind: "p",
            text: "Call it from the `<head>` of your base template with `{{ partial \"head/seo.html\" . }}`. The `hugo.IsProduction` test marks every build outside production as noindex: `hugo build` defaults to production and `hugo server` to development, and a staging build run with `--environment staging` stays out of the index ([staging sites in Google](/guides/staging-site-indexed)).",
          },
        ],
      },
      {
        heading: "How do I generate robots.txt in Hugo?",
        blocks: [
          {
            kind: "p",
            text: "Set `enableRobotsTXT = true`; it is `false` by default. Without a template of your own, Hugo writes a file with one line, `User-agent: *`, which allows everything and names no sitemap. Hugo looks for `layouts/robots.txt` first, then for the theme's copy.",
          },
          {
            kind: "code",
            label: "layouts/robots.txt",
            code: 'User-agent: *\nDisallow: /search/\n\nSitemap: {{ "sitemap.xml" | absURL }}',
          },
          {
            kind: "p",
            text: "Write `\"sitemap.xml\"` without a leading slash. `absURL` resolves a value that starts with `/` against the protocol and host only, so on a site whose `baseURL` ends in `/docs/` the line would lose that folder. The other route is a plain `static/robots.txt` with `enableRobotsTXT = false`, since Hugo copies `static/` to the root of `public/`. Either way, Google only reads robots.txt at the root of a host, so a site published under a path can't use one and needs robots meta tags instead.",
          },
        ],
      },
      {
        heading: "What goes in Hugo's sitemap, and how do I leave a page out?",
        blocks: [
          {
            kind: "p",
            text: "The embedded template lists every page that has a permalink and doesn't set `sitemap.disable`, with a `<lastmod>` from `.Lastmod` when it isn't zero. `changefreq` and `priority` are omitted unless you set them, and Google ignores both values. A multilingual site gets one sitemap.xml per language plus a sitemap index at the root of `public/`.",
          },
          {
            kind: "code",
            label: "content/internal/runbook.md",
            code: "---\ntitle: On-call runbook\nparams:\n  noindex: true\nsitemap:\n  disable: true\n---",
          },
          {
            kind: "p",
            text: "Both keys are needed. The param feeds the robots tag in the partial above, and `sitemap.disable` drops the page from sitemap.xml, so the sitemap never lists a URL that refuses indexing. For dates Google can trust, set `enableGitInfo = true`: with the default front matter settings, `.Lastmod` then returns the Git author date of the file's last commit. More on that field in [sitemap lastmod](/guides/sitemap-lastmod).",
          },
        ],
      },
      {
        heading: "The Open Graph image with the embedded partial",
        blocks: [
          {
            kind: "p",
            text: "`{{ partial \"opengraph.html\" . }}` prints up to six `og:image` tags. It takes the page's `images` front matter first, then a page resource whose name matches `*feature*`, then `*cover*` or `*thumbnail*`, and falls back to the first entry of `params.images` in the site configuration. `og:url` and the image URLs come from permalinks, so they follow `baseURL` too.",
          },
          {
            kind: "p",
            text: "One trap in the source of the helper that collects images: a value that is neither a page resource nor a global resource goes through `absURL`. A file from `static/` written as `/images/og.png` therefore loses the folder of a `baseURL` such as `https://example.org/docs/`. Write `images/og.png`.",
          },
        ],
      },
      {
        heading: "Aliases are meta refresh pages",
        blocks: [
          {
            kind: "p",
            text: "Front matter `aliases` keep old URLs working, but by default Hugo writes a small HTML file for each one: a canonical to the new page and `<meta http-equiv=\"refresh\" content=\"0; url=...\">`, served by your host with a 200. Google treats an instant meta refresh as a permanent redirect and still recommends a server-side one when you can.",
          },
          {
            kind: "p",
            text: "To get real 301s, set `disableAliases = true` and generate your host's redirect file from the `Aliases` method of each page, the approach the URL management docs describe for `_redirects` or `.htaccess`. The trade-offs are in [meta refresh vs server redirects](/guides/meta-refresh).",
          },
          {
            kind: "code",
            label: "terminal",
            code: "hugo build\ngrep -o '<link rel=\"canonical\"[^>]*>' public/index.html\ngrep -c '<loc>https://www.example.com/' public/sitemap.xml\ncat public/robots.txt",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-missing", "framework-robots-no-sitemap", "meta-og-image-url", "indexing-meta-refresh"],
    sources: [
      { label: "Hugo docs, all configuration settings (baseURL, enableRobotsTXT, enableGitInfo, disableAliases)", url: "https://gohugo.io/configuration/all/", read: READ },
      { label: "Hugo docs, robots.txt templates", url: "https://gohugo.io/templates/robots/", read: READ },
      { label: "Hugo docs, sitemap templates", url: "https://gohugo.io/templates/sitemap/", read: READ },
      { label: "Hugo docs, embedded templates (Open Graph, X cards)", url: "https://gohugo.io/templates/embedded/", read: READ },
      { label: "Hugo docs, URL management (aliases)", url: "https://gohugo.io/content-management/urls/", read: READ },
      { label: "Hugo docs, absURL", url: "https://gohugo.io/functions/urls/absurl/", read: READ },
      { label: "Hugo docs, configuration introduction (environment variables, environments)", url: "https://gohugo.io/configuration/introduction/", read: READ },
      { label: "Hugo 0.169.0 source, embedded templates (sitemap.xml, alias.html, robots.txt, opengraph.html)", url: "https://github.com/gohugoio/hugo/tree/v0.169.0/tpl/tplimpl/embedded/templates", read: READ },
      { label: "Google Search Central, build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", read: READ },
      { label: "Google Search Central, redirects and Google Search (meta refresh)", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "eleventy-seo",
    title: "Eleventy sitemap and robots.txt: an 11ty SEO setup",
    h1: "Eleventy (11ty) SEO: the sitemap, robots.txt and canonical tags you write yourself",
    description:
      "Eleventy 3 has no sitemap or robots.txt feature. Build both as templates over collections.all and print absolute canonicals with the htmlBaseUrl filter.",
    answer:
      "Eleventy 3 has no sitemap, robots.txt or SEO plugin among its official plugins, so you write them as templates. Keep the production origin in a global data file, loop over `collections.all` in a template whose `permalink` is `/sitemap.xml`, skip items whose `url` is false, and make URLs absolute with the `htmlBaseUrl` filter from the bundled HTML Base plugin.",
    sections: [
      {
        heading: "Is there an official Eleventy sitemap plugin?",
        blocks: [
          {
            kind: "p",
            text: "No. The official plugin list (Eleventy 3.1.7 is the stable release) covers images, fetch, i18n, RSS, navigation, the HTML `<base>` plugin and a few more, and none of them deals with sitemaps, robots.txt or meta tags. Community plugins exist, but a sitemap is one short template over data Eleventy already holds, and writing it keeps the filtering rules in your own code.",
          },
        ],
      },
      {
        heading: "Put the site URL in global data",
        blocks: [
          {
            kind: "code",
            label: "_data/site.js",
            code: 'export default function () {\n  return {\n    url: process.env.SITE_URL || "https://www.example.com",\n  };\n}',
          },
          {
            kind: "p",
            text: "Files in `_data/` become global variables named after the file, so every template reads `site.url`, and JavaScript data files can read `process.env`, which lets a preview build pass its own origin. Keep the value an origin with no path. The `htmlBaseUrl` filter adds your `pathPrefix` by itself: the docs show `/test/` with the base `http://example.com/` becoming `http://example.com/pathprefix/test/`.",
          },
          {
            kind: "code",
            label: "eleventy.config.js",
            code: 'import { HtmlBasePlugin } from "@11ty/eleventy";\n\nexport default function (eleventyConfig) {\n  eleventyConfig.addPlugin(HtmlBasePlugin);\n  eleventyConfig.addFilter("isoDate", (date) => date.toISOString());\n}',
          },
        ],
      },
      {
        heading: "How do I make a sitemap.xml in Eleventy?",
        blocks: [
          {
            kind: "code",
            label: "src/sitemap.njk",
            code: '---\npermalink: /sitemap.xml\neleventyExcludeFromCollections: true\n---\n<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{%- for item in collections.all %}\n  {%- if item.page.url and not item.data.noindex %}\n  <url>\n    <loc>{{ item.page.url | htmlBaseUrl(site.url) }}</loc>\n    <lastmod>{{ item.page.date | isoDate }}</lastmod>\n  </url>\n  {%- endif %}\n{%- endfor %}\n</urlset>',
          },
          {
            kind: "list",
            items: [
              "`collections.all` holds every template, tagged or not. Without `eleventyExcludeFromCollections: true`, the sitemap and robots templates join it, and the sitemap lists `/sitemap.xml` and `/robots.txt` as pages.",
              "A template with `permalink: false` is still rendered for collections, with `page.url` set to `false`. The `if` skips it instead of printing `<loc>false</loc>`.",
              "A paginated template adds only its first page to collections, unless its pagination block sets `addAllPagesToCollections: true`.",
              "`page.date` defaults to the file's creation date, which the docs warn can reset on a CI server. Set `date: git Last Modified` in front matter to use the last commit, or the `<lastmod>` values mean nothing ([sitemap lastmod](/guides/sitemap-lastmod)).",
            ],
          },
        ],
      },
      {
        heading: "robots.txt: passthrough copy or a template",
        blocks: [
          {
            kind: "p",
            text: "A static file works with `eleventyConfig.addPassthroughCopy({ \"src/robots.txt\": \"robots.txt\" })`. Passthrough paths are relative to the project root, not to the input directory. A template is the better choice when the Sitemap line should follow `site.url`:",
          },
          {
            kind: "code",
            label: "src/robots.njk",
            code: '---\npermalink: /robots.txt\neleventyExcludeFromCollections: true\n---\nUser-agent: *\nDisallow:\n\nSitemap: {{ "/sitemap.xml" | htmlBaseUrl(site.url) }}',
          },
        ],
      },
      {
        heading: "Canonical, noindex and og:image in the base layout",
        blocks: [
          {
            kind: "code",
            label: "src/_includes/base.njk",
            code: '<link rel="canonical" href="{{ page.url | htmlBaseUrl(site.url) }}">\n{% if noindex %}<meta name="robots" content="noindex">{% endif %}\n<meta property="og:url" content="{{ page.url | htmlBaseUrl(site.url) }}">\n<meta property="og:image" content="{{ (ogImage or "/img/og-default.png") | htmlBaseUrl(site.url) }}">',
          },
          {
            kind: "p",
            text: "A page with `noindex: true` in its front matter gets the robots tag from the layout and is skipped by the sitemap loop through `item.data.noindex`, so the two never disagree. Eleventy uses trailing slashes by default (`/about/` is written to `about/index.html`), so canonicals end in a slash; [trailing slashes](/guides/trailing-slash) explains why that has to match what the host serves.",
          },
        ],
      },
      {
        heading: "Check the output",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "npx @11ty/eleventy\ngrep -c '<loc>' _site/sitemap.xml\ngrep -o '<loc>[^<]*</loc>' _site/sitemap.xml | grep -v '<loc>https://'\ncat _site/robots.txt",
          },
          {
            kind: "p",
            text: "The third command should print nothing. A relative or localhost entry means `site.url` was empty or wrong when the build ran, and Septune's sitemap check would list those entries as well.",
          },
        ],
      },
    ],
    rules: ["framework-sitemap-missing", "framework-robots-missing", "indexing-canonical-missing", "indexing-sitemap-hygiene"],
    sources: [
      { label: "Eleventy docs, official plugins", url: "https://www.11ty.dev/docs/plugins/official/", read: READ },
      { label: "Eleventy docs, collections (collections.all, eleventyExcludeFromCollections, item properties)", url: "https://www.11ty.dev/docs/collections/", read: READ },
      { label: "Eleventy docs, HTML <base> plugin (htmlBaseUrl)", url: "https://www.11ty.dev/docs/plugins/html-base/", read: READ },
      { label: "Eleventy docs, JavaScript data files (process.env)", url: "https://www.11ty.dev/docs/data-js/", read: READ },
      { label: "Eleventy docs, passthrough file copy", url: "https://www.11ty.dev/docs/copy/", read: READ },
      { label: "Eleventy docs, permalinks", url: "https://www.11ty.dev/docs/permalinks/", read: READ },
      { label: "Eleventy docs, content dates", url: "https://www.11ty.dev/docs/dates/", read: READ },
      { label: "Eleventy docs, pagination (addAllPagesToCollections)", url: "https://www.11ty.dev/docs/pagination/", read: READ },
      { label: "Google Search Central, build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "mkdocs-seo",
    title: "MkDocs SEO: site_url, sitemap, robots.txt, noindex",
    h1: "MkDocs and Material for MkDocs SEO: site_url, the empty sitemap, robots.txt, noindex and social cards",
    description:
      "Why an MkDocs sitemap.xml lists no URLs without site_url, where robots.txt goes, how to noindex a page in Material for MkDocs, and what social cards need.",
    answer:
      "Set `site_url` in mkdocs.yml. In MkDocs 1.6.1 it is what gives each page a canonical URL, and without it the sitemap.xml MkDocs writes contains no URLs at all. Put robots.txt in `docs/`, which MkDocs copies as is. With Material, add noindex through a template override that reads `page.meta.robots`, and enable the social plugin for Open Graph images.",
    sections: [
      {
        heading: "Why is my MkDocs sitemap empty?",
        blocks: [
          {
            kind: "p",
            text: "The source of MkDocs 1.6.1 explains it. Each page gets `canonical_url = urljoin(site_url, page.url)` and an `abs_url` taken from it, and both are `None` when `site_url` is unset. The sitemap template keeps only pages that have one of the two, so the build still writes `sitemap.xml` and its `sitemap.xml.gz` copy, both holding an empty `<urlset>`. The same gap removes the canonical link from every page.",
          },
          {
            kind: "code",
            label: "mkdocs.yml",
            code: "site_name: Example Docs\nsite_url: https://docs.example.com/",
          },
          {
            kind: "p",
            text: "MkDocs adds the trailing slash if you leave it off. `site_url` is optional in the configuration reference (its default is `null`), which is why nothing warns you. It also sets the path `mkdocs serve` uses, so a site published under `/docs/` previews under that path too.",
          },
        ],
      },
      {
        heading: "Every page gets the same lastmod",
        blocks: [
          {
            kind: "p",
            text: "The `<lastmod>` of each page is `update_date`, which comes from `get_build_date()`: today's date in UTC, or the date in `SOURCE_DATE_EPOCH` when that variable is set. Google uses lastmod only when it is consistently and verifiably accurate, and a sitemap where every page shows the date of the last deploy fails that test for all the pages that didn't change. [Sitemap lastmod](/guides/sitemap-lastmod) covers what Google does with the field.",
          },
        ],
      },
      {
        heading: "Where does robots.txt go in MkDocs?",
        blocks: [
          {
            kind: "p",
            text: "In `docs_dir` (`docs/` unless you changed it). MkDocs copies every file that isn't Markdown to the built site unaltered, so `docs/robots.txt` ends up as `site/robots.txt`.",
          },
          {
            kind: "code",
            label: "docs/robots.txt",
            code: "User-agent: *\nDisallow:\n\nSitemap: https://docs.example.com/sitemap.xml",
          },
          {
            kind: "p",
            text: "That only helps when the docs sit at the root of their host. Google looks for robots.txt at the host's root and nowhere else, so on a project site such as `https://user.github.io/project/` the file lands at `/project/robots.txt` and is ignored. Use robots meta tags there and submit the sitemap in Search Console ([GitHub Pages](/hosting/github-pages) has the details).",
          },
        ],
      },
      {
        heading: "How do I noindex a page in Material for MkDocs?",
        blocks: [
          {
            kind: "p",
            text: "Material's reference shows the pattern: extend `base.html` in your `custom_dir` and fill the `extrahead` block from the page's front matter.",
          },
          {
            kind: "code",
            label: "overrides/main.html",
            code: '{% extends "base.html" %}\n\n{% block extrahead %}\n  {% if page and page.meta and page.meta.robots %}\n    <meta name="robots" content="{{ page.meta.robots }}">\n  {% endif %}\n{% endblock %}',
          },
          {
            kind: "code",
            label: "mkdocs.yml and docs/internal/release-checklist.md",
            code: "# mkdocs.yml\ntheme:\n  name: material\n  custom_dir: overrides\n\n# docs/internal/release-checklist.md\n---\nrobots: noindex\n---",
          },
          {
            kind: "p",
            text: "For a whole folder, the meta plugin (Material 9.6.0 and later, marked experimental) merges a `.meta.yml` file into the front matter of every page in that folder and its subfolders. Two traps remain. The sitemap template never reads `page.meta`, so a noindexed page stays in sitemap.xml ([sitemap entries that contradict the page](/docs/issues/indexing-sitemap-hygiene)). And a Disallow line for the same path in robots.txt would stop Google from crawling the page and ever reading the tag.",
          },
        ],
      },
      {
        heading: "Open Graph images: Material's social plugin",
        blocks: [
          {
            kind: "code",
            label: "mkdocs.yml",
            code: "site_url: https://docs.example.com/\nplugins:\n  - social",
          },
          {
            kind: "p",
            text: "The built-in social plugin (Material 8.5.0 and later, marked experimental) renders a card image per page, and its default layouts set `og:image` and `twitter:image` to it. Its docs say `site_url` must be set or the cards won't be linked correctly. It needs the image processing extras, `pip install \"mkdocs-material[imaging]\"` plus the Cairo libraries; the official Docker image ships them, and GitHub's Ubuntu runners have Cairo already. To skip one page, put `social:` with `cards: false` under it in the page's front matter (9.7.0 and later).",
          },
          {
            kind: "code",
            label: "terminal",
            code: "mkdocs build\ngrep -c '<loc>' site/sitemap.xml\ngrep -o '<link rel=\"canonical\"[^>]*>' site/index.html",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-missing", "meta-og-image-missing", "indexing-noindex", "indexing-sitemap-hygiene"],
    sources: [
      { label: "MkDocs docs, configuration (site_url, use_directory_urls, docs_dir)", url: "https://www.mkdocs.org/user-guide/configuration/", read: READ },
      { label: "MkDocs docs, writing your docs (non-Markdown files, metadata)", url: "https://www.mkdocs.org/user-guide/writing-your-docs/", read: READ },
      { label: "MkDocs 1.6.1 source, structure/pages.py (canonical_url, abs_url)", url: "https://github.com/mkdocs/mkdocs/blob/master/mkdocs/structure/pages.py", read: READ },
      { label: "MkDocs 1.6.1 source, templates/sitemap.xml", url: "https://github.com/mkdocs/mkdocs/blob/master/mkdocs/templates/sitemap.xml", read: READ },
      { label: "MkDocs 1.6.1 source, utils (get_build_date, SOURCE_DATE_EPOCH)", url: "https://github.com/mkdocs/mkdocs/blob/master/mkdocs/utils/__init__.py", read: READ },
      { label: "Material for MkDocs, reference (custom meta tags, robots)", url: "https://squidfunk.github.io/mkdocs-material/reference/", read: READ },
      { label: "Material for MkDocs, customization (custom_dir, blocks)", url: "https://squidfunk.github.io/mkdocs-material/customization/", read: READ },
      { label: "Material for MkDocs, setting up social cards", url: "https://squidfunk.github.io/mkdocs-material/setup/setting-up-social-cards/", read: READ },
      { label: "Material for MkDocs, meta plugin", url: "https://squidfunk.github.io/mkdocs-material/plugins/meta/", read: READ },
      { label: "Material for MkDocs, image processing requirements", url: "https://squidfunk.github.io/mkdocs-material/plugins/requirements/image-processing/", read: READ },
      { label: "Google Search Central, create a robots.txt file (location rule)", url: "https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt", read: READ },
      { label: "Google Search Central, build and submit a sitemap (lastmod)", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "starlight-seo",
    title: "Starlight sitemap and SEO: site, head tags, og:image",
    h1: "Astro Starlight SEO: the sitemap, canonical, head tags and Open Graph images",
    description:
      "What Astro Starlight puts in the head, why its sitemap needs the site option, how to noindex a page and drop it from the sitemap, and how to add og:image.",
    answer:
      "Starlight writes a sitemap and a canonical only when `site` is set in astro.config.mjs. With it, version 0.42.8 adds @astrojs/sitemap for you (it writes sitemap-index.xml, not sitemap.xml), plus a canonical, `og:url` and a `<link rel=\"sitemap\">`. Add tags with the `head` option or per page in frontmatter, where a tag with the same name or property replaces the default. No og:image is written.",
    sections: [
      {
        heading: "What Starlight writes in the head",
        blocks: [
          {
            kind: "list",
            items: [
              "`<title>` as page title, `titleDelimiter` (`|` by default), site title.",
              "`<link rel=\"canonical\">` and `og:url`, only when `site` is set.",
              "`og:title`, `og:type` (always `article`), `og:locale` and `og:site_name`, plus `og:description` and `<meta name=\"description\">` when the page or the config has a description.",
              "`twitter:card` with the value `summary_large_image`, and `twitter:site` when one of your social links points to X.",
              "hreflang alternates on multilingual sites, and `<link rel=\"sitemap\" href=\"/sitemap-index.xml\">` when `site` is set.",
            ],
          },
          {
            kind: "p",
            text: "That list comes from `utils/head.ts` in Starlight 0.42.8. It has no `og:image`, so the large card that `twitter:card` asks for has no picture unless you add one.",
          },
        ],
      },
      {
        heading: "Why doesn't my Starlight site have a sitemap?",
        blocks: [
          {
            kind: "p",
            text: "Because `site` is missing. Starlight adds the @astrojs/sitemap integration itself unless your config already lists it, and that integration needs the deployed URL. It writes `sitemap-index.xml` and `sitemap-0.xml`; nothing is written at `/sitemap.xml`. The rest of the checklist is in [the Astro sitemap guide](/frameworks/astro/sitemap-not-working).",
          },
          {
            kind: "code",
            label: "astro.config.mjs",
            code: 'import { defineConfig } from "astro/config";\nimport starlight from "@astrojs/starlight";\n\nexport default defineConfig({\n  site: "https://docs.example.com",\n  integrations: [starlight({ title: "Example Docs" })],\n});',
          },
          {
            kind: "p",
            text: "Starlight's docs send you to Astro's for robots.txt: put the file in `public/`, with a Sitemap line that names the index.",
          },
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: *\nAllow: /\n\nSitemap: https://docs.example.com/sitemap-index.xml",
          },
        ],
      },
      {
        heading: "How do I add noindex or another tag to one page?",
        blocks: [
          {
            kind: "code",
            label: "src/content/docs/internal/migration.md",
            code: "---\ntitle: Migration notes (internal)\nhead:\n  - tag: meta\n    attrs:\n      name: robots\n      content: noindex\n---",
          },
          {
            kind: "p",
            text: "Starlight merges three layers in order: its defaults, the config's `head`, then the page's. A `<meta>` replaces an earlier one with the same `name`, `property` or `http-equiv`, and a canonical or sitemap link replaces the earlier one, so a page that sets its own canonical never ends up with two.",
          },
          {
            kind: "p",
            text: "Two frontmatter fields sound related and do something else. `pagefind: false` only removes the page from the site's own search box. `draft: true` leaves the page out of production builds entirely.",
          },
        ],
      },
      {
        heading: "Keep noindexed pages out of the sitemap",
        blocks: [
          {
            kind: "p",
            text: "The sitemap integration builds its list from routes and never sees your head tags, so the page above stays in `sitemap-0.xml`. Add the integration yourself with a `filter`, and Starlight skips its own copy. On a multilingual site, pass the `i18n` option as well: in 0.42.8 Starlight sets it only on the copy it adds.",
          },
          {
            kind: "code",
            label: "astro.config.mjs",
            code: 'import sitemap from "@astrojs/sitemap";\n\nexport default defineConfig({\n  site: "https://docs.example.com",\n  integrations: [\n    starlight({ title: "Example Docs" }),\n    sitemap({\n      filter: (page) => !page.startsWith("https://docs.example.com/internal/"),\n    }),\n  ],\n});',
          },
        ],
      },
      {
        heading: "How do I add an Open Graph image to Starlight?",
        blocks: [
          {
            kind: "p",
            text: "For one image on every page, declare it in the config's `head` with an absolute URL. A page that sets its own `og:image` in frontmatter replaces it, through the merge by `property` described above.",
          },
          {
            kind: "code",
            label: "astro.config.mjs",
            code: 'starlight({\n  title: "Example Docs",\n  head: [\n    { tag: "meta", attrs: { property: "og:image", content: "https://docs.example.com/og.png" } },\n  ],\n}),',
          },
          {
            kind: "p",
            text: "For an image per page that you generate at build time, route data middleware can push a tag into `starlightRoute.head`, the array of tags for the current page. Do one or the other: a tag pushed there is added after the merge, so a config default would give the page two `og:image` tags. Starlight's plugin directory also lists community plugins for this, starlight-seo (described as adding complete Open Graph tags) and starlight-myog (images generated by MyOG.social).",
          },
          {
            kind: "code",
            label: "src/routeData.ts (with routeMiddleware: \"./src/routeData.ts\")",
            code: 'import { defineRouteMiddleware } from "@astrojs/starlight/route-data";\n\nexport const onRequest = defineRouteMiddleware((context) => {\n  const route = context.locals.starlightRoute;\n  const name = route.id === "" ? "index" : route.id;\n  route.head.push({\n    tag: "meta",\n    attrs: { property: "og:image", content: "https://docs.example.com/og/" + name + ".png" },\n  });\n});',
          },
        ],
      },
      {
        heading: "The trailing slash in Starlight's canonical",
        blocks: [
          {
            kind: "p",
            text: "Starlight formats the canonical from Astro's settings: `trailingSlash: \"never\"` strips the slash, `\"always\"` and `\"ignore\"` add one, and `build.format: \"file\"` leaves the URL as built. If your host answers the page without the slash, set `\"never\"` so the canonical names the URL that returns a 200. [Trailing slashes](/guides/trailing-slash) covers how hosts treat both forms.",
          },
        ],
      },
    ],
    rules: ["framework-sitemap-missing", "framework-robots-no-sitemap", "meta-og-image-missing", "indexing-sitemap-hygiene"],
    sources: [
      { label: "Starlight docs, customization (enable sitemap)", url: "https://starlight.astro.build/guides/customization/", read: READ },
      { label: "Starlight docs, configuration reference (head, titleDelimiter)", url: "https://starlight.astro.build/reference/configuration/", read: READ },
      { label: "Starlight docs, frontmatter reference (head, pagefind, draft)", url: "https://starlight.astro.build/reference/frontmatter/", read: READ },
      { label: "Starlight docs, route data and route data reference", url: "https://starlight.astro.build/guides/route-data/", read: READ },
      { label: "Starlight docs, plugins and integrations", url: "https://starlight.astro.build/resources/plugins/", read: READ },
      { label: "Starlight 0.42.8 source, utils/head.ts", url: "https://github.com/withastro/starlight/blob/main/packages/starlight/src/utils/head.ts", read: READ },
      { label: "Starlight 0.42.8 source, utils/canonical.ts and src/index.ts (sitemap wiring)", url: "https://github.com/withastro/starlight/blob/main/packages/starlight/src/utils/canonical.ts", read: READ },
      { label: "Astro docs, @astrojs/sitemap (integration 3.7.4)", url: "https://docs.astro.build/en/guides/integrations-guide/sitemap/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "angular-seo",
    title: "Angular SEO: SSR, meta tags, robots.txt and sitemap",
    h1: "Angular SEO with @angular/ssr: meta tags, noindex, robots.txt and a sitemap",
    description:
      "Angular 22 SEO: prerender or server-render routes with @angular/ssr, set tags with Meta and Title, return a real 404, add robots.txt and a sitemap.",
    answer:
      "Without @angular/ssr, an Angular app sends crawlers an empty `<app-root>`. Run `ng add @angular/ssr`, then choose per route in `app.routes.server.ts`: Prerender for public pages, Server for per-request data, Client only behind a login. Set titles with the route `title` and tags with the `Meta` service, put robots.txt in `public/`, and write the sitemap yourself, since the CLI has no option for it.",
    sections: [
      {
        heading: "What a crawler receives from a client-rendered Angular app",
        blocks: [
          {
            kind: "p",
            text: "The Angular docs say it in their first line on rendering: applications ship client-side rendered by default. Every route answers with the same `index.html`, whose body holds an empty `<app-root>` until the scripts run. Googlebot queues pages that answer 200 for rendering and indexes what the scripts produce, after a wait Google describes as a few seconds or longer. A crawler that doesn't run JavaScript gets no text at all.",
          },
          {
            kind: "code",
            label: "index.html of a client-rendered build",
            code: "<body>\n  <app-root></app-root>\n  <!-- script tags added by the build -->\n</body>",
          },
        ],
      },
      {
        heading: "Prerender or server-render with @angular/ssr",
        blocks: [
          {
            kind: "p",
            text: "Add it with `ng add @angular/ssr` (or `ng new --ssr`). From then on Angular prerenders the whole app by default and also builds a server. Choose a mode per route:",
          },
          {
            kind: "code",
            label: "src/app/app.routes.server.ts",
            code: 'import { RenderMode, ServerRoute } from "@angular/ssr";\n\nexport const serverRoutes: ServerRoute[] = [\n  { path: "", renderMode: RenderMode.Prerender },\n  { path: "pricing", renderMode: RenderMode.Prerender },\n  {\n    path: "blog/:slug",\n    renderMode: RenderMode.Prerender,\n    getPrerenderParams: async () => [{ slug: "launch" }, { slug: "changelog" }],\n  },\n  { path: "account", renderMode: RenderMode.Client },\n  { path: "**", renderMode: RenderMode.Server, status: 404 },\n];',
          },
          {
            kind: "p",
            text: "The `status` property on the last entry makes every path the earlier entries don't match answer 404, so the not-found page stops being a [soft 404](/search-console/soft-404). Every real route then has to be listed above it. With `outputMode: \"static\"` in angular.json there is no server: you deploy prerendered HTML and the host decides the status of unknown paths.",
          },
          {
            kind: "p",
            text: "One documented side effect of prerendering: a route with `redirectTo` becomes an HTML page with a meta refresh, a soft redirect in Angular's words, while server rendering sends a real HTTP redirect. Declare permanent moves at the host ([meta refresh](/guides/meta-refresh)).",
          },
        ],
      },
      {
        heading: "Titles, meta tags and the canonical",
        blocks: [
          {
            kind: "p",
            text: "Give each route a `title` in app.routes.ts, or a resolver for dynamic ones. The `Meta` service edits `<meta>` tags, and in 22.2.4 `updateTag` creates the tag when none with the same `name` or `property` exists. `Meta` doesn't touch `<link>`, so the canonical goes through `DOCUMENT`:",
          },
          {
            kind: "code",
            label: "src/app/seo.service.ts",
            code: 'import { DOCUMENT, Injectable, inject } from "@angular/core";\nimport { Meta, Title } from "@angular/platform-browser";\n\nconst ORIGIN = "https://www.example.com";\n\n@Injectable({ providedIn: "root" })\nexport class Seo {\n  private meta = inject(Meta);\n  private title = inject(Title);\n  private doc = inject(DOCUMENT);\n\n  set(path: string, title: string, description: string, noindex = false) {\n    this.title.setTitle(title);\n    this.meta.updateTag({ name: "description", content: description });\n    this.meta.updateTag({ property: "og:image", content: ORIGIN + "/og.png" });\n    if (noindex) this.meta.updateTag({ name: "robots", content: "noindex" });\n    else this.meta.removeTag(\'name="robots"\');\n\n    let link = this.doc.head.querySelector<HTMLLinkElement>(\'link[rel="canonical"]\');\n    if (!link) {\n      link = this.doc.createElement("link");\n      link.rel = "canonical";\n      this.doc.head.appendChild(link);\n    }\n    link.href = ORIGIN + path;\n  }\n}',
          },
          {
            kind: "p",
            text: "The SSR guide's own canonical example appends a new `<link>` each time it runs, which stacks canonicals as a visitor navigates in the browser; the service above reuses the existing one. Build `path` from route params and a fixed origin rather than from the request, so a preview host never ends up in the tag.",
          },
        ],
      },
      {
        heading: "How do I add noindex to an Angular page?",
        blocks: [
          {
            kind: "p",
            text: "Call the service with `noindex` set to true from that route's component. On prerendered and server-rendered routes the tag is in the HTML the crawler downloads, which is where it needs to be.",
          },
          {
            kind: "p",
            text: "The reverse doesn't work: never ship `noindex` in `src/index.html` and plan to remove it in code. Google's JavaScript guide says that when Googlebot meets a noindex it may skip rendering, so the script that removes it never runs, and on client-rendered routes every URL shares that file. Test a deployed URL with the [noindex checker](/tools/noindex-checker).",
          },
        ],
      },
      {
        heading: "robots.txt and the sitemap",
        blocks: [
          {
            kind: "p",
            text: "The `public/` folder of a current CLI project is copied as is into the build, so `public/robots.txt` is served at `/robots.txt`. The application builder's options in Angular CLI 22.2.5 include nothing for sitemaps, and angular.dev itself generates its sitemap with a script in its deploy workflow. The simplest version writes `public/sitemap.xml` before `ng build`, from the same slugs that feed `getPrerenderParams`:",
          },
          {
            kind: "code",
            label: "scripts/sitemap.mjs (run before ng build)",
            code: 'import { writeFileSync } from "node:fs";\n\nconst ORIGIN = "https://www.example.com";\nconst routes = ["/", "/pricing", "/blog/launch", "/blog/changelog"];\n\nconst urls = routes.map((r) => "  <url><loc>" + ORIGIN + r + "</loc></url>").join("\\n");\nwriteFileSync(\n  "public/sitemap.xml",\n  \'<?xml version="1.0" encoding="UTF-8"?>\\n\' +\n    \'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n\' +\n    urls +\n    "\\n</urlset>\\n",\n);',
          },
          {
            kind: "p",
            text: "When the build has a server entry, the CLI also writes `prerendered-routes.json` at the root of the output folder, with the routes it prerendered; a post-build variant of the script can read it and write into the `browser` output folder instead.",
          },
        ],
      },
    ],
    rules: ["framework-js-only-content", "indexing-soft-404-site", "indexing-noindex", "framework-sitemap-missing"],
    sources: [
      { label: "Angular docs, server and hybrid rendering (@angular/ssr)", url: "https://angular.dev/guide/ssr", read: READ },
      { label: "Angular docs, Meta API", url: "https://angular.dev/api/platform-browser/Meta", read: READ },
      { label: "Angular docs, file structure (public folder)", url: "https://angular.dev/reference/configs/file-structure", read: READ },
      { label: "Angular 22.2.4 docs source, define routes (page titles)", url: "https://github.com/angular/angular/blob/v22.2.4/adev/src/content/guide/routing/define-routes.md", read: READ },
      { label: "Angular 22.2.4 source, platform-browser meta.ts (updateTag)", url: "https://github.com/angular/angular/blob/v22.2.4/packages/platform-browser/src/browser/meta.ts", read: READ },
      { label: "Angular CLI 22.2.5 source, application builder schema and execute-build.ts", url: "https://github.com/angular/angular-cli/blob/v22.2.5/packages/angular/build/src/builders/application/schema.json", read: READ },
      { label: "Google Search Central, JavaScript SEO basics", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "docusaurus-seo",
    title: "Docusaurus SEO: sitemap, trailingSlash and noIndex",
    h1: "Docusaurus SEO: the sitemap plugin, trailingSlash, noIndex and per-page metadata",
    description:
      "What Docusaurus 3 generates for SEO, the url and trailingSlash settings that break canonicals on GitHub Pages and Netlify, the sitemap and noindex.",
    answer:
      "Docusaurus 3.10 already writes a canonical, `og:url` and, through the sitemap plugin in preset-classic, a sitemap.xml on production builds, all from `url` and `baseUrl`. What breaks them: `url` left at the template's `https://your-docusaurus-site.example.com`, `noIndex: true` left on, and a `trailingSlash` that doesn't match how your host serves pages. Per page, set `description` and `image` in front matter.",
    sections: [
      {
        heading: "What Docusaurus already generates",
        blocks: [
          {
            kind: "list",
            items: [
              "A `<link rel=\"canonical\">` and an `og:url` on every page, built from `url`, `baseUrl` and the page path with `trailingSlash` applied (the `SiteMetadata` component in 3.10.2).",
              "`description` and `og:description` from the front matter `description`, which in the docs plugin defaults to the first line of the document.",
              "`og:image` and `twitter:image` from the front matter `image`, or site-wide from `themeConfig.image`, a path relative to `static/` that can't be an SVG. Both are made absolute with `url`.",
              "sitemap.xml from `@docusaurus/plugin-sitemap`, which preset-classic includes. It only runs on production builds, so the dev server never has one.",
            ],
          },
        ],
      },
      {
        heading: "Set url and baseUrl first",
        blocks: [
          {
            kind: "code",
            label: "docusaurus.config.js",
            code: 'export default {\n  url: "https://docs.example.com",\n  baseUrl: "/",\n  trailingSlash: false,\n  themeConfig: {\n    image: "img/social-card.png",\n  },\n};',
          },
          {
            kind: "p",
            text: "The classic template ships with `url: 'https://your-docusaurus-site.example.com'`. Left as is, every canonical, `og:url`, `og:image` and sitemap entry points at that placeholder. For a site served from `https://my-org.com/my-project/`, the deployment docs give `https://my-org.com/` as `url` and `/my-project/` as `baseUrl`.",
          },
        ],
      },
      {
        heading: "Why does trailingSlash matter with my host?",
        blocks: [
          {
            kind: "p",
            text: "With `trailingSlash` unset, Docusaurus keeps URLs as written and emits `/docs/myDoc.md` as `/docs/myDoc/index.html`. Links, the canonical and the sitemap say `/docs/myDoc`, while the file sits in a folder. The deployment docs note that GitHub Pages adds a trailing slash to Docusaurus URLs by default and recommend setting `trailingSlash` to `true` or `false` there, never leaving it undefined. Netlify also adds trailing slashes unless you turn off its Pretty URLs setting.",
          },
          {
            kind: "p",
            text: "When the host adds the slash with a redirect, every canonical and sitemap entry names a URL that redirects ([Page with redirect](/search-console/page-with-redirect) covers how Search Console reports it). `false` writes `/docs/myDoc.html` and links without the slash; `true` keeps the folder and adds the slash everywhere. Pick the form your host answers with a 200 ([trailing slashes](/guides/trailing-slash), [GitHub Pages](/hosting/github-pages)).",
          },
        ],
      },
      {
        heading: "The sitemap plugin's options",
        blocks: [
          {
            kind: "code",
            label: "docusaurus.config.js",
            code: 'presets: [\n  [\n    "@docusaurus/preset-classic",\n    {\n      sitemap: {\n        lastmod: "date",\n        changefreq: null,\n        priority: null,\n        ignorePatterns: ["/tags/**"],\n      },\n    },\n  ],\n],',
          },
          {
            kind: "p",
            text: "By default every URL gets `changefreq` weekly and `priority` 0.5, two fields Google ignores, so `null` removes them. `lastmod` is off by default; with `\"date\"` it comes from each page's last Git update, and the docs plugin warns that shallow clones break those dates, so fetch the full history in CI. In 3.10.2 the plugin also leaves out routes that match `ignorePatterns` and every route whose head declares noindex.",
          },
        ],
      },
      {
        heading: "noindex: the whole site, one page, or unlisted",
        blocks: [
          {
            kind: "list",
            items: [
              "`noIndex: true` in docusaurus.config.js adds `<meta name=\"robots\" content=\"noindex, nofollow\">` to every page and turns the sitemap off. Make sure the production config doesn't carry it.",
              "One page: a `<head>` block in the Markdown or MDX file. The sitemap plugin reads it and drops the route.",
              "`unlisted: true` in front matter: the page is built but hidden, not indexed, kept out of sitemaps, and reachable only by its URL. `draft: true` is different: the page exists only in development.",
            ],
          },
          {
            kind: "code",
            label: "docs/internal/oncall.md",
            code: '---\ndescription: How the on-call rotation works.\n---\n\n<head>\n  <meta name="robots" content="noindex" />\n</head>\n\n# On-call',
          },
          {
            kind: "p",
            text: "robots.txt goes in `static/robots.txt`, and the Docusaurus SEO page warns that it doesn't keep HTML pages out of the index; only `noIndex` or a robots meta tag does.",
          },
        ],
      },
      {
        heading: "Check a production build",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "npm run build && npm run serve\ncurl -s http://localhost:3000/docs/intro | grep -o '<link rel=\"canonical\"[^>]*>'\ncurl -s http://localhost:3000/sitemap.xml | grep -c '<loc>'\ncurl -sIL https://docs.example.com/docs/intro | grep -iE '^(HTTP|location)'",
          },
          {
            kind: "p",
            text: "The last command runs against the deployed site and should print one status line, a 200, for the exact URL the canonical names.",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-canonical-target-invalid", "indexing-sitemap-hygiene"],
    sources: [
      { label: "Docusaurus docs, search engine optimization", url: "https://docusaurus.io/docs/seo", read: READ },
      { label: "Docusaurus docs, docusaurus.config.js (url, baseUrl, noIndex, trailingSlash)", url: "https://docusaurus.io/docs/api/docusaurus-config", read: READ },
      { label: "Docusaurus docs, plugin-sitemap (3.10.2)", url: "https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-sitemap", read: READ },
      { label: "Docusaurus docs, deployment (trailing slashes, GitHub Pages, Netlify)", url: "https://docusaurus.io/docs/deployment", read: READ },
      { label: "Docusaurus docs, theme configuration (meta image)", url: "https://docusaurus.io/docs/api/themes/configuration", read: READ },
      { label: "Docusaurus docs, plugin-content-docs (front matter, unlisted)", url: "https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs", read: READ },
      { label: "Docusaurus docs, head metadata", url: "https://docusaurus.io/docs/markdown-features/head-metadata", read: READ },
      { label: "Docusaurus 3.10.2 source, SiteMetadata (canonical, og:url)", url: "https://github.com/facebook/docusaurus/blob/v3.10.2/packages/docusaurus-theme-classic/src/theme/SiteMetadata/index.tsx", read: READ },
      { label: "Docusaurus 3.10.2 source, plugin-sitemap createSitemap.ts", url: "https://github.com/facebook/docusaurus/blob/v3.10.2/packages/docusaurus-plugin-sitemap/src/createSitemap.ts", read: READ },
      { label: "Google Search Central, build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "vitepress-seo",
    title: "VitePress SEO: sitemap, canonical and og:image",
    h1: "VitePress SEO: sitemap.hostname, cleanUrls, canonical links and head tags",
    description:
      "VitePress writes no canonical or Open Graph tags. Turn on the sitemap with sitemap.hostname, add canonicals that match cleanUrls, avoid duplicate tags.",
    answer:
      "VitePress 1.6.4 writes a title, a description and a viewport tag, nothing else for search. Turn on the sitemap with `sitemap.hostname`, add `lastUpdated: true` for lastmod dates, and add the canonical and Open Graph tags yourself, from `transformPageData` or `head`. With `cleanUrls: true`, build canonicals without `.html` as well: the sitemap drops the extension, and both must name the same URL.",
    sections: [
      {
        heading: "What VitePress puts in the head by default",
        blocks: [
          {
            kind: "p",
            text: "In 1.6.4 the build writes `charset`, `viewport`, `<title>`, a `<meta name=\"description\">` (the page's, else the site's) and a generator tag, then your `head` entries. No canonical, no `og:*`, no `twitter:*`. The documentation at vitepress.dev already describes the 2.0 alpha, while npm's latest release is 1.6.4; everything below was checked against 1.6.4.",
          },
        ],
      },
      {
        heading: "How do I generate a sitemap in VitePress?",
        blocks: [
          {
            kind: "code",
            label: ".vitepress/config.ts",
            code: 'import { defineConfig } from "vitepress";\n\nexport default defineConfig({\n  lastUpdated: true,\n  cleanUrls: true,\n  sitemap: {\n    hostname: "https://docs.example.com",\n  },\n});',
          },
          {
            kind: "p",
            text: "Without `hostname`, the generator returns before writing anything. With a `base` such as `/my-site/`, append it to the hostname (`https://example.com/my-site/`). `<lastmod>` needs `lastUpdated: true`: the date then comes from the file's last Git commit, a page can opt out with `lastUpdated: false`, and the deploy guide's GitHub Actions example sets `fetch-depth: 0` on the checkout step for this feature. Every Markdown page goes in, noindexed ones included.",
          },
        ],
      },
      {
        heading: "How do I add a canonical URL in VitePress?",
        blocks: [
          {
            kind: "code",
            label: ".vitepress/config.ts",
            code: 'transformPageData(pageData) {\n  const canonical = ("https://docs.example.com/" + pageData.relativePath)\n    .replace(/index\\.md$/, "")\n    .replace(/\\.md$/, ""); // the docs use ".html" here, right only without cleanUrls\n\n  pageData.frontmatter.head ??= [];\n  pageData.frontmatter.head.push(["link", { rel: "canonical", href: canonical }]);\n},',
          },
          {
            kind: "p",
            text: "This is the example from the site config reference with one change. The reference replaces `.md` with `.html`, which fits only when `cleanUrls` is off. The sitemap builds its URLs from the same `cleanUrls` value, so the canonical and the sitemap now agree. `transformHead` could add the tag too, but it runs only during `vitepress build` and never in dev, so check canonicals in a build either way.",
          },
        ],
      },
      {
        heading: "cleanUrls and your host",
        blocks: [
          {
            kind: "p",
            text: "`cleanUrls: true` makes links and sitemap entries extension-less, and the host then has to answer `/foo` with the content of `/foo.html`, without a redirect. The routing guide says Netlify and GitHub Pages do this by default and Vercel needs `cleanUrls` in vercel.json ([Netlify](/hosting/netlify), [Vercel](/hosting/vercel)). When a visitor lands on a `.html` URL, the VitePress router redirects in the browser, a redirect that crawlers which don't run JavaScript never follow.",
          },
        ],
      },
      {
        heading: "How head tags merge, and the og:image attribute",
        blocks: [
          {
            kind: "p",
            text: "Frontmatter `head` is appended after the config's `head`. In the 1.6.4 source, `mergeHead` drops a config `<meta>` when the page declares a `<meta>` whose first attribute has the same name and value, so `property: og:image` written first on both sides gives one tag. Attribute order matters, and `<link>` tags are never merged: a canonical in the config plus one from the page means [two canonicals](/docs/issues/indexing-canonical-multiple).",
          },
          {
            kind: "code",
            label: "docs/pricing.md",
            code: "---\nhead:\n  - - meta\n    - property: og:image\n      content: https://docs.example.com/og/pricing.png\n---",
          },
          {
            kind: "p",
            text: "Write `property`, as the Open Graph protocol does. The site config reference writes its Open Graph samples with `name` (`og:title` in the 1.6.4 docs, `og:image` in the `transformHead` sample on vitepress.dev today), and Septune's og:image check, for one, only counts a tag written with `property`.",
          },
        ],
      },
      {
        heading: "Noindex a page and keep it out of the sitemap",
        blocks: [
          {
            kind: "code",
            label: ".vitepress/config.ts",
            code: 'const NOINDEX = ["internal/runbook.md"];\n\nexport default defineConfig({\n  cleanUrls: true,\n  sitemap: {\n    hostname: "https://docs.example.com",\n    transformItems: (items) =>\n      items.filter((item) => !NOINDEX.some((file) => item.url === file.replace(/\\.md$/, ""))),\n  },\n  transformPageData(pageData) {\n    if (NOINDEX.includes(pageData.relativePath)) {\n      pageData.frontmatter.head ??= [];\n      pageData.frontmatter.head.push(["meta", { name: "robots", content: "noindex" }]);\n    }\n  },\n});',
          },
          {
            kind: "p",
            text: "In 1.6.4, sitemap items carry the page path without a leading slash: `internal/runbook` with `cleanUrls`, `internal/runbook.html` without, and an `index.md` becomes its folder path ending in a slash. One list feeds both hooks, so the robots tag and the sitemap can't drift apart.",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-missing", "indexing-canonical-multiple", "meta-og-image-missing", "indexing-sitemap-hygiene"],
    sources: [
      { label: "VitePress docs, sitemap generation", url: "https://vitepress.dev/guide/sitemap-generation", read: READ },
      { label: "VitePress docs, site config (head, cleanUrls, transformHead, transformPageData)", url: "https://vitepress.dev/reference/site-config", read: READ },
      { label: "VitePress 1.6.4 source, build/generateSitemap.ts", url: "https://github.com/vuejs/vitepress/blob/v1.6.4/src/node/build/generateSitemap.ts", read: READ },
      { label: "VitePress 1.6.4 source, build/render.ts and shared/shared.ts (mergeHead)", url: "https://github.com/vuejs/vitepress/blob/v1.6.4/src/shared/shared.ts", read: READ },
      { label: "VitePress 1.6.4 docs source, routing (generating clean URLs)", url: "https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/guide/routing.md", read: READ },
      { label: "VitePress 1.6.4 docs source, frontmatter config and deploy guide", url: "https://github.com/vuejs/vitepress/blob/v1.6.4/docs/en/reference/frontmatter-config.md", read: READ },
      { label: "The Open Graph protocol", url: "https://ogp.me/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

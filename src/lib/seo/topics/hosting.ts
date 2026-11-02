import type { TopicPage } from "./types";

/**
 * Hosting hub: one page per host, each answering the queries developers type
 * about robots.txt, redirects, noindex and duplicate hostnames on that host.
 * Every fact comes from the host's docs (or the plugin source code, with its
 * version) read on 2026-11-02. Two observations come from curl requests made
 * the same day and are labelled as such in the text.
 *
 * Left out because no official page confirmed them: whether GitHub Pages
 * documents the github.io to custom-domain redirect (observed only), whether
 * Netlify redirects mysitename.netlify.app to the primary domain on its own,
 * whether Firebase preview channels or Amplify previews send a noindex header,
 * the exact status Amplify's `404-200` rule answers with, the status of
 * Amplify's default root-to-www redirect, and the status code of the 404.html
 * page on GitHub Pages and Cloudflare Pages.
 */

const READ = "2026-11-02";

export const HOSTING: TopicPage[] = [
  {
    hub: "hosting",
    slug: "github-pages",
    title: "GitHub Pages robots.txt, sitemap.xml and noindex",
    h1: "GitHub Pages SEO: robots.txt, sitemap.xml and noindex on a github.io site",
    description:
      "Why a GitHub Pages project site can't use its own robots.txt, how jekyll-sitemap and other generators publish a sitemap, and how to noindex a page.",
    answer:
      "Crawlers read robots.txt only at the root of a host, so a project site at `<owner>.github.io/<repo>` can't control it: that file comes from the user site, the `<owner>.github.io` repository. Use a custom domain, or a robots meta tag on each page. For the sitemap, Jekyll sites list `jekyll-sitemap` in `_config.yml`; other generators build one in a GitHub Actions workflow.",
    sections: [
      {
        heading: "Why doesn't my project site's robots.txt work?",
        blocks: [
          {
            kind: "p",
            text: "Google reads robots.txt only from the top-level directory of a host, and the rules cover that host, protocol and port alone. Its own table lists `https://example.com/folder/robots.txt` as not valid, because crawlers don't look in subdirectories. A project site lives at `https://<owner>.github.io/<repo>/`, so the robots.txt committed to its repository is served at `/<repo>/robots.txt`, where nothing reads it.",
          },
          {
            kind: "p",
            text: "The file that counts is `https://<owner>.github.io/robots.txt`, published by the user or organization site. If that repository doesn't exist, the URL answers 404, and Google treats any 4xx except 429 as if no robots.txt existed: everything may be crawled. That is the [missing robots.txt](/docs/issues/framework-robots-missing) case, and no commit to the project repository fixes it. Three ways to get control back:",
          },
          {
            kind: "list",
            items: [
              "Publish the user site and write the rules for every project there, for example `Disallow: /old-docs/` to cover the project named `old-docs`.",
              "Give the project a custom domain. It then sits at the root of its own host, and the robots.txt in its build output is the one crawlers fetch.",
              "Leave robots.txt alone and put a robots meta tag on the pages you want out of search, as in the next section.",
            ],
          },
          {
            kind: "p",
            text: "A custom domain on the user site changes the picture: GitHub then serves every project site of the same account under that domain by default (its example is `www.octocat.com/octo-project`), and the user site's robots.txt governs all of them. A project overrides this by setting a custom domain of its own.",
          },
        ],
      },
      {
        heading: "How do I noindex a page or a whole site on GitHub Pages?",
        blocks: [
          {
            kind: "p",
            text: "Google accepts noindex in two places, a `<meta name=\"robots\">` tag or an `X-Robots-Tag` response header. The GitHub Pages docs describe no file for setting response headers, so the meta tag is the one you control. In a Jekyll layout, print it from a front matter flag:",
          },
          {
            kind: "code",
            label: "_layouts/default.html",
            code: "<head>\n  {% if page.noindex %}\n  <meta name=\"robots\" content=\"noindex\">\n  {% endif %}\n</head>",
          },
          {
            kind: "code",
            label: "drafts/roadmap.md",
            code: "---\nlayout: default\nnoindex: true\nsitemap: false\n---",
          },
          {
            kind: "p",
            text: "`sitemap: false` is jekyll-sitemap's own switch, so the page also leaves the sitemap. Don't add a `Disallow` line for the same URL: a crawler blocked by robots.txt never fetches the page and never sees the tag. For a whole site, put the tag in the default layout, then run a few URLs through the [noindex checker](/tools/noindex-checker).",
          },
        ],
      },
      {
        heading: "How do I get a sitemap.xml with Jekyll on GitHub Pages?",
        blocks: [
          {
            kind: "code",
            label: "_config.yml",
            code: "url: \"https://octocat.github.io\"\nbaseurl: \"/my-project\"\nplugins:\n  - jekyll-sitemap",
          },
          {
            kind: "p",
            text: "GitHub Pages builds with Jekyll 3.10.0 and only the plugins on its supported list (github-pages gem 232), and jekyll-sitemap 1.4.0 is one of them. List it under `plugins`: the plugin's README warns that the GitHub Pages gem ignores plugins that only appear in the Gemfile.",
          },
          {
            kind: "p",
            text: "In its source (version 1.4.0) the plugin adds two files to the build when you haven't written them yourself: `sitemap.xml`, and a `robots.txt` whose single line is `Sitemap:` followed by the sitemap's absolute URL. On a project site both land under `/my-project/`. Submit that sitemap in Search Console; the generated robots.txt sits in a subdirectory, so crawlers skip it.",
          },
          {
            kind: "p",
            text: "During a Pages build, jekyll-github-metadata 2.16.1 fills in `url` and `baseurl` when they are missing, which is why absolute URLs come out right even without them. Set them anyway so a local `jekyll build` matches. The plugin that would date `<lastmod>` from the file system, jekyll-last-modified-at, isn't on the supported list, so a branch build takes the date from `last_modified_at` in front matter, or else from the post's date.",
          },
        ],
      },
      {
        heading: "What about Astro, Hugo or other generators?",
        blocks: [
          {
            kind: "p",
            text: "Publishing from a branch builds with Jekyll, and GitHub Pages can't build a site that needs an unsupported plugin. GitHub now recommends Actions for deploying Pages: your workflow builds the site with any tool, `actions/upload-pages-artifact@v4` uploads the output folder (a gzip archive holding one tar file, under 10 GB) and `actions/deploy-pages@v4` publishes it. GitHub offers workflow templates for the common generators. Whatever lands in the output folder, sitemap and robots.txt included, is what visitors and crawlers get.",
          },
          {
            kind: "p",
            text: "The URL prefix must still match where the site is served. Astro's deployment guide, for a project site:",
          },
          {
            kind: "code",
            label: "astro.config.mjs",
            code: "import { defineConfig } from \"astro/config\";\n\nexport default defineConfig({\n  site: \"https://astronaut.github.io\",\n  base: \"/my-repo\",\n});",
          },
          {
            kind: "p",
            text: "With a custom domain, set `site` to that domain and remove `base`. Astro's guide also has you add `public/CNAME`, while GitHub's docs say a custom Actions workflow ignores that file and doesn't need it, so set the domain under Settings > Pages either way. If the sitemap is missing after a deploy, [the Astro sitemap checklist](/frameworks/astro/sitemap-not-working) covers the usual causes.",
          },
        ],
      },
      {
        heading: "Custom domain, HTTPS, the old github.io URL and the 404 page",
        blocks: [
          {
            kind: "list",
            items: [
              "HTTPS: tick Enforce HTTPS under Settings > Pages and GitHub redirects every http:// request to https://. After you add a custom domain, the option can take up to 24 hours to become available.",
              "www and apex: with DNS records for both, GitHub creates the redirect between them. Set `www.example.com` as the custom domain and `example.com` redirects to it; set the apex and `www` redirects to the apex.",
              "The github.io address: GitHub's docs don't say what it does once a domain is set. A project site with a custom domain that we requested on 2026-11-02 answered 301 from its github.io path to the same path on its domain. Check yours rather than assume.",
              "404: a `404.html`, or a `404.md` with `permalink: /404.html` in its front matter, in the publishing source becomes the not-found page.",
            ],
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI http://www.example.com/ | grep -iE '^(HTTP|location)'\ncurl -sI https://octocat.github.io/my-project/about/ | grep -iE '^(HTTP|location)'\ncurl -s -o /dev/null -w '%{http_code}\\n' https://www.example.com/no-such-page\ncurl -s https://www.example.com/robots.txt",
          },
          {
            kind: "p",
            text: "Expect a redirect to https:// on the first line, a redirect to your domain on the second, a 404 on the third, and your own rules on the fourth.",
          },
        ],
      },
    ],
    rules: ["framework-robots-missing", "framework-sitemap-missing", "indexing-http-not-redirected", "indexing-noindex"],
    sources: [
      { label: "GitHub Docs, What is GitHub Pages? (site types and default URLs)", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages", read: READ },
      { label: "GitHub Docs, About custom domains and GitHub Pages", url: "https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages", read: READ },
      { label: "GitHub Docs, Managing a custom domain (CNAME file, Enforce HTTPS)", url: "https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site", read: READ },
      { label: "GitHub Docs, Securing your GitHub Pages site with HTTPS", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https", read: READ },
      { label: "GitHub Docs, About GitHub Pages and Jekyll (plugins)", url: "https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll", read: READ },
      { label: "GitHub Pages dependency versions (Jekyll 3.10.0, jekyll-sitemap 1.4.0)", url: "https://pages.github.com/versions/", read: READ },
      { label: "GitHub Docs, Using custom workflows with GitHub Pages", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages", read: READ },
      { label: "GitHub Docs, Creating a custom 404 page", url: "https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site", read: READ },
      { label: "jekyll-sitemap README", url: "https://github.com/jekyll/jekyll-sitemap", read: READ },
      { label: "jekyll-sitemap 1.4.0, lib/jekyll/jekyll-sitemap.rb (sitemap.xml and robots.txt)", url: "https://github.com/jekyll/jekyll-sitemap/blob/v1.4.0/lib/jekyll/jekyll-sitemap.rb", read: READ },
      { label: "jekyll-github-metadata 2.16.1, site_github_munger.rb (url and baseurl fallbacks)", url: "https://github.com/jekyll/github-metadata/blob/v2.16.1/lib/jekyll-github-metadata/site_github_munger.rb", read: READ },
      { label: "Astro docs, deploy your Astro site to GitHub Pages", url: "https://docs.astro.build/en/guides/deploy/github/", read: READ },
      { label: "Google Search Central, how Google interprets the robots.txt specification", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ },
      { label: "Google Search Central, block search indexing with noindex", url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "hosting",
    slug: "cloudflare-pages",
    title: "Cloudflare Pages robots.txt, www redirect, pages.dev",
    h1: "Cloudflare Pages SEO: robots.txt, the www redirect and the pages.dev copy",
    description:
      "What Cloudflare's managed robots.txt adds to yours, why _redirects can't send www to the apex, and how to keep pages.dev and previews out of Google.",
    answer:
      "Cloudflare Pages serves the robots.txt from your build output, but when Bot Preference Sync is on for the zone and an AI policy blocks, Cloudflare prepends its managed block to it. For www to apex, `_redirects` can't help: it has no domain-level redirects. Use a Bulk Redirect or a Single Redirect rule, and send `<project>.pages.dev` to your domain the same way.",
    sections: [
      {
        heading: "Where does robots.txt come from on Cloudflare Pages?",
        blocks: [
          {
            kind: "p",
            text: "From the build output. Put `robots.txt` in the folder your framework copies unchanged (`public/` in most of them) and Pages serves it as a static asset. One default breaks this: when the output has no top-level `404.html`, Pages assumes a single-page app and serves the root page for any path that doesn't match a static asset. A missing `/robots.txt` or `/sitemap.xml` then comes back as your homepage's HTML, which crawlers read as [a robots.txt made of HTML](/docs/issues/indexing-robots-html).",
          },
        ],
      },
      {
        heading: "What does Cloudflare's managed robots.txt add to mine?",
        blocks: [
          {
            kind: "p",
            text: "The setting belongs to the zone, not to Pages. Cloudflare prepends managed directives and its Content Signals Policy only when Enable Bot Preference Sync is on and at least one of the Search, Agent or Training policies is set to Block, Block on pages with ads or, for Training, Disallow. With every policy on allow, your file goes out unchanged. When your robots.txt answers 200, the managed block is placed above it; when you have none, Cloudflare serves a file of its own.",
          },
          {
            kind: "code",
            label: "robots.txt as served (Cloudflare's example, comments and some crawlers removed)",
            code: "# BEGIN Cloudflare Managed content\n\nUser-Agent: *\nContent-signal: search=yes, ai-train=no, use=reference\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\n# END Cloudflare Managed Content\nUser-agent: *\nDisallow: /drafts/\n\nSitemap: https://example.com/sitemap.xml",
          },
          {
            kind: "p",
            text: "The file now has two `User-agent: *` groups. Google combines all the groups that apply to a crawler into one, and the rule with the longest path wins, so your `Disallow: /drafts/` still beats the managed `Allow: /`. Google supports only `user-agent`, `allow`, `disallow` and `sitemap` and ignores invalid lines. Cloudflare warns that Search Console may report `Syntax not understood` for the `Content-signal` line and says it has seen no effect on crawling. Septune's robots.txt format check lists that line as well, since it reports any directive outside the classic set.",
          },
        ],
      },
      {
        heading: "How do I redirect www to non-www on Cloudflare Pages?",
        blocks: [
          {
            kind: "p",
            text: "Not with `_redirects`. Cloudflare's feature table marks domain-level redirects as unsupported there, and a `_redirects` line without a status code answers 302, a temporary redirect. Redirects between hostnames run in the zone, in front of Pages, and they need the source hostname's DNS record to be proxied through Cloudflare.",
          },
          {
            kind: "list",
            items: [
              "Bulk Redirects, the method in the Pages docs: a list entry with source `www.example.com`, target `https://example.com`, status 301 and the parameters Preserve query string, Subpath matching, Preserve path suffix and Include subdomains; a Bulk Redirect rule that uses the list; then a proxied `A` record for `www` (the docs use `192.0.2.1`).",
              "A Single Redirect, Cloudflare's other example: wildcard pattern `https://www.*` on the request URL, target `https://${1}`, status 301, query string preserved.",
              "Page Rules: Cloudflare's docs label them deprecated, and the newer rule types take precedence over them. Don't start a new redirect there.",
            ],
          },
          {
            kind: "p",
            text: "For apex to www, swap the source and the target. Then request an inner page with a query string and check that both survive:",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI 'https://www.example.com/pricing?ref=mail' | grep -iE '^(HTTP|location)'\n# expect 301 and location: https://example.com/pricing?ref=mail",
          },
        ],
      },
      {
        heading: "How do I keep pages.dev and preview deployments out of Google?",
        blocks: [
          {
            kind: "p",
            text: "Production is also served at `<project>.pages.dev`. Cloudflare's how-to redirects it with the same kind of Bulk Redirect: source `<project>.pages.dev`, target `https://example.com`, status 301, same four parameters. Read Include subdomains before you tick it. Cloudflare defines it as applying the source hostname to any subdomain, and previews live on subdomains of `<project>.pages.dev` (a hash-based one, plus a branch alias such as `fix-api.<project>.pages.dev`). With it on, previews redirect to production too.",
          },
          {
            kind: "p",
            text: "Previews are already covered for indexing: every preview deployment gets an `X-Robots-Tag: noindex` header by default, while the production pages.dev hostname and custom domains don't. They stay public, though, unless a Cloudflare Access policy restricts them to your account. To keep pages.dev reachable instead of redirecting it, `_headers` accepts absolute URLs with placeholders:",
          },
          {
            kind: "code",
            label: "_headers",
            code: "https://:project.pages.dev/*\n  X-Robots-Tag: noindex",
          },
          {
            kind: "p",
            text: "`_headers` rules don't reach responses generated by Pages Functions, which have to set their own headers. The redirect remains the stronger fix, since Google takes a permanent redirect as a strong sign that the target is the canonical URL. Header-based noindex in general is covered in [the X-Robots-Tag guide](/guides/x-robots-tag).",
          },
        ],
      },
      {
        heading: "404 pages, the SPA fallback and trailing slashes",
        blocks: [
          {
            kind: "p",
            text: "Pages looks for the closest `404.html`, walking up from the requested directory to `/404.html`, so `/blog/404.html` can serve the blog alone. Without a top-level one, the single-page-app fallback answers every unknown URL with the root page, and Google files those URLs as [soft 404s](/search-console/soft-404). HTML routes are served without their extension: `/contact.html` redirects to `/contact`, and `/about/index.html` to `/about/`.",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -s -o /dev/null -w '%{http_code}\\n' https://example.com/no-such-page\ncurl -sI https://example.com/robots.txt | grep -iE '^(HTTP|content-type)'",
          },
        ],
      },
      {
        heading: "Should a new site use Pages or Workers?",
        blocks: [
          {
            kind: "p",
            text: "Cloudflare's Pages docs now open with a notice that Workers supports most Pages use cases and that new projects should start on Workers. Static assets on Workers read the same `_headers` and `_redirects` files. The not-found behaviour, which Pages guessed from your files, is set explicitly in the Wrangler configuration:",
          },
          {
            kind: "code",
            label: "wrangler.jsonc",
            code: "{\n  \"name\": \"my-site\",\n  \"compatibility_date\": \"2026-11-02\",\n  \"assets\": {\n    \"directory\": \"./dist/\",\n    \"not_found_handling\": \"404-page\"\n  }\n}",
          },
          {
            kind: "p",
            text: "The other value, `\"single-page-application\"`, brings back the Pages-style fallback and its soft-404 effect.",
          },
        ],
      },
    ],
    rules: ["indexing-robots-format", "indexing-robots-html", "indexing-host-duplicate", "indexing-soft-404-site"],
    sources: [
      { label: "Cloudflare Pages docs, Serving Pages (route matching, 404, SPA fallback, preview header)", url: "https://developers.cloudflare.com/pages/configuration/serving-pages/", read: READ },
      { label: "Cloudflare Pages docs, Preview deployments", url: "https://developers.cloudflare.com/pages/configuration/preview-deployments/", read: READ },
      { label: "Cloudflare Pages docs, Headers (_headers)", url: "https://developers.cloudflare.com/pages/configuration/headers/", read: READ },
      { label: "Cloudflare Pages docs, Redirects (_redirects)", url: "https://developers.cloudflare.com/pages/configuration/redirects/", read: READ },
      { label: "Cloudflare Pages docs, Redirecting www to domain apex", url: "https://developers.cloudflare.com/pages/how-to/www-redirect/", read: READ },
      { label: "Cloudflare Pages docs, Redirecting *.pages.dev to a custom domain", url: "https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/", read: READ },
      { label: "Cloudflare Rules docs, Bulk Redirects parameters", url: "https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/parameters/", read: READ },
      { label: "Cloudflare Rules docs, URL forwarding (Single and Bulk Redirects)", url: "https://developers.cloudflare.com/rules/url-forwarding/", read: READ },
      { label: "Cloudflare Rules docs, Redirect from WWW to root", url: "https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/", read: READ },
      { label: "Cloudflare Rules docs, Page Rules (deprecated)", url: "https://developers.cloudflare.com/rules/page-rules/", read: READ },
      { label: "Cloudflare Bots docs, robots.txt setting (managed robots.txt)", url: "https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/", read: READ },
      { label: "Cloudflare Pages docs (notice recommending Workers)", url: "https://developers.cloudflare.com/pages/", read: READ },
      { label: "Cloudflare Workers docs, Migrate from Pages to Workers", url: "https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/", read: READ },
      { label: "Google Search Central, how Google interprets the robots.txt specification", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ },
      { label: "Google Search Central, redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "hosting",
    slug: "netlify",
    title: "Netlify noindex, robots.txt and the www redirect",
    h1: "Netlify noindex: netlify.toml headers, deploy previews, robots.txt and www",
    description:
      "Add X-Robots-Tag noindex on Netlify without noindexing production, which deploys Netlify already marks noindex, and how www and netlify.app redirect.",
    answer:
      "For one path, add `X-Robots-Tag = \"noindex\"` under `[[headers]]` in netlify.toml or in a `_headers` file. Both apply to every deploy, production included, because headers aren't context-aware. Netlify already sends noindex on Deploy Previews and older branch deploys, not on a branch's latest deploy. Set the primary domain and Netlify redirects between www and the apex itself.",
    sections: [
      {
        heading: "How do I set noindex in netlify.toml?",
        blocks: [
          {
            kind: "code",
            label: "netlify.toml",
            code: "[[headers]]\n  for = \"/drafts/*\"\n  [headers.values]\n    X-Robots-Tag = \"noindex\"",
          },
          {
            kind: "code",
            label: "_headers (same rule, in the publish directory)",
            code: "/drafts/*\n  X-Robots-Tag: noindex",
          },
          {
            kind: "p",
            text: "Custom headers only apply to files Netlify serves from its own store. A page rendered by a function or an edge function (server-side rendering) or proxied from elsewhere doesn't get them, so that code has to return the header itself. A `_headers` file must end up in the deployed folder, and Jekyll drops files whose name starts with `_` unless `_config.yml` lists them under `include`. Run a URL through the [noindex checker](/tools/noindex-checker) after deploying.",
          },
        ],
      },
      {
        heading: "Why a header in netlify.toml also noindexes production",
        blocks: [
          {
            kind: "p",
            text: "`[build]` and `[[plugins]]` take per-context overrides; `[[headers]]` and `[[redirects]]` don't. A `for = \"/*\"` noindex added to keep a staging branch out of search ships with every deploy, production included, and Netlify says the same of `_headers`: those headers are global for all builds. Its workaround is one header file per context, copied into the publish directory by that context's build command:",
          },
          {
            kind: "code",
            label: "netlify.toml",
            code: "# Branch deploys only. Replace npm run build and dist with your own.\n[context.branch-deploy]\n  command = \"npm run build && cp ./custom-headers/_noindexHeaders ./dist/_headers\"",
          },
          {
            kind: "code",
            label: "custom-headers/_noindexHeaders",
            code: "/*\n  X-Robots-Tag: noindex",
          },
          {
            kind: "p",
            text: "It only works once the global declarations are gone: Netlify's steps begin by removing header rules from netlify.toml and any `_headers` file from the publish directory. Deploy the branch, then read the header on both the branch URL and production before you rely on it.",
          },
        ],
      },
      {
        heading: "Which Netlify deploys already send X-Robots-Tag: noindex?",
        blocks: [
          {
            kind: "list",
            items: [
              "Deploy Previews, such as `deploy-preview-42--mysitename.netlify.app`: yes.",
              "Older branch deploys: yes.",
              "The latest deploy of each branch, such as `staging--mysitename.netlify.app`: no, on purpose, so a branch can serve as a public version of the site.",
              "Production, on your domain and on `mysitename.netlify.app`: Netlify describes the header for previews and older branch deploys only.",
            ],
          },
          {
            kind: "p",
            text: "Netlify adds that the header is no guarantee and recommends restricting access instead: a private project (Credit-based plans only) or Password Protection on non-production deploys. A branch deploy left public is the usual way [a staging site ends up indexed](/guides/staging-site-indexed).",
          },
        ],
      },
      {
        heading: "Where does robots.txt go on Netlify?",
        blocks: [
          {
            kind: "p",
            text: "In the publish directory, like any static file. Netlify won't shadow a file that exists, so even the single-page-app rewrite `/*  /index.html  200` leaves a real `robots.txt` alone. Without one, the same rule answers `/robots.txt` with your `index.html`, and Netlify's docs spell out what it does to every other path: it serves index.html instead of a 404, whatever URL the browser requests.",
          },
          {
            kind: "p",
            text: "Netlify picks up a `404.html` in the publish directory automatically for paths that don't resolve to a file, and a section can have its own with a rule such as `/en/*  /en/404.html  404`. For an app, narrow the rewrite to the paths it routes on the client so the rest can reach that page.",
          },
          {
            kind: "p",
            text: "Each deploy context builds its own copy of robots.txt and serves it on its own hostname, where its rules apply. To keep a branch deploy out of search, send it the noindex header from the previous section rather than `Disallow: /`, because Google only sees a noindex on pages it is allowed to crawl.",
          },
        ],
      },
      {
        heading: "How do I redirect www to the apex, or the reverse, on Netlify?",
        blocks: [
          {
            kind: "p",
            text: "Pick the primary domain under Domain management > Production domains. When it is the apex or `www`, Netlify lists both and redirects the other one to it automatically. With external DNS, Netlify strongly recommends `www` (or another subdomain) as the primary domain, and Netlify DNS if you want the apex. Other subdomains get no automatic redirect. To send one of them, or a domain alias, to the primary domain, write a domain-level rule; it only works for domains assigned to the site.",
          },
          {
            kind: "code",
            label: "_redirects",
            code: "https://blog.example.com/*  https://www.example.com/blog/:splat  301!\nhttps://old-brand.com/*     https://www.example.com/:splat       301!",
          },
          {
            kind: "p",
            text: "A rule without a code answers 301; 302 is the temporary option, and 307 isn't supported. The `!` forces the rule even where a file exists at the path, and Netlify notes that http and https need separate rules unless HTTPS is forced. Pretty URLs, on by default, forwards `/about` to `/about/` and rewrites `/about.html` to `/about/`; a redirect rule can't add or remove a trailing slash ([choosing one form](/guides/trailing-slash)).",
          },
          {
            kind: "p",
            text: "`mysitename.netlify.app` keeps working after you add a custom domain. Netlify's own docs site answered 301 from `docs.netlify.app` to `docs.netlify.com`, path included, when we requested it on 2026-11-02. If yours answers 200, a domain-level rule with the netlify.app hostname as its source is the pattern to try; Netlify's docs only show that pattern for custom subdomains, so confirm the 301 with curl after deploying.",
          },
        ],
      },
      {
        heading: "Check it from the terminal",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "# The preview should carry the header, production should not\ncurl -sI https://deploy-preview-42--mysitename.netlify.app/ | grep -i x-robots-tag\ncurl -sI https://www.example.com/ | grep -i x-robots-tag\n\n# The spare hostname should answer 301 to the primary domain\ncurl -sI https://example.com/pricing | grep -iE '^(HTTP|location)'\n\n# A missing page should answer 404\ncurl -s -o /dev/null -w '%{http_code}\\n' https://www.example.com/no-such-page",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-host-duplicate", "indexing-soft-404-site", "indexing-robots-html"],
    sources: [
      { label: "Netlify Docs, Custom headers", url: "https://docs.netlify.com/manage/routing/headers/", read: READ },
      { label: "Netlify Docs, File-based configuration (deploy contexts)", url: "https://docs.netlify.com/build/configure-builds/file-based-configuration/", read: READ },
      { label: "Netlify Docs, Deploy overview (search engine indexing)", url: "https://docs.netlify.com/deploy/deploy-overview/", read: READ },
      { label: "Netlify Docs, Deploy Previews", url: "https://docs.netlify.com/deploy/deploy-types/deploy-previews/", read: READ },
      { label: "Netlify Docs, Understand domains (netlify.app subdomain and deploy URLs)", url: "https://docs.netlify.com/manage/domains/domains-fundamentals/understand-domains/", read: READ },
      { label: "Netlify Docs, Manage multiple domains (primary domain, www and apex)", url: "https://docs.netlify.com/manage/domains/manage-domains/manage-multiple-domains/", read: READ },
      { label: "Netlify Docs, Add a domain alias", url: "https://docs.netlify.com/manage/domains/configure-domains/add-a-domain-alias/", read: READ },
      { label: "Netlify Docs, Redirect options (status codes, 404, domain-level, trailing slash)", url: "https://docs.netlify.com/manage/routing/redirects/redirect-options/", read: READ },
      { label: "Netlify Docs, Rewrites and proxies (single-page apps, shadowing)", url: "https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/", read: READ },
      { label: "Google Search Central, block search indexing with noindex", url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "hosting",
    slug: "vercel",
    title: "Is Vercel SEO friendly? Previews, vercel.app, sitemap",
    h1: "Is Vercel SEO-friendly? What it sends crawlers, and the settings left to you",
    description:
      "What Vercel does for SEO on its own (HTTPS, noindex on previews), the vercel.app duplicate to redirect, www redirect codes, trailingSlash and sitemaps.",
    answer:
      "Vercel handles the platform side: HTTP redirects to HTTPS with a 308, and preview and outdated production deployments get `X-Robots-Tag: noindex`. Three things are left to you: redirecting `your-project.vercel.app` to your domain, choosing one trailing-slash form with `trailingSlash`, and generating the sitemap, which is your framework's job.",
    sections: [
      {
        heading: "What does Vercel do for SEO on its own?",
        blocks: [
          {
            kind: "list",
            items: [
              "HTTPS: the CDN answers any http:// request with a 308 to https://, and Vercel says this can't be turned off.",
              "HSTS: responses carry `strict-transport-security: max-age=63072000` (two years) by default. The `.vercel.app` domain and its subdomains are preloaded; a custom domain gets HSTS for that one hostname.",
              "Noindex where it belongs: `X-Robots-Tag: noindex` on preview deployments, and on old production deployments once you promote a new one.",
              "URL clean-up: double slashes collapse with a 308 (`/blog//post` to `/blog/post`). Case is left alone, so `/About` and `/about` are two different paths.",
            ],
          },
          {
            kind: "p",
            text: "Titles, canonicals and the sitemap come from your framework. The sections below cover what Vercel leaves to you.",
          },
        ],
      },
      {
        heading: "Which Vercel deployments get X-Robots-Tag: noindex?",
        blocks: [
          {
            kind: "p",
            text: "Preview deployments and outdated production deployments, by default. Vercel's response-headers reference names two ways the header leaves a preview: assigning a domain to its branch, or overriding it in vercel.json. The first one surprises teams. A `staging.example.com` attached to a branch is treated as an environment you want reachable, so it goes out without noindex and can be indexed. Put the header back for that host:",
          },
          {
            kind: "code",
            label: "vercel.json",
            code: "{\n  \"headers\": [\n    {\n      \"source\": \"/(.*)\",\n      \"has\": [{ \"type\": \"host\", \"value\": \"staging.example.com\" }],\n      \"headers\": [{ \"key\": \"X-Robots-Tag\", \"value\": \"noindex\" }]\n    }\n  ]\n}",
          },
          {
            kind: "p",
            text: "Vercel's guide prefers the framework when it can set headers, keyed on `VERCEL_ENV` being `preview`; in Next.js that is the `headers()` function from [the Next.js noindex guide](/frameworks/nextjs/noindex). A noindex hides nothing from people, and [a staging site can still end up indexed](/guides/staging-site-indexed) through other routes. Deployment Protection is the lock: Standard Protection, the recommended level and available on all plans, protects every domain except production domains.",
          },
        ],
      },
      {
        heading: "How do I stop your-project.vercel.app competing with my domain?",
        blocks: [
          {
            kind: "p",
            text: "Both hostnames serve the same production pages. Vercel's docs say duplicates don't bring an automatic penalty but can split signals and lead search engines to pick another canonical, and they give a host-scoped permanent redirect:",
          },
          {
            kind: "code",
            label: "vercel.json",
            code: "{\n  \"redirects\": [\n    {\n      \"source\": \"/:path*\",\n      \"has\": [{ \"type\": \"host\", \"value\": \"your-project\\\\.vercel\\\\.app\" }],\n      \"destination\": \"https://www.example.com/:path*\",\n      \"permanent\": true\n    }\n  ]\n}",
          },
          {
            kind: "p",
            text: "It answers 308 with the path kept, and matching the exact hostname leaves preview URLs alone. The firewall rule the docs offer as a no-redeploy alternative sends a 307, which Google treats as temporary and doesn't use to pick the canonical. If both hostnames must stay public, give each page an absolute canonical pointing at its own URL on your domain, never at the homepage ([how in Next.js](/frameworks/nextjs/canonical-url)).",
          },
        ],
      },
      {
        heading: "www or apex: domain redirects and their status codes",
        blocks: [
          {
            kind: "p",
            text: "Under Project Settings > Domains, select Edit on the domain to redirect from and pick the target in Redirect to. Vercel recommends `www` as the primary domain with the apex redirecting to it: DNS forbids a CNAME on an apex, and the `www` setup gives its CDN more control. It also attempts the www redirect automatically, and still advises adding it explicitly.",
          },
          {
            kind: "p",
            text: "The project-domain API accepts 301, 302, 307 or 308 for a domain redirect. Use 301 or 308: Google reads both as permanent and takes the target as canonical, which it doesn't do after a 302 or 307.",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI https://example.com/docs | grep -iE '^(HTTP|location)'\n# expect 301 or 308, location: https://www.example.com/docs",
          },
        ],
      },
      {
        heading: "trailingSlash and cleanUrls in vercel.json",
        blocks: [
          {
            kind: "p",
            text: "`trailingSlash` has no default value. Left unset, `/about` and `/about/` both answer 200 without a redirect, which Vercel's own reference advises against because search engines may index both. `false` sends a 308 from `/about/` to `/about`; `true` sends one the other way, except for paths with a file extension such as `/about/styles.css`.",
          },
          {
            kind: "code",
            label: "vercel.json",
            code: "{\n  \"trailingSlash\": false,\n  \"cleanUrls\": true\n}",
          },
          {
            kind: "p",
            text: "`cleanUrls` drops `.html` (and function file extensions): `/about.html` answers 308 to `/about`. Vercel notes that with Next.js, routes configured this way return 404 under `vercel dev` while working once deployed. [The trailing slash guide](/guides/trailing-slash) helps choose a form.",
          },
        ],
      },
      {
        heading: "Does Vercel generate a sitemap?",
        blocks: [
          {
            kind: "p",
            text: "Your framework does, and Vercel serves the result. In the Next.js App Router, `app/sitemap.ts` returns a `MetadataRoute.Sitemap` array and the output is served at `/sitemap.xml`, cached by default unless it uses a request-time API or a dynamic config option. Every `url` in it should be on your custom domain, not on a `vercel.app` hostname. On a preview, the sitemap response carries the preview's noindex header like everything else there.",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-host-duplicate", "indexing-canonical-missing", "framework-sitemap-missing"],
    sources: [
      { label: "Vercel docs, Response headers (x-robots-tag, HSTS)", url: "https://vercel.com/docs/headers/response-headers", read: READ },
      { label: "Vercel Knowledge Base, Are Vercel Preview Deployments indexed by search engines?", url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines", read: READ },
      { label: "Vercel docs, Redirects (vercel.app hostname, status codes, URL normalization)", url: "https://vercel.com/docs/routing/redirects", read: READ },
      { label: "Vercel docs, Deploying and redirecting domains", url: "https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting", read: READ },
      { label: "Vercel REST API, add a domain to a project (redirectStatusCode)", url: "https://vercel.com/docs/rest-api/reference/endpoints/projects/add-a-domain-to-a-project", read: READ },
      { label: "Vercel docs, vercel.json (trailingSlash, cleanUrls, headers)", url: "https://vercel.com/docs/project-configuration/vercel-json", read: READ },
      { label: "Vercel docs, Deployment Protection", url: "https://vercel.com/docs/deployment-protection", read: READ },
      { label: "Vercel docs, Encryption (HTTP to HTTPS redirect, HSTS)", url: "https://vercel.com/docs/cdn-security/encryption", read: READ },
      { label: "Next.js docs, sitemap.xml", url: "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap", read: READ },
      { label: "Google Search Central, redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "hosting",
    slug: "firebase",
    title: "Firebase Hosting SEO: robots.txt, redirects, web.app",
    h1: "Firebase Hosting SEO: robots.txt, firebase.json redirects and the web.app copy",
    description:
      "How firebase.json shapes SEO on Firebase Hosting: the app rewrite that answers every URL and robots.txt, 301 redirects, cleanUrls and the web.app copy.",
    answer:
      "Put robots.txt and the sitemap in the public directory: Hosting serves exact-match files before rewrites. The usual damage comes from the single-page-app rewrite of `\"**\"` to `/index.html`, which serves your app for every missing URL, so the custom 404.html never shows. Your site also stays live on `web.app` and `firebaseapp.com`, so set absolute canonicals.",
    sections: [
      {
        heading: "Where do robots.txt and sitemap.xml go on Firebase Hosting?",
        blocks: [
          {
            kind: "p",
            text: "In the `public` directory named in firebase.json, the folder you deploy. When configuration options overlap, Hosting answers in a fixed order:",
          },
          {
            kind: "list",
            items: [
              "Reserved paths under `/__/`",
              "Configured redirects",
              "Exact-match static content",
              "Configured rewrites",
              "Custom 404 page",
              "Default 404 page",
            ],
          },
          {
            kind: "p",
            text: "A real `robots.txt` therefore wins over any rewrite. A missing one falls through to the rewrites, and with the usual app rule it is answered with `index.html`: crawlers get [HTML where they expect rules](/docs/issues/indexing-robots-html), and `/sitemap.xml` gets the same treatment. Make both files part of the build so every deploy has them.",
          },
        ],
      },
      {
        heading: "Why does every missing URL return my app?",
        blocks: [
          {
            kind: "code",
            label: "firebase.json",
            code: "{\n  \"hosting\": {\n    \"public\": \"dist\",\n    \"rewrites\": [ {\n      \"source\": \"**\",\n      \"destination\": \"/index.html\"\n    } ]\n  }\n}",
          },
          {
            kind: "p",
            text: "This is the rewrite from Firebase's configuration docs. Hosting applies a rewrite only when no file exists at the path, so assets still load, but every path without a file gets the app. Rewrites rank above the custom 404 page, so `404.html` is never served, and Google ends up classing mistyped and deleted URLs as [soft 404s](/search-console/soft-404).",
          },
          {
            kind: "p",
            text: "Narrow the rewrite to the paths the app routes on the client, so everything else falls through to `404.html`:",
          },
          {
            kind: "code",
            label: "firebase.json",
            code: "\"rewrites\": [ {\n  \"source\": \"/app{,/**}\",\n  \"destination\": \"/index.html\"\n} ]",
          },
          {
            kind: "p",
            text: "The `{,/**}` glob matches `/app` and everything below it, as in Firebase's own `/foo{,/**}` example. Pages meant to rank do better prerendered to HTML files, which Hosting serves as exact matches.",
          },
        ],
      },
      {
        heading: "How do I add 301 redirects in firebase.json?",
        blocks: [
          {
            kind: "code",
            label: "firebase.json",
            code: "\"redirects\": [ {\n  \"source\": \"/blog/:post*\",\n  \"destination\": \"/articles/:post\",\n  \"type\": 301\n}, {\n  \"source\": \"/old-pricing\",\n  \"destination\": \"/pricing\",\n  \"type\": 301\n} ]",
          },
          {
            kind: "p",
            text: "`type` takes 301 for a permanent move and 302 for a temporary one. The first matching rule wins, and redirects run before static files, so a redirect fires even if the old file is still deployed. Firebase compares `source` and `regex` against the URL path only. The hostname never enters the match, so firebase.json can't send `web.app` traffic to your domain.",
          },
        ],
      },
      {
        heading: "cleanUrls and trailingSlash",
        blocks: [
          {
            kind: "code",
            label: "firebase.json",
            code: "\"hosting\": {\n  \"cleanUrls\": true,\n  \"trailingSlash\": false\n}",
          },
          {
            kind: "p",
            text: "`cleanUrls: true` serves `about.html` at `/about` and answers a request for `/about.html` with a 301 to `/about`. `trailingSlash: false` redirects `/about/` to `/about`, `true` does the reverse, and leaving it out keeps a slash only for directory index files such as `about/index.html`. `trailingSlash` doesn't apply to rewrites to Cloud Functions or Cloud Run.",
          },
        ],
      },
      {
        heading: "What about web.app, firebaseapp.com and preview channels?",
        blocks: [
          {
            kind: "p",
            text: "Every live deploy goes to `SITE_ID.web.app`, `SITE_ID.firebaseapp.com` and each connected custom domain. The custom domain wizard has an optional box that redirects one of `example.com` and `www.example.com` to the other, but firebase.json has no hostname rules for the two default subdomains. Give every page an absolute `rel=\"canonical\"` on your domain: Google treats it as a strong signal and recommends absolute URLs there, which settles [duplicates without a canonical](/search-console/duplicate-without-canonical).",
          },
          {
            kind: "p",
            text: "Preview channels deploy to `PROJECT_ID--CHANNEL_ID-RANDOM_HASH.web.app`. Firebase calls those URLs public, hard to guess but open to anyone who has one, and they expire after 7 days unless you pass `--expires` (30 days at most). The Hosting docs don't mention a noindex header on them, so request one with curl. A header rule in firebase.json can't single them out either, since header patterns also match paths alone.",
          },
        ],
      },
      {
        heading: "Check the deployed site",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "# robots.txt: a 200 with text/plain, not text/html\ncurl -sI https://www.example.com/robots.txt | grep -iE '^(HTTP|content-type)'\n\n# A URL that can't exist: 404, not 200\ncurl -s -o /dev/null -w '%{http_code}\\n' https://www.example.com/no-such-page\n\n# A redirect from firebase.json\ncurl -sI https://www.example.com/old-pricing | grep -iE '^(HTTP|location)'\n\n# The canonical served on the default hostname\ncurl -s https://SITE_ID.web.app/pricing | grep -io '<link[^>]*canonical[^>]*>'",
          },
        ],
      },
    ],
    rules: ["indexing-soft-404-site", "indexing-robots-html", "framework-sitemap-missing", "indexing-canonical-missing"],
    sources: [
      { label: "Firebase docs, Configure Hosting behavior (firebase.json)", url: "https://firebase.google.com/docs/hosting/full-config", read: READ },
      { label: "Firebase docs, Test locally, then preview and deploy", url: "https://firebase.google.com/docs/hosting/test-preview-deploy", read: READ },
      { label: "Firebase docs, Manage live and preview channels", url: "https://firebase.google.com/docs/hosting/manage-hosting-resources", read: READ },
      { label: "Firebase docs, Connect a custom domain", url: "https://firebase.google.com/docs/hosting/custom-domain", read: READ },
      { label: "Google Search Central, how to specify a canonical URL", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls", read: READ },
      { label: "Google Search Central, how Google interprets the robots.txt specification", url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "hosting",
    slug: "aws-amplify",
    title: "AWS Amplify redirect www to non-www, with a 301",
    h1: "AWS Amplify: redirect www to non-www (or the reverse) with a permanent 301",
    description:
      "Amplify redirects the root domain to www by default. How to flip it with a domain-level 301 rule, the 302 trap in the docs, and the amplifyapp.com copy.",
    answer:
      "Amplify redirects the root domain to www by default when you connect a domain. To go the other way, change that default under Hosting > Rewrites and redirects and add a domain-level rule: source `https://www.example.com`, status `301`, target `https://example.com`. Amplify appends the path itself, and a 301 carries the old address's ranking history over, which a 302 doesn't.",
    sections: [
      {
        heading: "What does Amplify set up when I add a domain?",
        blocks: [
          {
            kind: "p",
            text: "Each branch has a default address such as `https://branch-name.d1m7bkiki6tdw1.amplifyapp.com`. When you connect `example.com`, Amplify creates two subdomain entries by default, `https://www.example.com` and `https://example.com`, with a redirect from the root domain to `www`. Its docs describe the same default for Route 53 and for third-party DNS, and send you to Rewrites and redirects to change it.",
          },
        ],
      },
      {
        heading: "How do I redirect www to non-www on Amplify?",
        blocks: [
          {
            kind: "p",
            text: "Open Hosting > Rewrites and redirects, choose Manage redirects and edit the JSON. First remove the root-to-www default, which Amplify's docs say you change from this same page: a reverse rule left next to it would send visitors back and forth between the two hostnames. Then put a domain-level rule at the top of the list:",
          },
          {
            kind: "code",
            label: "Rewrites and redirects (JSON editor)",
            code: "[\n  {\n    \"source\": \"https://www.example.com\",\n    \"status\": \"301\",\n    \"target\": \"https://example.com\",\n    \"condition\": null\n  }\n]",
          },
          {
            kind: "p",
            text: "Domain sources take the hostname alone and Amplify appends the path, so `/pricing` on www lands on `/pricing` on the apex. A source with a path, such as `https://www.example.com/blog`, isn't supported and is ignored without an error. Hostnames match case-insensitively and rules run from the top down. Query strings follow 301 and 302 redirects unless the source matches a specific query value or the target has a query string of its own. Keep `www` connected to the app in domain management, since the rule only sees requests that reach Amplify.",
          },
        ],
      },
      {
        heading: "301, 302 or a 200 rewrite?",
        blocks: [
          {
            kind: "p",
            text: "Amplify's own definitions settle it: after a 301 the ranking history of the old address applies to the new one, after a 302 it doesn't. Check the examples before you copy them. The docs' domain-to-path example uses a 302, and their first domain example is a 200 rewrite from `https://mydomain.com` to `https://www.mydomain.com`, which keeps the address bar unchanged and serves the same pages on both hostnames: the [www and non-www duplicate](/docs/issues/indexing-host-duplicate) you set out to remove. More on choosing a code in [the redirect status codes guide](/guides/redirect-status-codes).",
          },
        ],
      },
      {
        heading: "The amplifyapp.com address and pull-request previews",
        blocks: [
          {
            kind: "p",
            text: "The production branch's `amplifyapp.com` address keeps serving the site next to your domain. Amplify's docs don't show a domain rule with that hostname as its source; the domain-only format above is the one to try, followed by a curl check for the 301. If it doesn't take, an absolute canonical on your domain in every page tells Google which copy to index.",
          },
          {
            kind: "p",
            text: "Web previews deploy each pull request to its own URL, deleted when the request is closed. Amplify's preview docs say nothing about a noindex header, so treat previews as indexable and put them behind Access control, which asks for a username and password on one branch or on all of them. On a public repository, previews can't be turned on for apps that need an IAM service role, such as apps with a backend or on the WEB_COMPUTE platform.",
          },
        ],
      },
      {
        heading: "Single-page apps, 404s and sitemap.xml",
        blocks: [
          {
            kind: "p",
            text: "The docs' single-page-app rule is a 200 rewrite to `index.html` for every path except those ending in a listed extension. Here with `xml` added at the end of the list:",
          },
          {
            kind: "code",
            label: "Rewrites and redirects (JSON editor)",
            code: "[\n  {\n    \"source\": \"</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|xml)$)([^.]+$)/>\",\n    \"status\": \"200\",\n    \"target\": \"/index.html\",\n    \"condition\": null\n  }\n]",
          },
          {
            kind: "p",
            text: "The documented list includes `txt`, so `robots.txt` is left alone, but not `xml`: with the regex as published, a request for `/sitemap.xml` matches the rewrite. Add every extension you publish, then check that the sitemap answers with an XML content type. The simpler `/<*>` to `/index.html` rewrite in the same docs gives every URL, missing ones included, the app with a 200, which Google counts as [soft 404s](/search-console/soft-404).",
          },
          {
            kind: "p",
            text: "For missing pages, the console's 404 type shows the target page in place of the requested one, and the API lists a fifth status, `404-200`, which its reference describes only as a 404 rewrite rule. Whichever you use, request a URL that can't exist and read the status code. Amplify also handles directory pages on its own: `/about` serves `about.html` when it exists, otherwise the address becomes `/about/` and `about/index.html` is served.",
          },
        ],
      },
      {
        heading: "Check the redirect",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI 'https://www.example.com/pricing?plan=pro' | grep -iE '^(HTTP|location)'\n# expect 301 and location: https://example.com/pricing?plan=pro\n\ncurl -sI https://main.d1m7bkiki6tdw1.amplifyapp.com/ | grep -iE '^(HTTP|location)'\ncurl -sI https://example.com/sitemap.xml | grep -iE '^(HTTP|content-type)'\ncurl -s -o /dev/null -w '%{http_code}\\n' https://example.com/no-such-page",
          },
        ],
      },
    ],
    rules: ["indexing-host-duplicate", "indexing-temporary-redirect", "indexing-soft-404-site", "framework-sitemap-missing"],
    sources: [
      { label: "AWS Amplify Hosting, Setting up redirects and rewrites", url: "https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html", read: READ },
      { label: "AWS Amplify Hosting, Redirects and rewrites example reference", url: "https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html", read: READ },
      { label: "AWS Amplify Hosting, Creating and editing redirects", url: "https://docs.aws.amazon.com/amplify/latest/userguide/creating-editing-redirects.html", read: READ },
      { label: "AWS Amplify API reference, CustomRule (status values)", url: "https://docs.aws.amazon.com/amplify/latest/APIReference/API_CustomRule.html", read: READ },
      { label: "AWS Amplify Hosting, Connecting a custom domain", url: "https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html", read: READ },
      { label: "AWS Amplify Hosting, Adding a custom domain managed by Route 53", url: "https://docs.aws.amazon.com/amplify/latest/userguide/to-add-a-custom-domain-managed-by-amazon-route-53.html", read: READ },
      { label: "AWS Amplify Hosting, Adding a custom domain managed by a third-party DNS provider", url: "https://docs.aws.amazon.com/amplify/latest/userguide/to-add-a-custom-domain-managed-by-a-third-party-dns-provider.html", read: READ },
      { label: "AWS Amplify Hosting, Web previews for pull requests", url: "https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html", read: READ },
      { label: "AWS Amplify Hosting, Restricting access to an app's branches", url: "https://docs.aws.amazon.com/amplify/latest/userguide/access-control.html", read: READ },
      { label: "Google Search Central, redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

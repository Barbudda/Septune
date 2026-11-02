import type { TopicPage } from "./types";

// Pages sur les en-têtes HTTP, les redirections et les canoniques (hub "guides").
// Chaque fait vient d'une page lue le 2026-11-02 ou du code source dont la
// version est nommée (next 16.2.9 lu dans node_modules, astro 7.4.5 sur unpkg).
// Laissé de côté faute de source : le code que Netlify envoie pour la
// redirection automatique www/apex, le code par défaut du tableau de bord
// Vercel pour une redirection de domaine, et tout écart 404/410 chez Google.

const READ = "2026-11-02";
const G = "https://developers.google.com/search/docs/crawling-indexing";
const NEXT_DOCS = "https://nextjs.org/docs/app/api-reference";
const NEXT_SRC = "https://app.unpkg.com/next@16.2.9/files/dist";

export const CONCEPTS: TopicPage[] = [
  {
    hub: "guides",
    slug: "x-robots-tag",
    title: "X-Robots-Tag noindex: nginx, .htaccess and PDF setup",
    h1: "X-Robots-Tag noindex, nofollow: set the header in nginx, Apache or .htaccess, and check it with curl",
    description:
      "Send X-Robots-Tag: noindex, nofollow from nginx or .htaccess, keep PDFs out of Google, aim a rule at one crawler, and see why robots.txt hides the header.",
    answer:
      "X-Robots-Tag is an HTTP response header that carries the robots meta tag's rules, so it also works for PDFs and images. In nginx, write `add_header X-Robots-Tag \"noindex, nofollow\";`; in Apache or .htaccess, `Header set X-Robots-Tag \"noindex, nofollow\"`. Confirm it with `curl -sI`. Google reads it only on URLs that robots.txt lets it crawl.",
    sections: [
      {
        heading: "What the header carries",
        blocks: [
          {
            kind: "code",
            label: "HTTP response",
            code: "HTTP/1.1 200 OK\nContent-Type: application/pdf\nX-Robots-Tag: noindex, nofollow",
          },
          {
            kind: "p",
            text: "Every rule of the robots meta tag works in the header: `noindex`, `nofollow`, `none` (both at once), `nosnippet`, `noimageindex`, `max-snippet`, `max-image-preview`, `unavailable_after` and the rest of Google's list. Put several rules in one comma-separated value, or send several `X-Robots-Tag` headers in the same response. Google treats the header name, the crawler name and the values as case-insensitive, and when two rules conflict it applies the more restrictive one.",
          },
          {
            kind: "p",
            text: "Google points to the header for files that can't carry a meta tag: PDFs, video files and image files. On an HTML page the meta tag does the same job and shows up in the page source, which makes it easier to audit.",
          },
        ],
      },
      {
        heading: "How do I target one crawler only?",
        blocks: [
          {
            kind: "code",
            label: "HTTP response headers",
            code: "X-Robots-Tag: googlebot: nofollow\nX-Robots-Tag: otherbot: noindex, nofollow",
          },
          {
            kind: "p",
            text: "A user agent and a colon in front of the rules limit them to that crawler; rules without one apply to every crawler. Here Googlebot may index the page but not follow its links, and `otherbot` may do neither. Septune reads the header the same way: a rule aimed at `googlebot` counts in its noindex check, a rule aimed at `bingbot` is left out.",
          },
        ],
      },
      {
        heading: "nginx: add_header, inheritance and always",
        blocks: [
          {
            kind: "code",
            label: "nginx.conf",
            code: '# keep every PDF out of search\nlocation ~* \\.pdf$ {\n    add_header X-Robots-Tag "noindex, nofollow";\n}\n\n# a whole staging host, error pages included\nserver {\n    server_name staging.example.com;\n    add_header X-Robots-Tag "noindex, nofollow" always;\n}',
          },
          {
            kind: "p",
            text: "Two rules of `add_header` explain a missing header. Without `always`, nginx adds it only to responses with status 200, 201, 204, 206, 301, 302, 303, 304, 307 or 308; with `always`, available since nginx 1.7.5, it goes on every status. For noindex that difference is small, because Google doesn't index URLs that answer 4xx.",
          },
          {
            kind: "p",
            text: "The second rule causes more surprises. A `location` inherits the server's `add_header` lines only when it declares none of its own, so a block that adds `Cache-Control` to PDFs silently drops a server-level `X-Robots-Tag`. Repeat the line inside that block, or, from nginx 1.29.3, set `add_header_inherit merge;` to append the outer values.",
          },
        ],
      },
      {
        heading: "Apache and .htaccess: Header set inside FilesMatch",
        blocks: [
          {
            kind: "code",
            label: ".htaccess",
            code: '<FilesMatch "\\.pdf$">\n    Header set X-Robots-Tag "noindex, nofollow"\n</FilesMatch>',
          },
          {
            kind: "p",
            text: "`Header` comes from mod_headers, and in `.htaccess` it only works where `AllowOverride` includes `FileInfo`. Google's documentation writes the same block as `<Files ~ \"\\.pdf$\">`; Apache's own docs call `<FilesMatch>` the preferred form for regular expressions. `Header set` replaces an existing header of the same name, while `Header add` sends a second copy.",
          },
          {
            kind: "p",
            text: "`Header set` writes to the table Apache uses for successful responses. Apache's docs point to `Header always set` for a non-2xx response the server generates itself, such as a redirect, and for headers produced by a CGI script or `mod_proxy_fcgi`, which live in the `always` table. Setting one header in both tables can send it twice.",
          },
        ],
      },
      {
        heading: "Why robots.txt hides the header from Google",
        blocks: [
          {
            kind: "p",
            text: "Crawlers see `X-Robots-Tag` only when they fetch the URL. Disallow the path in robots.txt and Googlebot never requests the file, never reads the noindex, and Google may still index the bare URL, without its content, from links pointing at it. A `Disallow: /downloads/` written next to a header meant for the same PDFs cancels the header. Keep the header and remove the Disallow, as explained under [pages Googlebot isn't allowed to crawl](/docs/issues/indexing-robots-blocks-pages).",
          },
        ],
      },
      {
        heading: "How to check the header",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI https://www.example.com/files/report.pdf | grep -i x-robots-tag\n\n# the same check on a GET request instead of HEAD\ncurl -s -D - -o /dev/null https://www.example.com/files/report.pdf | grep -i x-robots-tag",
          },
          {
            kind: "p",
            text: "No output means no header. Search Console's URL Inspection shows the HTTP headers Google received under View crawled page, then More info, and a live test shows what the server sends now. The [noindex checker](/tools/noindex-checker) reads the header, both robots meta tags and robots.txt for one URL in a single pass.",
          },
          {
            kind: "p",
            text: "Test the production domain. Vercel adds `X-Robots-Tag: noindex` to every preview deployment, and to a production deployment once a newer one replaces it, but leaves it off a custom domain assigned to a non-production branch. Keeping a staging copy out of search is covered in [staging site indexed](/guides/staging-site-indexed); in Next.js the header can also come from `headers()` in next.config, as in [noindex in Next.js](/frameworks/nextjs/noindex).",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-robots-blocks-pages"],
    sources: [
      { label: "Google Search Central, robots meta tag and X-Robots-Tag specifications", url: `${G}/robots-meta-tag`, read: READ },
      { label: "Google Search Central, block Search indexing with noindex", url: `${G}/block-indexing`, read: READ },
      { label: "nginx docs, ngx_http_headers_module (add_header, add_header_inherit)", url: "https://nginx.org/en/docs/http/ngx_http_headers_module.html", read: READ },
      { label: "Apache HTTP Server docs, mod_headers (Header, onsuccess and always)", url: "https://httpd.apache.org/docs/current/mod/mod_headers.html", read: READ },
      { label: "Apache HTTP Server docs, core: Files and FilesMatch", url: "https://httpd.apache.org/docs/current/mod/core.html#filesmatch", read: READ },
      { label: "Google Search Central, how to specify a canonical URL (robots.txt and indexing without content)", url: `${G}/consolidate-duplicate-urls`, read: READ },
      { label: "Search Console Help, URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289", read: READ },
      { label: "Vercel Knowledge Base, are preview deployments indexed by search engines", url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "trailing-slash",
    title: "Trailing slash SEO: canonical, redirect and sitemap",
    h1: "Trailing slash and SEO: choose /about or /about/, redirect the other, and keep the canonical on the same form",
    description:
      "Google treats /about and /about/ as two URLs. Pick one, redirect the other, match canonical, sitemap and links, and set Next.js, Astro or Vercel to agree.",
    answer:
      "Google treats `/about` and `/about/` as two separate URLs, and neither form is favoured. The root is the exception: `example.com` and `example.com/` are the same URL. Pick one form, redirect the other permanently, and use the chosen form in the canonical tag, the sitemap and every internal link. When both forms answer 200, Google picks the canonical for you.",
    sections: [
      {
        heading: "What Google says about the slash",
        blocks: [
          {
            kind: "p",
            text: "Google's clearest statement is a 2010 Search Central post by Maile Ohye, \"To slash or not to slash\". URLs with and without the trailing slash are separate URLs, treated equally, and Google's indexing even allows them to serve different content, though that can confuse visitors. The convention that a slash means a directory and no slash means a file doesn't bind you. The root is the one exception: `https://example.com` and `https://example.com/` are the same URL and can't be redirected to each other.",
          },
          {
            kind: "p",
            text: "The post's advice lines up with Google's current canonical guide. Choose a preferred form, link to it internally, list it in your sitemap and redirect the other form with a 301; where a redirect is impossible, a `rel=\"canonical\"` link to the preferred form works in a similar way. The current guide rates redirects and canonical links as strong signals, sitemap inclusion as a weak one, and says they add up when combined.",
          },
        ],
      },
      {
        heading: "Which form should I pick?",
        blocks: [
          {
            kind: "p",
            text: "Let the build output decide. A build that writes `about/index.html` matches `/about/`; one that writes `about.html` matches `/about`. Astro's default `build.format: 'directory'` writes the folder form, and so does Next.js with `trailingSlash: true` under `output: \"export\"`. On a site that is already indexed, keep the form Google knows: switching means a redirect on every URL.",
          },
        ],
      },
      {
        heading: "The setting in Next.js, Astro, Vercel, Netlify and Nuxt",
        blocks: [
          {
            kind: "list",
            items: [
              "Next.js 16.2.9: `trailingSlash` defaults to false, and `/about/` answers a 308 to `/about`. Set it to `true` and the redirect runs the other way, except for paths with a file extension and paths under `.well-known/`. `skipTrailingSlashRedirect: true` turns both redirects off. More on [the Next.js page](/frameworks/nextjs).",
              "Astro: `trailingSlash` defaults to `'ignore'`, which serves both forms. With `'always'` or `'never'`, on-demand pages redirect the other form in production, 301 for GET and 308 for other methods. Prerendered pages are served by the host, which may ignore the setting. Astro's docs pair `'always'` with `build.format: 'directory'` and `'never'` with `'file'`. More on [the Astro page](/frameworks/astro).",
              "Vercel, in `vercel.json`: `trailingSlash` is undefined by default, so both forms serve the same content with no redirect, which Vercel's own docs advise against. Setting `true` or `false` adds a 308.",
              "Netlify: redirect rules match a path with or without the slash, so a rule that only adds or removes it loops. Netlify's docs point to its Pretty URLs feature, on by default, to standardise the form.",
              "Nuxt: `experimental.defaults.nuxtLink.trailingSlash`, set to `'append'` or `'remove'`, rewrites the `href` of `<NuxtLink>`. The docs describe no server redirect for it, so add one at the host.",
            ],
          },
        ],
      },
      {
        heading: "Keep the canonical, the sitemap and internal links on one form",
        blocks: [
          {
            kind: "p",
            text: "A redirect alone leaves three loose ends. A canonical that names the redirected form points at a URL that redirects, and RFC 6596 tells authors not to name the source of a permanent redirect as canonical. Sitemap entries in the wrong form send Google through a redirect for each URL, and internal links in the wrong form do the same on every crawl. Google's guide asks for internal links to the canonical URL.",
          },
          {
            kind: "p",
            text: "Build all three from the same path so they can't drift. Astro's docs build the canonical as `new URL(Astro.url.pathname, Astro.site)`, and under `build.format: 'directory'` that pathname ends in a slash. The layout side of this, and why a fixed value breaks every page, is in [self-referencing canonicals](/guides/self-referencing-canonical).",
          },
        ],
      },
      {
        heading: "Check both forms with curl",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -s -o /dev/null -w '%{http_code} %{redirect_url}\\n' https://www.example.com/about\ncurl -s -o /dev/null -w '%{http_code} %{redirect_url}\\n' https://www.example.com/about/",
          },
          {
            kind: "p",
            text: "One command should print 200 and an empty redirect URL, the other 301 or 308 and the preferred URL. Two 200s mean both forms are served. Repeat it on a nested page and on `/robots.txt`, which should answer 200 without gaining a slash. In Search Console, the form you dropped ends up under [Page with redirect](/search-console/page-with-redirect), which Google describes as a non-canonical URL it won't index: expected here.",
          },
        ],
      },
    ],
    rules: ["indexing-redirect-chain", "indexing-canonical-missing"],
    sources: [
      { label: "Google Search Central Blog, To slash or not to slash (Maile Ohye, April 21, 2010)", url: "https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash", read: READ },
      { label: "Google Search Central, how to specify a canonical URL", url: `${G}/consolidate-duplicate-urls`, read: READ },
      { label: "Next.js docs, trailingSlash", url: `${NEXT_DOCS}/config/next-config-js/trailingSlash`, read: READ },
      { label: "Next.js 16.2.9, load-custom-routes.js (the trailing slash redirects)", url: `${NEXT_SRC}/lib/load-custom-routes.js`, read: READ },
      { label: "Next.js docs, proxy.js (skipTrailingSlashRedirect)", url: `${NEXT_DOCS}/file-conventions/proxy`, read: READ },
      { label: "Astro docs, configuration reference (trailingSlash, build.format)", url: "https://docs.astro.build/en/reference/configuration-reference/", read: READ },
      { label: "Astro docs, API reference (Astro.url, Astro.site)", url: "https://docs.astro.build/en/reference/api-reference/", read: READ },
      { label: "Vercel docs, vercel.json: trailingSlash", url: "https://vercel.com/docs/project-configuration/vercel-json#trailingslash", read: READ },
      { label: "Netlify docs, redirect options: trailing slash", url: "https://docs.netlify.com/manage/routing/redirects/redirect-options/", read: READ },
      { label: "Nuxt docs, NuxtLink (trailingSlash)", url: "https://nuxt.com/docs/4.x/api/components/nuxt-link", read: READ },
      { label: "RFC 6596, The Canonical Link Relation", url: "https://www.rfc-editor.org/rfc/rfc6596.html", read: READ },
      { label: "Search Console Help, Page indexing report", url: "https://support.google.com/webmasters/answer/7440203", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "redirect-status-codes",
    title: "308 vs 301 redirect SEO, and 307 vs 302: what to send",
    h1: "308 vs 301 and 307 vs 302 for SEO: what Google does with each, and what your framework sends by default",
    description:
      "Google treats 301 and 308 as permanent, 302, 303 and 307 as temporary. The real defaults in Next.js, Vercel, Netlify, Cloudflare Pages and nginx.",
    answer:
      "For Google, 301 and 308 send the same signal: the move is permanent and the target becomes canonical. 302, 303 and 307 are temporary, so the old URL usually stays in results. Between 301 and 308, or 302 and 307, only the request method differs: 307 and 308 forbid changing POST to GET. Next.js `redirect()` sends a temporary 307.",
    sections: [
      {
        heading: "What each code means in HTTP",
        blocks: [
          {
            kind: "list",
            items: [
              "301 Moved Permanently (RFC 9110, section 15.4.2): future requests should use the new URI. For historical reasons a client may switch a POST to a GET when it follows the redirect.",
              "308 Permanent Redirect (15.4.9): the same permanent meaning, without the permission to change the method. The RFC notes that the code is recent and might not be recognised everywhere.",
              "302 Found (15.4.3): the resource sits temporarily at another URI, clients keep using the original one, and the same POST-to-GET allowance as 301 applies.",
              "307 Temporary Redirect (15.4.8): temporary, and the client must not change the method.",
              "303 See Other (15.4.4): sends the client to a different resource, mainly the result of a POST.",
            ],
          },
          {
            kind: "p",
            text: "RFC 9110 makes 301 and 308 heuristically cacheable, so a browser may keep them without explicit cache headers. A permanent redirect sent by mistake can keep working in visitors' browsers after you remove it from the server; when unsure, ship the temporary code first.",
          },
        ],
      },
      {
        heading: "Is a 308 as good as a 301 for SEO?",
        blocks: [
          {
            kind: "p",
            text: "Yes. Google's redirect guide puts 301 and 308 in the same permanent group, alongside an instant meta refresh, a 0-second `Refresh` header and JavaScript `location` changes. Its temporary group holds 302, 303, 307 and delayed meta refreshes. Googlebot follows both groups. After a permanent redirect, the indexing pipeline uses the target as the canonical; after a temporary one it doesn't, and the source URL usually stays in results.",
          },
          {
            kind: "p",
            text: "Nothing in the guide separates 301 from 308 or 302 from 307, and it notes that users generally can't tell the redirect types apart. For search, the decision is permanent or temporary. The method only matters for APIs: a moved endpoint that receives POST or PUT should answer 307 or 308, which Vercel's docs also recommend. Google's crawlers follow up to 10 hops, and Google warns that long chains hurt crawling.",
          },
        ],
      },
      {
        heading: "The defaults your stack picks for you",
        blocks: [
          {
            kind: "list",
            items: [
              "Next.js 16.2.9, `redirect()` from `next/navigation`: 307. `permanentRedirect()`: 308. In a Server Action submitted without JavaScript, both answer 303.",
              "Next.js, `redirects()` in next.config: `permanent: true` gives 308, `permanent: false` gives 307. A `statusCode: 301` can replace `permanent` but never sit next to it. On a 308, `next start` also sends `Refresh: 0;url=...`, which Next.js adds for Internet Explorer 11.",
              "Next.js, `NextResponse.redirect()` in Proxy: 307 unless you pass another status.",
              "Vercel, `redirects` in vercel.json: `permanent` defaults to true, so 308. In a bulk redirects file it defaults to false, so 307. A firewall redirect created in the dashboard is a 307. Domain redirects accept 301, 302, 307 or 308, and the docs don't say which one the dashboard picks, so check yours.",
              "Netlify, `_redirects` and `netlify.toml`: 301 when no status is written. Netlify says 307 is currently unsupported and to use 302 instead.",
              "Cloudflare Pages, `_redirects`: 302 when no status is written, so every permanent rule needs an explicit 301 or 308.",
              "Astro, `redirects` in astro.config.mjs: 301 by default; a static build without an adapter writes a [meta refresh](/guides/meta-refresh) page instead of sending a status.",
              "nginx: `return 301 URL` and `rewrite ... permanent` send 301, `rewrite ... redirect` sends 302, and `return URL` with no code is a 302.",
            ],
          },
        ],
      },
      {
        heading: "Vercel's docs and Google's disagree about 307",
        blocks: [
          {
            kind: "p",
            text: "Vercel's redirects page says a 307 \"does not affect SEO\" and that search engines treat it as a normal redirect. Google's guide describes a different outcome for indexing: after a temporary redirect the target isn't treated as canonical and the source usually stays in results. For a page that moved for good, go with Google and send 308 or 301.",
          },
        ],
      },
      {
        heading: "Which code to send",
        blocks: [
          {
            kind: "list",
            items: [
              "Moved for good (slug change, new domain, http to https): 301 or 308, whichever your stack sends natively.",
              "Coming back (maintenance page, sign-in wall, seasonal page): 302 or 307.",
              "Form submission landing on a result page: 303, which Next.js Server Actions already send.",
              "API endpoint that moved and receives POST, PUT or DELETE: 307 or 308, so the method and body survive.",
            ],
          },
        ],
      },
      {
        heading: "Check what the server sends",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "# first hop only: status, Location, and the Refresh header Next.js adds to 308s\ncurl -sI https://www.example.com/old-pricing | grep -iE '^(HTTP|location|refresh)'\n\n# every hop until the final page\ncurl -sIL https://www.example.com/old-pricing | grep -iE '^(HTTP|location)'",
          },
          {
            kind: "p",
            text: "Each `HTTP/` line is one response, so the second command also counts the hops. Once Google recrawls the old URL, Search Console lists it under [Page with redirect](/search-console/page-with-redirect). Links on your own pages that still point at the old URL should go straight to the final one; [internal links through temporary redirects](/docs/issues/indexing-temporary-redirect) finds those that land on a 302 or 307.",
          },
        ],
      },
    ],
    rules: ["indexing-temporary-redirect", "indexing-redirect-chain", "indexing-meta-refresh"],
    sources: [
      { label: "RFC 9110, HTTP Semantics, section 15.4 (redirection 3xx)", url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-redirection-3xx", read: READ },
      { label: "Google Search Central, redirects and Google Search", url: `${G}/301-redirects`, read: READ },
      { label: "Google Search Central, HTTP status codes and network errors (redirect hops)", url: `${G}/http-network-errors`, read: READ },
      { label: "Google Search Central, troubleshoot crawling errors (redirect chains)", url: `${G}/troubleshoot-crawling-errors`, read: READ },
      { label: "Next.js docs, redirect", url: `${NEXT_DOCS}/functions/redirect`, read: READ },
      { label: "Next.js docs, permanentRedirect", url: `${NEXT_DOCS}/functions/permanentRedirect`, read: READ },
      { label: "Next.js docs, redirects in next.config.js", url: `${NEXT_DOCS}/config/next-config-js/redirects`, read: READ },
      { label: "Next.js 16.2.9, redirect.js (307 and 308)", url: `${NEXT_SRC}/client/components/redirect.js`, read: READ },
      { label: "Next.js 16.2.9, router-server.js (Refresh header on 308)", url: `${NEXT_SRC}/server/lib/router-server.js`, read: READ },
      { label: "Next.js 16.2.9, response.js (NextResponse.redirect default)", url: `${NEXT_SRC}/server/web/spec-extension/response.js`, read: READ },
      { label: "Vercel docs, redirects", url: "https://vercel.com/docs/routing/redirects", read: READ },
      { label: "Vercel docs, vercel.json: redirects and bulk redirects", url: "https://vercel.com/docs/project-configuration/vercel-json#redirects", read: READ },
      { label: "Vercel REST API, add a domain to a project (redirectStatusCode)", url: "https://vercel.com/docs/rest-api/reference/endpoints/projects/add-a-domain-to-a-project", read: READ },
      { label: "Netlify docs, redirect options: HTTP status codes", url: "https://docs.netlify.com/manage/routing/redirects/redirect-options/", read: READ },
      { label: "Cloudflare Pages docs, redirects", url: "https://developers.cloudflare.com/pages/configuration/redirects/", read: READ },
      { label: "Astro docs, routing: configured redirects", url: "https://docs.astro.build/en/guides/routing/", read: READ },
      { label: "nginx docs, ngx_http_rewrite_module (return, rewrite)", url: "https://nginx.org/en/docs/http/ngx_http_rewrite_module.html", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "404-vs-410",
    title: "404 vs 410 for SEO: what Google does with each",
    h1: "404 vs 410 for SEO: does a 410 get a page out of Google faster?",
    description:
      "Google's docs treat 404 and 410 alike: the URL leaves the index and is crawled less. When 410 still makes sense, and how to send it in Next.js and nginx.",
    answer:
      "Google's documentation treats them the same. Every 4xx code except 429 tells Google the content doesn't exist: an indexed URL is removed, and Google crawls it less and less often. No documented speed difference favours 410. Send 410 when the removal is deliberate and permanent, 404 when you can't tell, and never an error page with a 200.",
    sections: [
      {
        heading: "What Google's documentation says",
        blocks: [
          {
            kind: "p",
            text: "Google's status code reference gives 400, 401, 403, 404, 410 and 411 one shared entry: all 4xx errors except 429 are treated the same. The crawler tells the indexing pipeline the content doesn't exist, a URL that was indexed is removed, newly found 404 URLs aren't processed, and crawl frequency for those URLs falls gradually. These codes have no effect on the crawl rate, 429 aside.",
          },
          {
            kind: "p",
            text: "429 is the exception. Google reads it as a sign of an overloaded server and handles it as a server error, which makes its crawlers slow down. A rate limiter answering 429 to Googlebot removes nothing from the index and throttles the crawl instead.",
          },
          {
            kind: "p",
            text: "Not every 404 needs fixing. Search Console's Page indexing help says a 404 on a page removed without replacement isn't necessarily a problem, and recommends fixing the 404s you link to yourself or list in a sitemap.",
          },
        ],
      },
      {
        heading: "What HTTP says about 410",
        blocks: [
          {
            kind: "p",
            text: "RFC 9110 draws the line on intent. A 404 means the server found no current representation and doesn't say whether that's temporary or permanent. A 410 means the resource is gone and the condition is likely permanent; a server that can't tell is told to send 404. The RFC presents 410 as a web maintenance tool: it says the removal was intentional and invites whoever links to the URL to remove the link. Both responses are heuristically cacheable.",
          },
          {
            kind: "p",
            text: "So 410 gives people and tools more information, with the same documented effect on Google. Use it for content you took down on purpose with no replacement, such as a discontinued product or an expired listing. Keep 404 for every path the router doesn't know.",
          },
        ],
      },
      {
        heading: "The status to avoid: a 200 error page",
        blocks: [
          {
            kind: "p",
            text: "A page that says \"not found\" but answers 200 is a soft 404. Google's crawl troubleshooting guide sorts the fixes in three: content gone, return 404 or 410; moved or with a clear replacement, return a 301; still valid but flagged, inspect the URL to see whether it rendered for Googlebot. The right code for the second case is covered in [redirect status codes](/guides/redirect-status-codes).",
          },
          {
            kind: "p",
            text: "A single-page app behind a rewrite to `index.html` answers 200 for every path, so a missing record renders an error view with a success status. Google's JavaScript guide offers two exits: a JavaScript redirect to a URL where the server answers 404, or a `noindex` robots tag added by JavaScript on the error view. The Search Console side is in [soft 404 in Search Console](/search-console/soft-404).",
          },
        ],
      },
      {
        heading: "How to send a 410 in Next.js",
        blocks: [
          {
            kind: "p",
            text: "In Next.js 16.2.9, `next/navigation` exports `notFound()`, `forbidden()` and `unauthorized()`, and no helper for 410. Answer from Proxy, the file named middleware before Next.js 16, which can return a `Response` of its own before any rendering:",
          },
          {
            kind: "code",
            label: "proxy.ts",
            code: 'import type { NextRequest } from "next/server";\n\nconst GONE = new Set(["/products/blue-kettle", "/blog/2019-holiday-sale"]);\n\nexport function proxy(request: NextRequest) {\n  if (GONE.has(request.nextUrl.pathname)) {\n    return new Response("<!doctype html><title>Removed</title><h1>This page was removed.</h1>", {\n      status: 410,\n      headers: { "Content-Type": "text/html; charset=utf-8" },\n    });\n  }\n}\n\nexport const config = { matcher: ["/products/:path*", "/blog/:path*"] };',
          },
          {
            kind: "p",
            text: "Decide the status before the body starts streaming. Next.js documents that a streamed response starts with 200 and that starting the stream fixes the status code, so a late `notFound()` gets a `noindex` meta tag in the HTML instead of a 404. Proxy doesn't run with `output: \"export\"`, where the host has to send the code.",
          },
        ],
      },
      {
        heading: "nginx, and what static hosts allow",
        blocks: [
          {
            kind: "code",
            label: "nginx.conf",
            code: "location = /products/blue-kettle { return 410; }\nlocation /old-catalog/          { return 410; }\n\n# serve your own page with the 410 status\nerror_page 410 /gone.html;\nlocation = /gone.html { internal; }",
          },
          {
            kind: "p",
            text: "`return` stops processing and sends the code. `error_page` swaps nginx's default body for your page and keeps the 410, and `internal` makes a direct request for `/gone.html` answer 404.",
          },
          {
            kind: "p",
            text: "Netlify's redirect options list 301, 302, 404 and 200 rules, with no mention of 410. A rule such as `/old-catalog/* /gone.html 404` gives a removed section its own not-found page, and because of shadowing it only applies to paths with no file left, so delete the files too. Cloudflare Pages `_redirects` handles redirect codes and 200 proxying only. On those hosts a clean 404 is the realistic answer, and Google's documentation handles it exactly like a 410.",
          },
        ],
      },
      {
        heading: "Check the status, then clean up the links",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -s -o /dev/null -w '%{http_code}\\n' https://www.example.com/products/blue-kettle",
          },
          {
            kind: "p",
            text: "Expect 410 or 404. Then take the URL out of the sitemap and out of your own pages, the two places where Google asks you to fix a 404. [Internal links to broken pages](/docs/issues/link-broken-internal) lists every page that still links to it.",
          },
        ],
      },
    ],
    rules: ["indexing-broken-page", "indexing-soft-404", "indexing-soft-404-site", "link-broken-internal"],
    sources: [
      { label: "Google Search Central, HTTP status codes and network errors", url: `${G}/http-network-errors`, read: READ },
      { label: "RFC 9110, HTTP Semantics, sections 15.5.5 (404) and 15.5.11 (410)", url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-410-gone", read: READ },
      { label: "Google Search Central, troubleshoot crawling errors (soft 404)", url: `${G}/troubleshoot-crawling-errors`, read: READ },
      { label: "Search Console Help, Page indexing report", url: "https://support.google.com/webmasters/answer/7440203", read: READ },
      { label: "Google Search Central, JavaScript SEO basics (soft 404 in single-page apps)", url: `${G}/javascript/javascript-seo-basics`, read: READ },
      { label: "Next.js 16.2.9, navigation.react-server.d.ts (the status helpers)", url: `${NEXT_SRC}/client/components/navigation.react-server.d.ts`, read: READ },
      { label: "Next.js docs, proxy.js (producing a response)", url: `${NEXT_DOCS}/file-conventions/proxy`, read: READ },
      { label: "Next.js docs, loading.js (status codes when streaming)", url: `${NEXT_DOCS}/file-conventions/loading`, read: READ },
      { label: "nginx docs, ngx_http_rewrite_module (return)", url: "https://nginx.org/en/docs/http/ngx_http_rewrite_module.html", read: READ },
      { label: "nginx docs, ngx_http_core_module (error_page, internal)", url: "https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page", read: READ },
      { label: "Netlify docs, redirect options (status codes, custom 404)", url: "https://docs.netlify.com/manage/routing/redirects/redirect-options/", read: READ },
      { label: "Cloudflare Pages docs, redirects", url: "https://developers.cloudflare.com/pages/configuration/redirects/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "meta-refresh",
    title: "Meta refresh SEO: instant vs delayed redirects",
    h1: "Meta refresh redirects and SEO: how Google reads them, and the ones your framework writes without asking",
    description:
      "Google reads a 0-second meta refresh as permanent and a delayed one as temporary. When it's your only option, and where Next.js, Astro and Jekyll emit one.",
    answer:
      "Google follows meta refresh redirects. A refresh with no delay, `content=\"0; url=...\"`, counts as permanent, like a 301. Any delay above 0 makes it temporary, like a 302. Google still recommends a server-side redirect whenever your platform allows one, and keeps meta refresh as the fallback for hosts where you can't configure redirects.",
    sections: [
      {
        heading: "How Google classifies the tag",
        blocks: [
          {
            kind: "code",
            label: "HTML",
            code: '<!-- permanent for Google: no delay -->\n<meta http-equiv="refresh" content="0; url=https://www.example.com/pricing">\n\n<!-- temporary for Google: 5-second delay -->\n<meta http-equiv="refresh" content="5; url=https://www.example.com/pricing">',
          },
          {
            kind: "p",
            text: "Google's redirect guide files the instant version with 301 and 308 and the delayed one with 302 and 307. Place the tag in the `<head>`, or send the same instruction from the server as a `Refresh: 0; url=...` header, which Google classifies the same way. The guide offers both for platforms where server-side redirects aren't possible.",
          },
        ],
      },
      {
        heading: "Why a server-side redirect is still the better choice",
        blocks: [
          {
            kind: "p",
            text: "With a meta refresh, the old URL answers 200 and the move happens in the HTML. Log analysis, link checkers and anything else that reads status codes records it as a working page. The browser has to download and parse the document before it leaves, and with a delay the visitor sees the old page first.",
          },
          {
            kind: "p",
            text: "W3C's accessibility techniques agree. Technique H76 accepts meta refresh as a redirect only with a zero timeout, so no content shows before the new page loads, and says redirects are preferably done on the server. Failure F40 covers redirects after a delay under WCAG 2.2.1, 2.2.4 and 3.2.5; its test passes a delay below one second or above 72,000 seconds (20 hours).",
          },
        ],
      },
      {
        heading: "Meta refresh pages your tools write for you",
        blocks: [
          {
            kind: "list",
            items: [
              "[Astro](/frameworks/astro) without an adapter: the routing guide says a static build outputs configured redirects as HTML files with a meta refresh. In astro 7.4.5 the template writes a 0-second refresh, or 2 seconds when the redirect is a 302 (a comment in the source cites Google's rule), plus a `noindex` robots tag and a canonical link to the destination. Supported adapters write the host's redirect config instead.",
              "Jekyll on GitHub Pages: jekyll-redirect-from, which GitHub Pages lists at version 0.16.0, serves an HTML file with a refresh tag and generates no server config. The template in its repository combines a 0-second refresh, a `location=` script, a canonical link and `noindex`.",
              "Next.js 16.2.9: when `redirect()` or `permanentRedirect()` runs after the response has started streaming, the status is already 200, so Next.js inserts `<meta id=\"__next-page-redirect\" http-equiv=\"refresh\">` instead. The source writes a 0-second delay for `permanentRedirect()` and a 1-second delay for `redirect()`, which Google's rule turns into a permanent and a temporary redirect.",
            ],
          },
          {
            kind: "p",
            text: "For the Next.js case, run the check before any Suspense fallback renders, or move the redirect to Proxy or to `redirects()` in next.config. Both answer with a real 307 or 308 before rendering starts.",
          },
        ],
      },
      {
        heading: "When meta refresh is the only option",
        blocks: [
          {
            kind: "p",
            text: "Some hosts serve files and nothing else, with no redirect rules to configure. There, one instant meta refresh page per old URL is the documented fallback. Make it as close to a server redirect as HTML allows: a 0-second delay, an absolute destination URL, a canonical link to the destination and a plain link in the body. Point internal links and the sitemap at the destination, so the refresh page only catches old links from other sites. Notes for [GitHub Pages](/hosting/github-pages) are on its own page.",
          },
        ],
      },
      {
        heading: "What about JavaScript redirects?",
        blocks: [
          {
            kind: "p",
            text: "Google lists a JavaScript change to `window.location` as a permanent redirect as well, and ranks it last: use it only when neither a server-side nor a meta refresh redirect is possible. Google runs JavaScript in its rendering service after crawling, and when rendering fails it never sees the redirect. Crawlers that don't execute JavaScript stay on the old page.",
          },
        ],
      },
      {
        heading: "Find meta refresh redirects on a site",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI https://www.example.com/old-pricing | head -n 1\ncurl -s https://www.example.com/old-pricing | grep -io '<meta[^>]*refresh[^>]*>'",
          },
          {
            kind: "p",
            text: "A 200 status line plus a printed tag means the redirect lives in the HTML. Replace it with a server redirect, using the codes in [redirect status codes](/guides/redirect-status-codes), and delete the page that only carried the tag. Septune flags every crawled page with a refresh tag in its head, whether it redirects at once, after a delay, or reloads the same page on a timer.",
          },
        ],
      },
    ],
    rules: ["indexing-meta-refresh", "indexing-temporary-redirect"],
    sources: [
      { label: "Google Search Central, redirects and Google Search: meta refresh", url: `${G}/301-redirects#metarefresh`, read: READ },
      { label: "W3C, WCAG 2.2 Technique H76 (instant meta refresh redirect)", url: "https://www.w3.org/WAI/WCAG22/Techniques/html/H76", read: READ },
      { label: "W3C, WCAG 2.2 Failure F40 (meta redirect with a time limit)", url: "https://www.w3.org/WAI/WCAG22/Techniques/failures/F40", read: READ },
      { label: "Astro docs, routing: configured redirects", url: "https://docs.astro.build/en/guides/routing/", read: READ },
      { label: "Astro 7.4.5, routing/3xx.js (the redirect page template)", url: "https://app.unpkg.com/astro@7.4.5/files/dist/core/routing/3xx.js", read: READ },
      { label: "Astro 7.4.5, build/generate.js (where the template is used)", url: "https://app.unpkg.com/astro@7.4.5/files/dist/core/build/generate.js", read: READ },
      { label: "jekyll-redirect-from, README", url: "https://github.com/jekyll/jekyll-redirect-from", read: READ },
      { label: "jekyll-redirect-from, redirect.html template (main branch)", url: "https://raw.githubusercontent.com/jekyll/jekyll-redirect-from/master/lib/jekyll-redirect-from/redirect.html", read: READ },
      { label: "GitHub Pages, dependency versions", url: "https://pages.github.com/versions.json", read: READ },
      { label: "Next.js docs, redirect (streaming context)", url: `${NEXT_DOCS}/functions/redirect`, read: READ },
      { label: "Next.js 16.2.9, make-get-server-inserted-html.js (the inserted refresh tag)", url: `${NEXT_SRC}/server/app-render/make-get-server-inserted-html.js`, read: READ },
      { label: "Next.js docs, loading.js (status codes when streaming)", url: `${NEXT_DOCS}/file-conventions/loading`, read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "canonical-vs-noindex",
    title: "Canonical vs noindex: which one to use, case by case",
    h1: "Canonical vs noindex: what each tells Google, and which one fits filters, pagination, staging and print pages",
    description:
      "A canonical names the URL to show for duplicates; noindex removes a page. Why Google advises against noindex for duplicates, and which tag fits each case.",
    answer:
      "A canonical tag names the preferred URL among pages with the same content, as a strong hint Google can override. A noindex removes the page from Search entirely. Google advises against using noindex to pick a canonical within one site. Use a canonical for duplicates and variants, noindex for pages that shouldn't appear at all, and avoid both on one page.",
    sections: [
      {
        heading: "Two different instructions",
        blocks: [
          {
            kind: "list",
            items: [
              "`<link rel=\"canonical\" href=\"https://www.example.com/shoes\">` says: this content also lives at that URL, prefer it. Google calls a canonical link a strong signal, and its canonicalization guide adds that a canonical preference is only a hint: Google can choose another URL.",
              "`<meta name=\"robots\" content=\"noindex\">`, or `X-Robots-Tag: noindex` as a header, says: don't show this page. On its next crawl Google drops the page from results entirely, whatever links point to it.",
            ],
          },
          {
            kind: "p",
            text: "RFC 6596, which defines the canonical relation, requires the target to hold the same content as the page or a superset of it. That gives a quick test: if another URL contains this page's content, a canonical fits; if the page shouldn't be in search under any URL, noindex fits.",
          },
        ],
      },
      {
        heading: "Why Google says not to use noindex for duplicates",
        blocks: [
          {
            kind: "p",
            text: "Google's canonical guide lists it as a mistake: don't use noindex to prevent the selection of a canonical page within a single site, because it completely blocks the page from Search. A noindexed duplicate disappears and points Google nowhere, while a canonical tells it which URL should stand for the group.",
          },
          {
            kind: "p",
            text: "Vercel's docs apply the same split to a second hostname serving the production pages. A permanent redirect or an absolute canonical keeps the custom domain as the preferred URL; `X-Robots-Tag: noindex` is reserved for a host that should stay out of search, with a link to Google's warning.",
          },
        ],
      },
      {
        heading: "What happens with both tags on one page?",
        blocks: [
          {
            kind: "p",
            text: "A page carrying `noindex` and a canonical to another URL sends two instructions that don't fit: one says count me as a copy of that URL, the other says drop me. Google's docs don't describe how it settles the pair, so remove one of them. One way it happens: a layout prints a canonical on every page while a CMS setting adds noindex to a few of them.",
          },
          {
            kind: "p",
            text: "The reverse is worse: a canonical that points at a page carrying noindex. The canonical then names a URL that can't be indexed, so the hint can't be followed. [Canonical targets that can't be indexed](/docs/issues/indexing-canonical-target-invalid) covers how to find and fix those.",
          },
        ],
      },
      {
        heading: "Which one for filters, pagination, staging and print pages",
        blocks: [
          {
            kind: "list",
            items: [
              "Sorted and filtered listings (`?sort=price`, `?color=red`): the unfiltered category holds the same items or more, so a canonical to it meets RFC 6596. To keep them out of the index instead, Google's pagination guide suggests noindex on filter and sort variations, and its faceted navigation guide prefers blocking their crawl in robots.txt, calling canonical and nofollow less effective in the long term. Choose one per URL pattern: a robots.txt block hides any noindex on the same URLs.",
              "Paginated pages (`/blog?page=2`): neither. Google's pagination guide asks for each page to have its own canonical and warns against pointing the series at page 1; RFC 6596 says the same, since page 2 lists different items. The guide doesn't ask for noindex on later pages. The per-page canonical itself is covered in [self-referencing canonicals](/guides/self-referencing-canonical).",
              "Staging and preview copies: noindex, sent as a header so it covers every response. A canonical to production is only a hint, which makes it a weak guard for a copy that must stay hidden. Vercel already adds `X-Robots-Tag: noindex` to preview deployments; the rest is in [staging site indexed](/guides/staging-site-indexed).",
              "Print versions: a canonical to the article, since the print page holds the same content. For a PDF or another file version, send the canonical as an HTTP header, `Link: <https://www.example.com/report>; rel=\"canonical\"`, which Google supports for non-HTML documents in web search.",
              "Pages with nothing worth ranking and no equivalent elsewhere, such as internal search results: noindex. A canonical there would claim a duplicate that doesn't exist.",
            ],
          },
        ],
      },
      {
        heading: "Check which one Google applied",
        blocks: [
          {
            kind: "p",
            text: "URL Inspection shows both sides: the canonical you declared and the one Google selected, which can lag the index by a few hours. A duplicate that follows your canonical appears in the Page indexing report as [Alternate page with proper canonical tag](/search-console/alternate-page-with-canonical), which Google says needs no action. A noindex sent as a header never shows in the page source; [the X-Robots-Tag guide](/guides/x-robots-tag) shows how to read it.",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-target-invalid", "indexing-noindex", "indexing-canonical-mismatch", "indexing-sitemap-hygiene"],
    sources: [
      { label: "Google Search Central, how to specify a canonical URL", url: `${G}/consolidate-duplicate-urls`, read: READ },
      { label: "Google Search Central, what is URL canonicalization", url: `${G}/canonicalization`, read: READ },
      { label: "Google Search Central, block Search indexing with noindex", url: `${G}/block-indexing`, read: READ },
      { label: "Google Search Central, pagination and incremental page loading", url: "https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading", read: READ },
      { label: "Google Search Central, managing crawling of faceted navigation URLs", url: `${G}/crawling-managing-faceted-navigation`, read: READ },
      { label: "RFC 6596, The Canonical Link Relation", url: "https://www.rfc-editor.org/rfc/rfc6596.html", read: READ },
      { label: "Vercel docs, redirects: choose a canonical production domain", url: "https://vercel.com/docs/routing/redirects#choose-a-canonical-production-domain", read: READ },
      { label: "Vercel Knowledge Base, are preview deployments indexed by search engines", url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines", read: READ },
      { label: "Search Console Help, URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289", read: READ },
      { label: "Search Console Help, Page indexing report", url: "https://support.google.com/webmasters/answer/7440203", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "self-referencing-canonical",
    title: "Self-referencing canonical: does every page need one?",
    h1: "Self-referencing canonical: should a page's canonical point to itself, and how to write it",
    description:
      "Google recommends a canonical on the canonical page itself. Write it absolute, from the route path, and avoid a shared layout that points every page home.",
    answer:
      "Yes. Google's canonical guide says to include a `rel=\"canonical\"` link on the canonical page itself, and RFC 6596 allows a self-referential target. It gives Google your preferred URL for copies you didn't plan, such as tracking parameters or a second hostname. Write it as an absolute URL built from the route's path, never as one fixed value in a shared layout.",
    sections: [
      {
        heading: "What Google and RFC 6596 recommend",
        blocks: [
          {
            kind: "p",
            text: "Google's guide to specifying a canonical URL lists it among its best practices: include a `rel=\"canonical\"` link on the canonical page itself, also called a self-referential canonical. RFC 6596, published in 2012 by Maile Ohye and Joachim Kupke, lists self-reference among the forms a canonical target may take. Google's 2013 post on common canonical mistakes recommends it for category pages: a self-referential canonical there, or none at all.",
          },
          {
            kind: "p",
            text: "Without one, the page leaves Google to pick a canonical among every URL that serves the same HTML. With one built from the path and the production origin, `/shoes?utm_source=newsletter` and a copy on a second hostname both name the URL you want.",
          },
        ],
      },
      {
        heading: "Absolute or relative URL?",
        blocks: [
          {
            kind: "p",
            text: "Google supports relative paths in `rel=\"canonical\"` but recommends absolute URLs, saying relative ones can cause problems in the long run. The 2013 post shows the classic slip: `href=\"example.com/cupcake.html\"` has no scheme, so it is a relative path and resolves under the current page, for instance to `https://example.com/example.com/cupcake.html`, and the canonical may be ignored. Write the scheme, the production host and the path.",
          },
          {
            kind: "code",
            label: "HTML",
            code: '<!-- served at https://www.example.com/shoes/trail?utm_source=newsletter -->\n<link rel="canonical" href="https://www.example.com/shoes/trail">',
          },
        ],
      },
      {
        heading: "Query strings: drop tracking, keep what changes the page",
        blocks: [
          {
            kind: "p",
            text: "Build the canonical from the route's path rather than from the full request URL. Copies created by `?utm_source=` or `?gclid=` then name the clean URL; Google's guide uses a `gclid` URL as its example of a version you don't want shown. Astro's documentation builds its canonical this way, as `new URL(Astro.url.pathname, Astro.site)`.",
          },
          {
            kind: "p",
            text: "A parameter that changes what the page lists stays in. Google's pagination guide wants each page in a series to carry its own canonical, so `/blog?page=2` declares `/blog?page=2`. Copy the content parameters you keep from an allow list, so a new tracking parameter never slips into the canonical.",
          },
        ],
      },
      {
        heading: "The shared-layout bug: every page canonical to the homepage",
        blocks: [
          {
            kind: "p",
            text: "A self-referencing canonical breaks when it's written once, as a fixed value, in a layout every page uses. Every page then declares the homepage as its canonical, which tells Google each of them duplicates the homepage. Google's 2013 post describes a smaller version of this: a category page whose canonical names a featured article can drop out of search results.",
          },
          {
            kind: "code",
            label: "src/layouts/Base.astro",
            code: "---\n// wrong: Astro.site is the same root URL on every page\n// const canonical = Astro.site;\n\n// right: the current path on the production origin\nconst canonical = new URL(Astro.url.pathname, Astro.site);\n---\n<link rel=\"canonical\" href={canonical} />",
          },
          {
            kind: "p",
            text: "In Next.js, the same bug sits in the root layout's `alternates.canonical`. Metadata from layouts is merged shallowly and a page inherits every field it doesn't set, and the `metadataBase` example in the Next.js docs resolves `canonical: '/'` to the bare origin. Put that value in a root layout and it lands on every page. The fix, `./`, is explained in [canonical URLs in Next.js](/frameworks/nextjs/canonical-url).",
          },
        ],
      },
      {
        heading: "Next.js streamed metadata and the head",
        blocks: [
          {
            kind: "p",
            text: "Google accepts a `rel=\"canonical\"` link only in the `<head>`. Since Next.js 15.2, metadata from a `generateMetadata` that can't be prerendered may be streamed and appended to the `<body>` for bots that run JavaScript, and the Next.js docs say they verified that Googlebot reads it correctly. The two statements don't line up. To stay clear of the question, keep the canonical in metadata that can be prerendered, or set `htmlLimitedBots: /.*/` in next.config, which Next.js warns can lengthen response times.",
          },
        ],
      },
      {
        heading: "Check it on a few pages",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "for p in / /pricing /blog/launch; do\n  curl -s \"https://www.example.com$p\" | grep -io '<link[^>]*rel=\"canonical\"[^>]*>'\ndone",
          },
          {
            kind: "p",
            text: "Each page should print one tag holding its own absolute URL. The same value on every line is the layout bug; two tags on one page mean two templates write it. In URL Inspection, the user-declared canonical should match the page and the Google-selected one should agree. Pages Google treats as copies while they declare no canonical show up as [Duplicate without user-selected canonical](/search-console/duplicate-without-canonical), and [canonical points to a different page](/docs/issues/indexing-canonical-mismatch) lists pages whose canonical names another path.",
          },
        ],
      },
    ],
    rules: ["indexing-canonical-missing", "indexing-canonical-mismatch", "indexing-canonical-multiple"],
    sources: [
      { label: "Google Search Central, how to specify a canonical URL", url: `${G}/consolidate-duplicate-urls`, read: READ },
      { label: "RFC 6596, The Canonical Link Relation (Ohye and Kupke, April 2012)", url: "https://www.rfc-editor.org/rfc/rfc6596.html", read: READ },
      { label: "Google Search Central Blog, 5 common mistakes with rel=canonical (Allan Scott, April 8, 2013)", url: "https://developers.google.com/search/blog/2013/04/5-common-mistakes-with-relcanonical", read: READ },
      { label: "Google Search Central, pagination and incremental page loading", url: "https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading", read: READ },
      { label: "Astro docs, API reference (Astro.url, Astro.site)", url: "https://docs.astro.build/en/reference/api-reference/", read: READ },
      { label: "Next.js docs, generateMetadata (metadataBase, merging, streaming metadata)", url: `${NEXT_DOCS}/functions/generate-metadata`, read: READ },
      { label: "Search Console Help, URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289", read: READ },
      { label: "Search Console Help, Page indexing report", url: "https://support.google.com/webmasters/answer/7440203", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

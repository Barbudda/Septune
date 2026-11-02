import type { TopicPage } from "./types";

/**
 * Pages « tester le SEO dans le flux de dev » (hub guides) : spec Playwright,
 * contrôles en CI sur la preview, diff preview / production, staging indexé.
 * Chaque fait vient d'une page lue le 2026-11-02 (listée dans sources) ; le code a
 * été exécuté ce jour-là : la spec avec @playwright/test 1.64.1 contre un site
 * en ligne, le script de diff avec Node 24.11.1 contre deux serveurs locaux,
 * le filtre --jq du workflow avec gh 2.92.0 sur un dépôt public.
 */

const READ = "2026-11-02";

export const WORKFLOW: TopicPage[] = [
  {
    hub: "guides",
    slug: "seo-testing-playwright",
    title: "Playwright SEO testing: status, tags and headers",
    h1: "SEO testing with Playwright: one spec that checks status, tags and headers on every route",
    description: "A @playwright/test spec that checks each route's status, title, description, canonical, robots meta, X-Robots-Tag, h1 and og:image on a preview URL.",
    answer: "Write one spec that loops over your routes. For each path, call `request.get(path, { maxRedirects: 0 })` and expect 200, then load the page with JavaScript off and assert the title, the meta description, one absolute canonical, no robots noindex, one h1 and an https og:image. Read X-Robots-Tag from `response.headers()`. Set `baseURL` from an environment variable to test a preview.",
    sections: [
      {
        heading: "The config: one baseURL for every environment",
        blocks: [
          {
            kind: "code",
            label: "playwright.config.ts",
            code: "import { defineConfig } from \"@playwright/test\";\n\nconst bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;\n\nexport default defineConfig({\n  testDir: \"./tests\",\n  use: {\n    // The preview URL in CI, the dev server on your machine.\n    baseURL: process.env.BASE_URL ?? \"http://localhost:3000\",\n    // Only needed when the preview sits behind Vercel Deployment Protection.\n    extraHTTPHeaders: bypass ? { \"x-vercel-protection-bypass\": bypass } : {},\n  },\n});",
          },
          {
            kind: "p",
            text: "With `baseURL` set, `page.goto(\"/pricing\")` and `request.get(\"/pricing\")` both resolve the path against it: Playwright's API testing docs say the `request` fixture respects `baseURL` and `extraHTTPHeaders` from the config. The same spec runs against `localhost` while you work and against a preview in CI, where the workflow sets `BASE_URL` (see [SEO checks in CI](/guides/seo-checks-in-ci)).",
          },
          {
            kind: "p",
            text: "The bypass header is Vercel's documented way through Deployment Protection for automated tests. Playwright sends `extraHTTPHeaders` with every request the page makes, third-party hosts included, so give the tests a bypass secret of their own: Vercel allows several per project, and you can revoke one without touching the others.",
          },
        ],
      },
      {
        heading: "The spec",
        blocks: [
          {
            kind: "code",
            label: "tests/seo/seo.spec.ts",
            code: "import { test, expect } from \"@playwright/test\";\n\n// Read the HTML the server sends, as a crawler that runs no JavaScript gets it.\ntest.use({ javaScriptEnabled: false });\n\n// Canonicals name production even on a preview: compare against this origin.\nconst SITE = process.env.SITE_URL ?? \"https://www.example.com\";\n// Previews on Vercel and Netlify answer with X-Robots-Tag: noindex on purpose.\nconst PRODUCTION = process.env.SEO_ENV === \"production\";\n\nconst ROUTES = [\n  { path: \"/\", title: /Example Store/ },\n  { path: \"/pricing\", title: /^Pricing/ },\n  { path: \"/blog/launch\", title: /launch/i },\n];\n\nfor (const { path, title } of ROUTES) {\n  test(`indexable: ${path}`, async ({ page, request }) => {\n    // A 301 or 302 here means the route moved: fail instead of following it.\n    const raw = await request.get(path, { maxRedirects: 0 });\n    expect(raw.status(), `status of ${path}`).toBe(200);\n\n    const response = await page.goto(path);\n    expect(response).not.toBeNull();\n    // headers() lower-cases every name.\n    const robotsHeader = response!.headers()[\"x-robots-tag\"] ?? \"\";\n    if (PRODUCTION) expect(robotsHeader).not.toMatch(/noindex|none/i);\n\n    await expect(page).toHaveTitle(title);\n    await expect(page.locator('meta[name=\"description\"]')).toHaveAttribute(\"content\", /.{50,}/);\n    await expect(page.locator('meta[name=\"robots\"][content*=\"noindex\" i]')).toHaveCount(0);\n    await expect(page.locator(\"h1\")).toHaveCount(1);\n    await expect(page.locator('meta[property=\"og:image\"]')).toHaveAttribute(\"content\", /^https:\\/\\//);\n\n    const canonical = page.locator('link[rel=\"canonical\"]');\n    await expect(canonical).toHaveCount(1);\n    const href = await canonical.getAttribute(\"href\");\n    expect(href).toMatch(/^https:\\/\\//);\n    // Parse both sides: \"https://www.example.com\" and \".../\" are the same URL.\n    expect(new URL(href!).href).toBe(new URL(path, SITE).href);\n  });\n}",
          },
          {
            kind: "p",
            text: "Each route becomes its own test, so the report names the page that failed. The canonical is compared with the production origin in `SITE_URL`, because a preview should still point search engines at production. We ran this spec with @playwright/test 1.64.1 against a live site before publishing it.",
          },
        ],
      },
      {
        heading: "Why turn JavaScript off?",
        blocks: [
          {
            kind: "p",
            text: "`javaScriptEnabled` defaults to `true`, so Playwright normally asserts on the DOM after your scripts have run. A title or a canonical injected on the client passes that test, while a crawler that runs no JavaScript receives a page without it. `test.use({ javaScriptEnabled: false })` at the top of the file turns scripts off for every test in it, and locators then query the HTML the server sent.",
          },
          {
            kind: "p",
            text: "If routes fail only in this mode, their content is rendered in the browser: see [content that only appears after JavaScript runs](/docs/issues/framework-js-only-content).",
          },
        ],
      },
      {
        heading: "Why does page.goto miss redirects?",
        blocks: [
          {
            kind: "p",
            text: "`page.goto()` follows redirects and, in Playwright's words, resolves with the first non-redirect response. A route that now answers 301 to another page still hands your assertion a 200. `request.get()` follows up to 20 redirects by default, and `maxRedirects: 0` stops at the first answer, so a moved route fails with its real status. Which code a move should use is covered in [redirect status codes](/guides/redirect-status-codes).",
          },
          {
            kind: "p",
            text: "`page.goto()` doesn't throw on a 404 or a 500 either. It returns the response, and nothing fails until you assert on the status.",
          },
        ],
      },
      {
        heading: "Reading the X-Robots-Tag header",
        blocks: [
          {
            kind: "p",
            text: "A noindex can come in the HTTP response instead of the HTML, where no locator finds it. `response.headers()` returns the headers with lower-cased names, so read `headers()[\"x-robots-tag\"]`. Playwright's docs note that `headers()` leaves out security-related headers such as cookies and that `allHeaders()` returns the full set; X-Robots-Tag comes through `headers()`. Where the header usually comes from is in [the X-Robots-Tag guide](/guides/x-robots-tag).",
          },
          {
            kind: "p",
            text: "Assert it on production only. Vercel sends `X-Robots-Tag: noindex` on deployments from non-production branches by default and Netlify on Deploy Previews, so the spec reads `SEO_ENV` and skips that one check elsewhere. The robots meta tag is a different case: your templates write it, so it is checked on every run.",
          },
        ],
      },
      {
        heading: "Assertions that fail for the wrong reason",
        blocks: [
          {
            kind: "list",
            items: [
              "A canonical written `https://www.example.com` and the route `/` don't match as strings. `new URL()` turns both into `https://www.example.com/`, so parse before you compare.",
              "Web-first assertions such as `toHaveCount` retry until their timeout. With JavaScript off the page never changes, so a failing one only costs time: 5000 ms per assertion with the defaults in our run.",
              "The `i` in `[content*=\"noindex\" i]` makes the match ignore case, so `NOINDEX` is caught. A `<meta name=\"googlebot\">` tag is not: add a second locator if your templates write one.",
              "An og:image on `http://localhost:3000` fails the `^https://` check. On Next.js that is [the metadataBase warning](/frameworks/nextjs/metadatabase-not-set) at work.",
            ],
          },
        ],
      },
      {
        heading: "What a list of routes can't cover",
        blocks: [
          {
            kind: "p",
            text: "The spec tests the routes someone wrote down. A new template, a page reachable only from the sitemap or a section added later stays untested until the list is updated. Septune's audit starts from links and the sitemap instead, and on every page that answers 2xx it reads both the robots meta tag and the X-Robots-Tag header of the final response.",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-canonical-missing", "meta-title-missing", "meta-og-image-url"],
    sources: [
      { label: "Playwright docs, Response: headers() and allHeaders()", url: "https://playwright.dev/docs/api/class-response", read: READ },
      { label: "Playwright docs, page.goto(): redirects and the returned response", url: "https://playwright.dev/docs/api/class-page#page-goto", read: READ },
      { label: "Playwright docs, APIRequestContext: maxRedirects", url: "https://playwright.dev/docs/api/class-apirequestcontext", read: READ },
      { label: "Playwright docs, API testing: the request fixture and baseURL", url: "https://playwright.dev/docs/api-testing", read: READ },
      {
        label: "Playwright docs, TestOptions: javaScriptEnabled, baseURL, extraHTTPHeaders",
        url: "https://playwright.dev/docs/api/class-testoptions",
        read: READ,
      },
      { label: "Playwright docs, test.use()", url: "https://playwright.dev/docs/api/class-test#test-use", read: READ },
      { label: "Playwright docs, LocatorAssertions", url: "https://playwright.dev/docs/api/class-locatorassertions", read: READ },
      {
        label: "Vercel docs, Protection Bypass for Automation",
        url: "https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation",
        read: READ,
      },
      {
        label: "Vercel KB, Are Vercel Preview Deployments indexed by search engines?",
        url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines",
        read: READ,
      },
      {
        label: "Netlify docs, Deploy Previews: keep them out of search indexes",
        url: "https://docs.netlify.com/deploy/deploy-types/deploy-previews/",
        read: READ,
      },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "seo-checks-in-ci",
    title: "SEO checks in CI: a GitHub Action on the PR preview",
    h1: "SEO checks in CI: test each pull request's preview in GitHub Actions and comment the result",
    description: "Get the Vercel preview URL in GitHub Actions from deployment_status, run SEO checks against it, fail the job and comment on the pull request.",
    answer: "Trigger the workflow on `deployment_status` and keep the runs whose state is `success`. The preview URL is in `github.event.deployment_status.environment_url`. Look up the open pull request for `GITHUB_SHA`, run your checks against the URL, let a failure fail the job, and post the output with `gh pr comment`. Don't check X-Robots-Tag there: Vercel and Netlify previews send noindex on purpose.",
    sections: [
      {
        heading: "Where does the workflow get the preview URL?",
        blocks: [
          {
            kind: "p",
            text: "By default Vercel notifies GitHub of each deployment with deployment statuses, and GitHub runs any workflow listening for `deployment_status` when a third party provides one. A status set to `inactive` triggers nothing. During the run, `GITHUB_SHA` is the commit being deployed.",
          },
          {
            kind: "p",
            text: "Vercel's own end-to-end example keeps the runs where `github.event.deployment_status.state` is `success` and hands `github.event.deployment_status.environment_url` to the tests as `BASE_URL`. GitHub's REST docs describe `environment_url` as the URL for accessing the environment, here the preview.",
          },
        ],
      },
      {
        heading: "The workflow",
        blocks: [
          {
            kind: "code",
            label: ".github/workflows/seo-preview.yml",
            code: "name: SEO checks on the preview\non: deployment_status\n\npermissions:\n  contents: read\n  pull-requests: write\n\njobs:\n  seo:\n    if: github.event.deployment_status.state == 'success'\n    runs-on: ubuntu-latest\n    env:\n      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n      BASE_URL: ${{ github.event.deployment_status.environment_url }}\n      SITE_URL: https://www.example.com\n      VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}\n    steps:\n      - name: Find the open pull request for this commit\n        id: pr\n        run: |\n          number=$(gh api \"repos/$GITHUB_REPOSITORY/commits/$GITHUB_SHA/pulls\" \\\n            --jq '[.[] | select(.state == \"open\")][0].number // empty')\n          echo \"number=$number\" >> \"$GITHUB_OUTPUT\"\n\n      - uses: actions/checkout@v7\n        if: steps.pr.outputs.number != ''\n      - uses: actions/setup-node@v7\n        if: steps.pr.outputs.number != ''\n        with:\n          node-version: 24\n\n      - name: Run the SEO spec against the preview\n        id: seo\n        if: steps.pr.outputs.number != ''\n        shell: bash # adds -o pipefail, so tee keeps the test exit code\n        run: |\n          npm ci\n          npx playwright install --with-deps chromium\n          npx playwright test tests/seo --reporter=list | tee seo.txt\n\n      - name: Comment on the pull request\n        if: ${{ !cancelled() && steps.pr.outputs.number != '' }}\n        run: |\n          {\n            echo \"SEO checks on $BASE_URL: ${{ steps.seo.outcome }}\"\n            echo '```'\n            tail -n 30 seo.txt\n            echo '```'\n          } > comment.md\n          gh pr comment \"${{ steps.pr.outputs.number }}\" -R \"$GITHUB_REPOSITORY\" \\\n            --body-file comment.md --edit-last --create-if-none",
          },
          {
            kind: "p",
            text: "The test step runs the spec from [SEO testing with Playwright](/guides/seo-testing-playwright); any command that exits non-zero on a problem can take its place. `SITE_URL` is your production origin, which canonicals are compared against. GitHub CLI is preinstalled on GitHub-hosted runners and reads its token from `GH_TOKEN`, set once at job level.",
          },
        ],
      },
      {
        heading: "Which pull request gets the comment?",
        blocks: [
          {
            kind: "p",
            text: "The `deployment_status` payload holds the deployment and its status, and no pull request. The endpoint `GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls` fills the gap: for a commit outside the default branch it returns the open and merged pull requests that contain it, and for a commit on the default branch only the merged one that introduced it.",
          },
          {
            kind: "p",
            text: "Keeping open pull requests only also filters out production. Vercel reports production deployments through the same event, and their commit is usually on the default branch, so the lookup comes back empty and the later steps are skipped. We tried the `--jq` filter on a public repository: a commit from an open pull request returned its number, a commit on the default branch returned nothing.",
          },
          {
            kind: "p",
            text: "Reading that endpoint needs read access to pull requests, and creating the comment needs write access to issues or pull requests, hence `pull-requests: write`. Vercel only deploys a pull request from a fork once you or a team member authorize it, so there is no preview, and no check, before that.",
          },
        ],
      },
      {
        heading: "Failing the job and still posting the comment",
        blocks: [
          {
            kind: "list",
            items: [
              "Without a `shell` key, GitHub runs a Linux step with `bash -e {0}`. With `shell: bash` it runs `bash --noprofile --norc -eo pipefail {0}`. Without `pipefail`, `npx playwright test | tee seo.txt` exits with the status of `tee`, and failing tests leave the job green.",
              "A failed step skips the steps after it, because GitHub applies `success()` to any `if` that has no status function. The comment step uses `!cancelled()`, which GitHub's docs suggest instead of `always()` for a step that must run after a failure.",
              "`steps.seo.outcome` is the step's result before `continue-on-error` applies, so the comment says `failure` when a test failed.",
              "`--edit-last` edits the last comment of the current user and `--create-if-none` posts one when there is none, so each push rewrites a single comment. `GITHUB_TOKEN` authenticates as the GitHub App installed on the repository, so a second workflow commenting with `--edit-last` through it can overwrite this comment.",
            ],
          },
        ],
      },
      {
        heading: "Previews behind Vercel Deployment Protection",
        blocks: [
          {
            kind: "p",
            text: "Standard Protection, available on all Vercel plans, guards every deployment except production domains, so the runner gets Vercel's authentication instead of your page. Generate a Protection Bypass for Automation secret in the project's Deployment Protection settings and send it in the `x-vercel-protection-bypass` header.",
          },
          {
            kind: "p",
            text: "Vercel exposes the secret to deployments as `VERCEL_AUTOMATION_BYPASS_SECRET`. A GitHub runner is not a deployment, so store the same value as a repository secret, as the workflow does, and update it whenever you regenerate the secret in Vercel.",
          },
        ],
      },
      {
        heading: "What to check on a preview, and what to leave out",
        blocks: [
          {
            kind: "p",
            text: "A preview differs from production in ways your code doesn't control. Assert what your templates produce, and skip what the host or the environment changes.",
          },
          {
            kind: "list",
            items: [
              "Check the status of each route without following redirects, the title, the meta description, one canonical whose path matches the route, the robots meta tag, one h1 and an absolute og:image URL.",
              "Leave out the X-Robots-Tag header. Vercel adds `noindex` to deployments from non-production branches, Netlify to Deploy Previews and older branch deploys, so a check on it fails every pull request. Check it on production after each deploy: [pages set to noindex](/docs/issues/indexing-noindex) explains where it comes from.",
              "Compare the host of canonical, og:image and sitemap URLs with production's origin, or leave it out. On Next.js without `metadataBase`, a preview's image URLs use the preview's own domain; [the metadataBase guide](/frameworks/nextjs/metadatabase-not-set) lists the fallbacks.",
              "Leave out robots.txt when it is generated from the environment, since the preview serves the preview's rules. [SEO regression testing](/guides/seo-regression-testing) covers how to test that logic and how to diff the rest against production.",
            ],
          },
          {
            kind: "p",
            text: "Septune's pull-request check draws the same line: it audits the preview and production, matches pages by path and comments what changed, and the preview's noindex header is listed apart and never fails the check.",
          },
        ],
      },
      {
        heading: "Vercel's other trigger: repository_dispatch",
        blocks: [
          {
            kind: "p",
            text: "Vercel lets you switch `deployment_status` events off in the project's Git settings, and points workflows that depend on them to `repository_dispatch` instead. The `vercel.deployment.success` event carries the deployment in `github.event.client_payload`: `url`, `environment`, and `git.ref` and `git.sha` for the branch and the commit.",
          },
          {
            kind: "code",
            label: ".github/workflows/seo-preview.yml (repository_dispatch)",
            code: "on:\n  repository_dispatch:\n    types: [vercel.deployment.success]\n\njobs:\n  seo:\n    if: github.event.client_payload.environment != 'production'\n    runs-on: ubuntu-latest\n    env:\n      BASE_URL: ${{ github.event.client_payload.url }}\n      BRANCH: ${{ github.event.client_payload.git.ref }}\n    steps:\n      # GITHUB_SHA is the default branch here: check out the deployed commit.\n      - uses: actions/checkout@v7\n        with:\n          ref: ${{ github.event.client_payload.git.sha }}\n      # ...same setup and test steps as above, then:\n      # gh pr comment \"$BRANCH\" --body-file comment.md --edit-last --create-if-none",
          },
          {
            kind: "p",
            text: "Two differences trip people up. GitHub only runs a `repository_dispatch` workflow from the default branch and sets `GITHUB_SHA` to its latest commit, so check out `client_payload.git.sha`, or you run the default branch's tests against the pull request's preview. And `gh pr comment` accepts a branch name, which replaces the lookup.",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-broken-page", "indexing-robots-blocks-google", "indexing-canonical-mismatch"],
    sources: [
      {
        label: "GitHub Docs, events that trigger workflows: deployment_status and repository_dispatch",
        url: "https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows",
        read: READ,
      },
      { label: "GitHub REST API, deployment statuses: environment_url", url: "https://docs.github.com/en/rest/deployments/statuses", read: READ },
      {
        label: "GitHub REST API, list pull requests associated with a commit",
        url: "https://docs.github.com/en/rest/commits/commits#list-pull-requests-associated-with-a-commit",
        read: READ,
      },
      {
        label: "GitHub Docs, permissions required for fine-grained tokens",
        url: "https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens",
        read: READ,
      },
      {
        label: "GitHub Docs, workflow syntax: shell",
        url: "https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsshell",
        read: READ,
      },
      {
        label: "GitHub Docs, expressions: status check functions",
        url: "https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions",
        read: READ,
      },
      { label: "GitHub Docs, contexts: steps", url: "https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#steps-context", read: READ },
      { label: "GitHub Docs, GITHUB_TOKEN", url: "https://docs.github.com/en/actions/concepts/security/github_token", read: READ },
      {
        label: "GitHub Docs, using GitHub CLI in workflows",
        url: "https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-github-cli",
        read: READ,
      },
      { label: "GitHub CLI manual, gh pr comment", url: "https://cli.github.com/manual/gh_pr_comment", read: READ },
      {
        label: "Vercel docs, Deploying GitHub projects with Vercel (deployment_status, repository_dispatch)",
        url: "https://vercel.com/docs/git/vercel-for-github",
        read: READ,
      },
      { label: "vercel/repository-dispatch, payload example", url: "https://github.com/vercel/repository-dispatch", read: READ },
      { label: "Vercel docs, Deployment Protection", url: "https://vercel.com/docs/deployment-protection", read: READ },
      {
        label: "Vercel docs, Protection Bypass for Automation",
        url: "https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation",
        read: READ,
      },
      {
        label: "Vercel KB, Are Vercel Preview Deployments indexed by search engines?",
        url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines",
        read: READ,
      },
      { label: "Netlify docs, deploy overview: search engine indexing", url: "https://docs.netlify.com/deploy/deploy-overview/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "seo-regression-testing",
    title: "SEO regression testing: diff each preview with prod",
    h1: "SEO regression testing: compare every deploy with production, page by page",
    description: "What breaks SEO between two deploys (noindex, canonicals, status codes, robots.txt, sitemap, redirects) and a script that diffs a preview with production.",
    answer: "Compare the preview with production on the same paths instead of tracking a score. Fetch each path from both hosts without following redirects and diff the status code, the robots meta tag, the canonical's path and the title, then the paths the sitemap lists. Fail the build on changes that drop pages from search, send the rest to review, and ignore what only the host changes.",
    sections: [
      {
        heading: "What actually regresses in a deploy?",
        blocks: [
          {
            kind: "p",
            text: "The settings that decide indexing live in shared code: a layout, a config file, a route table. One edit there changes every URL built from it, and none of it shows on the page a reviewer opens.",
          },
          {
            kind: "list",
            items: [
              "A noindex added to a layout or left on from staging. Google drops the page from its results once it crawls it and reads the rule.",
              "Canonicals rewritten by a layout, such as a root-level value that resolves to the homepage on every route ([the Next.js case](/frameworks/nextjs/canonical-url)).",
              "Titles: a template change that gives many pages one title, or a page that loses its own.",
              "Status codes. A renamed route answers 404, and Google removes an indexed URL that answers 4xx. URLs that keep answering 5xx are removed as well.",
              "robots.txt. A `Disallow` meant for staging that reaches production, or a file that starts failing: on a 5xx, Google stops crawling the site for the first 12 hours, then uses the last good copy for up to 30 days. A robots.txt answering 4xx is treated as if none existed.",
              "The sitemap: moved, renamed by a plugin update, or answered by a catch-all route with an HTML page.",
              "Redirects. Google takes a 301 or 308 as a signal that the target should be canonical and doesn't read a 302, 303 or 307 that way, so a permanent redirect turned temporary changes which URL gets indexed. See [redirect status codes](/guides/redirect-status-codes).",
            ],
          },
        ],
      },
      {
        heading: "Why compare with production instead of a score?",
        blocks: [
          {
            kind: "p",
            text: "A site score averages many checks over many pages. One page turning noindex barely moves it, and a fix plus a new problem in the same change can cancel out. A fixed threshold also fails pull requests for issues that were already in production, so it blocks changes that broke nothing.",
          },
          {
            kind: "p",
            text: "The question a pull request has to answer is what this change does. Fetch the same paths on production and on the preview, compare them field by field and report only the differences. Production is the baseline because it is what Google has crawled.",
          },
        ],
      },
      {
        heading: "A page-by-page diff in plain Node",
        blocks: [
          {
            kind: "code",
            label: "seo-diff.mjs",
            code: "// node seo-diff.mjs https://www.example.com https://my-branch.example.dev\nconst [prod, preview] = process.argv.slice(2).map((u) => new URL(u).origin);\nconst PATHS = [\"/\", \"/pricing\", \"/blog\", \"/blog/launch\"];\n// Sent to the preview only, when Vercel Deployment Protection guards it.\nconst bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;\nconst headersFor = (origin) => (origin === preview && bypass ? { \"x-vercel-protection-bypass\": bypass } : {});\n\nconst tags = (html, name) => html.match(new RegExp(`<${name}\\\\b[^>]*>`, \"gi\")) ?? [];\nconst attr = (tag, name) => tag.match(new RegExp(`\\\\b${name}\\\\s*=\\\\s*[\"']([^\"']*)[\"']`, \"i\"))?.[1] ?? null;\nconst noindex = (robots) => /noindex|none/i.test(robots);\nconst permanent = (status) => status === 301 || status === 308;\n\nasync function page(origin, path) {\n  const res = await fetch(origin + path, { redirect: \"manual\", headers: headersFor(origin) });\n  const html = (res.headers.get(\"content-type\") ?? \"\").includes(\"text/html\") ? await res.text() : \"\";\n  const canonical = tags(html, \"link\").find((t) => attr(t, \"rel\")?.toLowerCase() === \"canonical\");\n  return {\n    status: res.status,\n    title: html.match(/<title[^>]*>([^<]*)<\\/title>/i)?.[1].trim() ?? null,\n    robots: tags(html, \"meta\").filter((t) => attr(t, \"name\")?.toLowerCase() === \"robots\").map((t) => attr(t, \"content\")).join(\", \"),\n    // Path only: the preview's canonical may name either host.\n    canonical: canonical ? new URL(attr(canonical, \"href\"), origin + path).pathname : null,\n  };\n}\n\nasync function sitemap(origin) {\n  const res = await fetch(`${origin}/sitemap.xml`, { headers: headersFor(origin) });\n  if (!res.ok) return null;\n  const xml = await res.text();\n  return new Set([...xml.matchAll(/<loc>\\s*([^<\\s]+)\\s*<\\/loc>/g)].map((m) => new URL(m[1]).pathname));\n}\n\nconst fail = [];\nconst review = [];\nfor (const path of PATHS) {\n  const [a, b] = await Promise.all([page(prod, path), page(preview, path)]);\n  if (a.status !== b.status) {\n    const broke = a.status < 300 || (permanent(a.status) && !permanent(b.status));\n    (broke ? fail : review).push(`${path}: status ${a.status} -> ${b.status}`);\n  }\n  if (!noindex(a.robots) && noindex(b.robots)) fail.push(`${path}: robots meta now \"${b.robots}\"`);\n  if (a.canonical !== b.canonical) fail.push(`${path}: canonical ${a.canonical} -> ${b.canonical}`);\n  if (a.title !== b.title) review.push(`${path}: title \"${a.title}\" -> \"${b.title}\"`);\n}\nconst [before, after] = await Promise.all([sitemap(prod), sitemap(preview)]);\nif (before && !after) fail.push(\"sitemap.xml stopped answering 2xx\");\nif (before && after) for (const p of before) if (!after.has(p)) review.push(`sitemap no longer lists ${p}`);\n\nfor (const line of fail) console.log(`FAIL    ${line}`);\nfor (const line of review) console.log(`REVIEW  ${line}`);\nif (fail.length) process.exitCode = 1;",
          },
          {
            kind: "p",
            text: "Pass the production origin first and the preview second. With `redirect: \"manual\"`, Node's `fetch` returns the 3xx response itself, so a 301 that became a 302 shows up. The regexes find tags whatever the order of their attributes, which is enough here though they are no HTML parser, and no JavaScript runs, so the script sees what a crawler that renders nothing gets.",
          },
          {
            kind: "p",
            text: "We ran it on Node 24.11.1 against two local servers built to differ. It reported a new robots noindex, a canonical pointing at the homepage, a page that started answering 404, a 301 that became a 302 and a URL missing from the sitemap, and it ignored an X-Robots-Tag header and the preview host in the sitemap. It exits with code 1 when it prints a FAIL line, which fails the step that runs it ([wiring it into a pull request](/guides/seo-checks-in-ci)).",
          },
        ],
      },
      {
        heading: "Which differences should fail the build?",
        blocks: [
          {
            kind: "list",
            items: [
              "Fail: a path that answered 2xx on production and doesn't on the preview, a 301 or 308 that stops being a permanent redirect, a robots meta tag that gains noindex, a canonical whose path changes, a sitemap that stops answering.",
              "Review: a changed title, a path the sitemap no longer lists, a 404 that now answers 200 or redirects. These are often the point of the change, so a person decides.",
              "Ignore: the host in canonicals and sitemap URLs, and response headers the host adds to previews, such as `X-Robots-Tag: noindex`.",
            ],
          },
          {
            kind: "p",
            text: "A canonical changed on purpose fails too. Keep a short list of reviewed paths in the script rather than loosening the rule for every page.",
          },
        ],
      },
      {
        heading: "What a preview can't tell you",
        blocks: [
          {
            kind: "p",
            text: "Some answers depend on the environment. When robots.txt or an X-Robots-Tag header is built from a variable such as `VERCEL_ENV`, the preview serves the preview's version, and comparing it with production says nothing about what production will serve after the merge. Test that branch of the code on its own, then run checks against the production domain right after each deploy, for example [the Playwright spec](/guides/seo-testing-playwright) with `SEO_ENV=production`.",
          },
          {
            kind: "p",
            text: "Use the production domain as the baseline, not a deployment URL. Vercel adds `X-Robots-Tag: noindex` to the previous production deployment once a new one is promoted, so an older deployment URL shows a noindex the live site doesn't have.",
          },
        ],
      },
      {
        heading: "Which paths to compare",
        blocks: [
          {
            kind: "p",
            text: "Start with one path per template, since a layout change shows on every page built from it: the homepage, one article, one product or docs page, one listing. Add the pages that bring traffic, and read production's sitemap for a wider run. If that file is a sitemap index, its `<loc>` entries are child sitemaps to fetch in turn.",
          },
          {
            kind: "p",
            text: "Septune's pull-request check works from a crawl of both versions instead of a fixed list, fails when pages would leave search (a new noindex, pages that start failing, robots.txt blocking Google) and reports the differences that only come from the preview environment separately.",
          },
        ],
      },
    ],
    rules: [
      "indexing-noindex",
      "indexing-canonical-mismatch",
      "indexing-robots-blocks-pages",
      "indexing-sitemap-format",
    ],
    sources: [
      {
        label: "Google Search Central, block indexing with noindex",
        url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing",
        read: READ,
      },
      {
        label: "Google Search Central, HTTP status codes and network errors",
        url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors",
        read: READ,
      },
      {
        label: "Google Search Central, how Google interprets robots.txt",
        url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec",
        read: READ,
      },
      {
        label: "Google Search Central, redirects and Google Search",
        url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects",
        read: READ,
      },
      { label: "sitemaps.org, the sitemap protocol: sitemap index files", url: "https://www.sitemaps.org/protocol.html", read: READ },
      {
        label: "Vercel KB, Are Vercel Preview Deployments indexed by search engines?",
        url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines",
        read: READ,
      },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "staging-site-indexed",
    title: "Staging site indexed by Google: get it out, keep it out",
    h1: "Staging site indexed by Google: how it got in and how to get it out",
    description: "How staging and preview copies end up in Google, how to remove them with noindex, the Removals tool and a password, and why a robots.txt Disallow won't.",
    answer: "Hide the staging URLs now with Search Console's Removals tool, which keeps them out of results for about six months. Before that runs out, make it permanent: serve `X-Robots-Tag: noindex` and leave the pages crawlable so Googlebot reads it, or put staging behind a password, which Google also counts as permanent. A robots.txt `Disallow` alone removes nothing.",
    sections: [
      {
        heading: "How does a staging site end up in Google?",
        blocks: [
          {
            kind: "p",
            text: "Staging gets indexed when Google can fetch it and nothing asks it to keep the pages out. Each of these setups gives it both:",
          },
          {
            kind: "list",
            items: [
              "A custom domain on a branch. Vercel sends `X-Robots-Tag: noindex` on deployments from non-production branches, but omits it when a custom domain such as `staging.example.com` is assigned to the branch.",
              "A Netlify branch deploy. Netlify adds the header to Deploy Previews and older branch deploys, not to the latest deploy of each branch, so a `staging` branch's current deploy can be indexed.",
              "A server you run, built from the production configuration, which sends no noindex because production doesn't.",
              "A link that leaks the address, such as a staging URL left in a sitemap or an absolute staging link pasted into published content.",
            ],
          },
        ],
      },
      {
        heading: "Check what staging sends right now",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI https://staging.example.com/some/page | grep -iE '^(HTTP|x-robots-tag)'\ncurl -s https://staging.example.com/some/page | grep -io '<meta[^>]*name=\"robots\"[^>]*>'",
          },
          {
            kind: "p",
            text: "Expect a 401 if staging sits behind HTTP Basic authentication, or an `x-robots-tag: noindex` line if it stays public. Try a deep page as well as the homepage, since a header set for one path pattern can miss others. For a public staging URL, the [noindex checker](/tools/noindex-checker) shows the status, the header, the robots and googlebot tags, robots.txt and the canonical in one go.",
          },
          {
            kind: "p",
            text: "To see what Google holds, add staging to Search Console. A Domain property, verified with a DNS record, covers every subdomain and both protocols; a URL-prefix property covers only URLs that start with the address you enter. URL Inspection then shows the indexed version of a staging URL.",
          },
        ],
      },
      {
        heading: "Get the pages out, in this order",
        blocks: [
          {
            kind: "list",
            items: [
              "Hide them now. In the Removals tool, a temporary removal of the staging root with \"Remove all URLs with this prefix\" hides every URL under it from Google Search for about six months. It needs a property you own that covers the staging host; http and https, www and non-www variants match, other subdomains don't. Google keeps crawling the URLs meanwhile.",
              "Make it permanent before those six months end. While staging stays public, send noindex on every response, as an `X-Robots-Tag` header or a robots meta tag, and leave the pages crawlable: Google drops a page once it fetches it and reads the rule. If nobody outside needs access, a password does the job: Google's Removals help lists blocking access with one among the permanent ways out, and HTTP Basic authentication answers with a 4xx code, which makes Google remove an indexed URL on its next fetch.",
              "Request a recrawl in URL Inspection for the URLs that matter. Google says it can otherwise take a long time to revisit a page, depending on its importance.",
              "Keep it locked. A header only asks: Vercel's docs point out that anyone with the URL can still open a noindexed deployment, and Netlify calls the header no guarantee against search results.",
            ],
          },
        ],
      },
      {
        heading: "Why doesn't Disallow: / in robots.txt remove the pages?",
        blocks: [
          {
            kind: "p",
            text: "Google's robots.txt introduction says the file is not a mechanism for keeping a page out of Google: a blocked URL that other pages link to can still appear in results, without a description. Its noindex documentation gives the other half: the rule only works on a page robots.txt doesn't block, because Googlebot has to fetch the page to read it. A `Disallow: /` added in a hurry freezes the indexed staging URLs where they are, and the Removals help page warns against using robots.txt to block them. The report Search Console shows for those URLs is covered in [blocked by robots.txt](/search-console/blocked-by-robots-txt).",
          },
        ],
      },
      {
        heading: "Sending noindex from the server",
        blocks: [
          {
            kind: "p",
            text: "On Vercel with Next.js, decide from the build environment. `VERCEL` is `1` on Vercel and `VERCEL_ENV` is `production`, `preview` or `development`, so this covers a branch with a custom domain and leaves a self-hosted production build alone. Both variables exist only when the project has system environment variables enabled.",
          },
          {
            kind: "code",
            label: "next.config.mjs",
            code: "// VERCEL is set on Vercel builds only, so a self-hosted production build is untouched.\nconst isStaging = process.env.VERCEL === \"1\" && process.env.VERCEL_ENV !== \"production\";\n\nexport default {\n  async headers() {\n    if (!isStaging) return [];\n    return [{ source: \"/:path*\", headers: [{ key: \"X-Robots-Tag\", value: \"noindex\" }] }];\n  },\n};",
          },
          {
            kind: "p",
            text: "Without Next.js, or for one domain only, Vercel's guide uses a `vercel.json` header with a host condition:",
          },
          {
            kind: "code",
            label: "vercel.json",
            code: "{\n  \"headers\": [\n    {\n      \"source\": \"/(.*)\",\n      \"has\": [{ \"type\": \"host\", \"value\": \"staging.example.com\" }],\n      \"headers\": [{ \"key\": \"X-Robots-Tag\", \"value\": \"noindex\" }]\n    }\n  ]\n}",
          },
          {
            kind: "p",
            text: "On nginx, `add_header` only applies to 200, 201, 204, 206, 301 to 304, 307 and 308 responses unless you add `always`, and a `location` that declares its own `add_header` drops the ones inherited from `server`. The header itself is covered in [the X-Robots-Tag guide](/guides/x-robots-tag).",
          },
          {
            kind: "code",
            label: "/etc/nginx/conf.d/staging.conf",
            code: "server {\n    server_name staging.example.com;\n\n    # \"always\" also covers 404 and 500 responses.\n    add_header X-Robots-Tag \"noindex\" always;\n\n    location / {\n        auth_basic           \"Staging\";\n        auth_basic_user_file /etc/nginx/htpasswd;\n        # An add_header here would drop the server-level one above.\n    }\n}",
          },
        ],
      },
      {
        heading: "Preview protection on Vercel and Netlify",
        blocks: [
          {
            kind: "list",
            items: [
              "Vercel: Standard Protection, available on all plans, protects every deployment except production domains, with Vercel Authentication, or with Password Protection, which is a paid add-on on Pro and not offered on Hobby. CI then reaches previews through Protection Bypass for Automation.",
              "Netlify: the docs recommend a private project through project visibility (credit-based plans, with a Previews only scope on Pro) or Password Protection limited to non-production deploys, a scope its password protection page reserves to Enterprise plans. A `Basic-Auth` rule in `_headers` covers a path on Pro and Enterprise plans.",
              "Your own server: HTTP Basic authentication with `auth_basic`, as in the nginx block above.",
            ],
          },
          {
            kind: "p",
            text: "Septune reports pages whose robots meta tag or X-Robots-Tag header says noindex, with the source of each. Pointed at a public staging site, the report shows whether the header reaches every page; pointed at production, whether it leaked there. See [pages set to noindex](/docs/issues/indexing-noindex).",
          },
        ],
      },
    ],
    rules: ["indexing-noindex", "indexing-robots-blocks-google"],
    sources: [
      { label: "Google Search Console Help, Removals tool", url: "https://support.google.com/webmasters/answer/9689846", read: READ },
      {
        label: "Google Search Central, block indexing with noindex",
        url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing",
        read: READ,
      },
      {
        label: "Google Search Central, introduction to robots.txt",
        url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
        read: READ,
      },
      {
        label: "Google Search Central, HTTP status codes and network errors",
        url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors",
        read: READ,
      },
      { label: "Google Search Console Help, add a website property", url: "https://support.google.com/webmasters/answer/34592", read: READ },
      { label: "Google Search Console Help, URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289", read: READ },
      {
        label: "Vercel KB, Are Vercel Preview Deployments indexed by search engines?",
        url: "https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines",
        read: READ,
      },
      { label: "Vercel docs, Deployment Protection", url: "https://vercel.com/docs/deployment-protection", read: READ },
      { label: "Vercel docs, system environment variables", url: "https://vercel.com/docs/environment-variables/system-environment-variables", read: READ },
      { label: "Vercel docs, vercel.json headers", url: "https://vercel.com/docs/project-configuration/vercel-json#headers", read: READ },
      { label: "Next.js docs, headers in next.config.js", url: "https://nextjs.org/docs/app/api-reference/config/next-config-js/headers", read: READ },
      { label: "Netlify docs, deploy overview: search engine indexing", url: "https://docs.netlify.com/deploy/deploy-overview/", read: READ },
      { label: "Netlify docs, password protection", url: "https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/", read: READ },
      {
        label: "Netlify docs, basic authentication with custom headers",
        url: "https://docs.netlify.com/manage/security/secure-access-to-sites/basic-authentication-with-custom-http-headers/",
        read: READ,
      },
      { label: "nginx docs, add_header", url: "https://nginx.org/en/docs/http/ngx_http_headers_module.html", read: READ },
      { label: "nginx docs, auth_basic", url: "https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html", read: READ },
      { label: "RFC 7617, the Basic HTTP authentication scheme (the 401 challenge)", url: "https://www.rfc-editor.org/rfc/rfc7617.html", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

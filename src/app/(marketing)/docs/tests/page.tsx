import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { STARTER_CONFIG } from "@/lib/audit/contracts";

export const metadata: Metadata = {
  title: "SEO tests: write contracts for your pages in septune.yml",
  description:
    "Describe what each kind of page must have (status, canonical, H1, JSON-LD types, word count, inbound links) in septune.yml. Septune tests it on every deploy and fails the pull request when a contract breaks.",
  alternates: { canonical: "/docs/tests" },
};

const PUBLISHED = "2026-11-17";
const UPDATED = "2026-11-17";

const LINK =
  "text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-xs leading-relaxed text-fg-muted">
      <code>{children}</code>
    </pre>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs">{children}</span>;
}

const ASSERTIONS: { key: string; value: string; fails: string }[] = [
  { key: "status", value: "200", fails: "the page answers with another HTTP status" },
  { key: "indexable", value: "true | false", fails: "a noindex (robots meta, googlebot meta, X-Robots-Tag) or an error status contradicts it" },
  { key: "canonical", value: "self | a URL or path", fails: "the canonical is missing or points elsewhere" },
  { key: "h1", value: "present | exact text", fails: "there is no H1, or none equals the text (case ignored)" },
  { key: "title", value: "present", fails: "the page has no title" },
  { key: "schema", value: "[Product, Offer]", fails: "a JSON-LD @type is missing (nested and @graph nodes count)" },
  { key: "min_words", value: "150", fails: "the visible text is shorter" },
  { key: "links_in_min", value: "2", fails: "fewer crawled pages link to it" },
];

export default function TestsDocsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "SEO tests", path: "/docs/tests" },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: "SEO tests in septune.yml",
          description: "Per-URL-pattern SEO contracts, exceptions with a reason, and a failure threshold, tested on every deploy.",
          path: "/docs/tests",
          datePublished: PUBLISHED,
          dateModified: UPDATED,
        })}
      />
      <ProsePage
        title="SEO tests in septune.yml"
        intro="The built-in checks know what a healthy site looks like in general. A contract says what your product pages, your articles or your landing pages must have, and fails the deploy when they stop having it, the way a unit test does."
      >
        <p className="text-xs text-fg-subtle">
          Published <time dateTime={PUBLISHED}>{formatDay(PUBLISHED)}</time>
        </p>

        <ProseBlock heading="Start in a minute">
          <p>
            Run <Mono>npx septune init</Mono> at the root of your project. It writes a <Mono>septune.yml</Mono> (the
            name <Mono>.septune.yml</Mono> works too) with commented examples. Then point it at a deployed or local
            site:
          </p>
          <CodeBlock>{`npx septune test https://preview.your-site.com
npx septune test http://localhost:3000 --pages 50`}</CodeBlock>
          <p className="mt-3">
            <Mono>septune test</Mono> crawls, runs only your contracts and exits <Mono>1</Mono> when one fails at the
            level you set. It is faster than a full audit, which makes it fit for every pull request. The CLI, the{" "}
            <Link href="/docs/agent" className={LINK}>
              MCP server
            </Link>{" "}
            (the <Mono>run_contracts</Mono> tool) and the GitHub Action read the same file, searched from the working
            directory upward.
          </p>
        </ProseBlock>

        <ProseBlock heading="The file">
          <CodeBlock>{STARTER_CONFIG}</CodeBlock>
        </ProseBlock>

        <ProseBlock heading="Patterns">
          <p>
            <Mono>match</Mono> is a path glob. <Mono>*</Mono> stands for one segment: <Mono>/products/*</Mono> matches{" "}
            <Mono>/products/lamp</Mono> but not <Mono>/products/lamp/reviews</Mono>. Use <Mono>**</Mono> for any depth:{" "}
            <Mono>/blog/**</Mono>. A trailing slash makes no difference. A contract whose pattern matches no crawled
            page does not fail; the report warns you, because it usually means a typo or a crawl too short to reach
            those pages.
          </p>
        </ProseBlock>

        <ProseBlock heading="Assertions">
          <p>A contract needs a match and at least one assertion. All of them are checked on every matching page.</p>
          <ul className="mt-3 space-y-2">
            {ASSERTIONS.map((a) => (
              <li key={a.key} className="text-sm text-fg-muted">
                <span className="font-mono text-xs text-fg">
                  {a.key}: {a.value}
                </span>
                . Fails when {a.fails}.
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Each failed assertion becomes a finding in the same shape as the built-in ones: a rule id (
            <Mono>contract-canonical</Mono>, <Mono>contract-schema</Mono>…), the pages, the value expected, the value
            found, and the evidence. For example,{" "}
            <Mono>/products/lamp: expected JSON-LD Product, Offer, found Product (missing Offer)</Mono>.
          </p>
        </ProseBlock>

        <ProseBlock heading="Keep the check switched on">
          <p>
            A check that blocks pull requests for the wrong reason ends up disabled. Two settings keep that from
            happening.
          </p>
          <p className="mt-3">
            <Mono>severity</Mono> on a contract (critical, high, medium or low; high by default) says how much a
            failure counts. <Mono>fail_on</Mono> at the top of the file (critical, high or medium; high by default)
            says where the build stops. A medium finding then shows in the report without blocking. The threshold
            applies to <Mono>septune test</Mono> and to <Mono>septune diff</Mono>, where a critical change such as a
            page that now errors or a new noindex always fails. Passing <Mono>--fail-on</Mono> on the command line
            overrides the file.
          </p>
          <p className="mt-3">
            <Mono>ignore</Mono> silences one rule on one pattern, and must say why:
          </p>
          <CodeBlock>{`ignore:
  - match: /legal/*
    rules: [structure-thin-content]
    reason: Legal pages are short by design.`}</CodeBlock>
          <p className="mt-3">
            <Mono>rules</Mono> takes any id from the{" "}
            <Link href="/docs" className={LINK}>
              check catalog
            </Link>{" "}
            or a contract rule id. The exception applies to <Mono>test</Mono>, <Mono>audit</Mono> and <Mono>diff</Mono>.
            Nothing disappears silently: the report ends with an &quot;ignored by septune.yml&quot; list showing each
            page, the rule and your reason, and a file with an exception but no reason is refused.
          </p>
        </ProseBlock>

        <ProseBlock heading="In CI">
          <p>
            The GitHub Action runs <Mono>septune test</Mono> before the audit whenever a <Mono>septune.yml</Mono>{" "}
            exists (input <Mono>contracts: auto</Mono>; <Mono>true</Mono> and <Mono>false</Mono> force it) and writes
            the failures to the job summary. Contracts crawl the URL you give, so aim them at the preview deployment,
            not at localhost.
          </p>
          <CodeBlock>{`- uses: Barbudda/septune@v0.3.0
  with:
    url: \${{ steps.deploy.outputs.preview_url }}
    pages: 24`}</CodeBlock>
        </ProseBlock>

        <ProseBlock heading="Errors in the file">
          <p>
            A mistake stops the run before any crawl, with the line and the key, for example{" "}
            <Mono>septune.yml:12 (contracts[0].min_words): must be a non-negative integer</Mono>. Unknown keys, a
            pattern that does not start with a slash, an unknown rule id and an exception without a reason are all
            refused. The parser reads a small YAML subset (mappings, lists, inline lists, comments); anchors and inline
            maps are not supported.
          </p>
        </ProseBlock>
      </ProsePage>
    </>
  );
}

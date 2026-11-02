import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { RULE_PAGES, firstSentence, type RulePage } from "@/lib/audit/rule-docs";
import { FIXABLE_RULE_IDS } from "@/lib/audit/deterministic-fix";

export const metadata: Metadata = {
  title: "Docs: every check Septune runs on your pages",
  description: `The ${RULE_PAGES.length} technical SEO checks Septune runs on a site: what fails, what is measured, and how to fix it in Next.js, Nuxt, Astro or SvelteKit.`,
  alternates: { canonical: "/docs" },
};

// Order of the sections: what can take a site out of search first.
const CATEGORIES: { id: RulePage["category"]; label: string }[] = [
  { id: "indexing", label: "Indexing" },
  { id: "metadata", label: "Metadata" },
  { id: "structure", label: "Page structure" },
  { id: "performance", label: "Performance" },
  { id: "internal-linking", label: "Internal linking" },
  { id: "images", label: "Images" },
  { id: "schema", label: "Structured data" },
  { id: "framework", label: "Framework files" },
];

// The index changes when a rule page does.
const LAST_RULE_CHANGE = RULE_PAGES.map((r) => r.updated).sort().at(-1)!;

const LINK =
  "text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright";

export default function DocsPage() {
  const groups = CATEGORIES.map((c) => ({ ...c, rules: RULE_PAGES.filter((r) => r.category === c.id) })).filter(
    (g) => g.rules.length > 0,
  );

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: "Every check Septune runs",
          description: `The ${RULE_PAGES.length} technical SEO checks Septune runs, with what fails, what is measured and the fix.`,
          path: "/docs",
          datePublished: "2026-07-06",
          dateModified: LAST_RULE_CHANGE,
        })}
      />
      <ProsePage
        title="Every check Septune runs"
        intro={`Septune runs ${RULE_PAGES.length} checks in ${groups.length} categories on the rendered pages of a site. Each page below shows the markup that fails, what the crawler measures, the fix, and how to confirm it's gone.`}
      >
        <p className="text-xs text-fg-subtle">
          Updated <time dateTime={LAST_RULE_CHANGE}>{formatDay(LAST_RULE_CHANGE)}</time>
        </p>
        <ProseBlock heading="Getting started">
          <p>
            Run <span className="font-mono text-xs">npx septune audit &lt;url&gt;</span> or the{" "}
            <Link href="/audit" className={LINK}>
              free audit
            </Link>
            , then add the pull-request check and monitoring. Issues are scored by impact, effort and risk; each one
            lists the affected URLs and the files most likely behind it. For {FIXABLE_RULE_IDS.length} of the checks
            Septune also writes the patch, and the page shows it for each framework. Septune never writes to your
            repository. You can also{" "}
            <Link href="/docs/agent" className={LINK}>
              use the Septune agent directly in your editor
            </Link>{" "}
            via MCP, or read how the checks map to{" "}
            <Link href="/frameworks/nextjs" className={LINK}>
              technical SEO for Next.js
            </Link>
            .
          </p>
        </ProseBlock>
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`cat-${g.id}`}>
            <h2 id={`cat-${g.id}`} className="text-lg font-semibold text-fg">
              {g.label} <span className="font-normal text-fg-subtle">({g.rules.length})</span>
            </h2>
            <ul className="mt-3 space-y-2">
              {g.rules.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/docs/issues/${r.id}`}
                    className="group flex items-center justify-between gap-4 lg lg-thin rounded-xl px-4 py-3 transition-colors hover:border-molten/40"
                  >
                    <span>
                      <span className="text-sm font-medium text-fg">{r.title}</span>
                      <span className="mt-0.5 block text-xs text-fg-muted">{firstSentence(r.summary)}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-molten-bright" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </ProsePage>
    </>
  );
}

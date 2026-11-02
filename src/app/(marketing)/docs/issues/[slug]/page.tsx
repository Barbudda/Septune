import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { guidesForRule, nearestTo, type RelatedLink } from "@/lib/seo/related";
import {
  DOC_FRAMEWORKS,
  LEGACY_DOC_SLUGS,
  RULE_PAGES,
  fixTemplateFor,
  getRulePage,
  pageTitle,
  patchBody,
} from "@/lib/audit/rule-docs";

export function generateStaticParams() {
  return RULE_PAGES.map((r) => ({ slug: r.id }));
}

const CATEGORY_LABEL: Record<string, string> = {
  metadata: "Metadata",
  indexing: "Indexing",
  structure: "Page structure",
  images: "Images",
  schema: "Structured data",
  "internal-linking": "Internal linking",
  performance: "Performance",
  framework: "Framework files",
};

const IMPACT_LABEL: Record<string, string> = {
  critical: "Critical impact",
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const rule = getRulePage(slug);
  if (!rule) return {};
  return {
    title: pageTitle(rule),
    description: rule.summary.length > 158 ? `${rule.summary.slice(0, 155).replace(/\s+\S*$/, "")}…` : rule.summary,
    alternates: { canonical: `/docs/issues/${rule.id}` },
  };
}

function Code({ children, label }: { children: string; label?: string }) {
  return (
    <figure className="mt-3">
      {label && <figcaption className="mb-1.5 text-xs text-fg-subtle">{label}</figcaption>}
      <pre className="overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-xs leading-relaxed text-fg-muted">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

export default async function IssueDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const legacy = LEGACY_DOC_SLUGS[slug];
  if (legacy) permanentRedirect(`/docs/issues/${legacy}`);
  if (slug === "framework-metadata-api") permanentRedirect("/docs");
  const rule = getRulePage(slug);
  if (!rule) notFound();

  // Frameworks that get the very same diff (a static robots.txt, say) share one block.
  const patches: { names: string[]; files: string; diff: string }[] = [];
  for (const fw of DOC_FRAMEWORKS) {
    const fix = fixTemplateFor(rule.id, fw.id);
    if (!fix) continue;
    const same = patches.find((p) => p.diff === fix.diff);
    if (same) same.names.push(fw.name);
    else patches.push({ names: [fw.name], files: fix.filesChanged.join(", "), diff: fix.diff });
  }
  // The checks chosen by hand, then the pages nearest in topic and the
  // guides for this check: each page links to what it is closest to.
  const chosen = rule.related.map((id) => getRulePage(id)).filter((r) => r !== undefined);
  const related: RelatedLink[] = [];
  for (const link of [
    ...chosen.map((r) => ({ path: `/docs/issues/${r.id}`, title: r.title })),
    ...nearestTo(rule.id),
    ...guidesForRule(rule.id),
  ]) {
    if (!related.some((r) => r.path === link.path)) related.push(link);
  }
  const path = `/docs/issues/${rule.id}`;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: rule.title, path },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: rule.title,
          description: rule.summary,
          path,
          datePublished: rule.published,
          dateModified: rule.updated,
        })}
      />
      <ProsePage title={rule.title} intro={rule.summary}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="lg lg-thin rounded-full px-3 py-1 text-fg-muted">{CATEGORY_LABEL[rule.category] ?? rule.category}</span>
          <span className="lg lg-thin rounded-full px-3 py-1 text-fg-muted">{IMPACT_LABEL[rule.impact] ?? rule.impact}</span>
          {patches.length > 0 && (
            <span className="rounded-full border border-signal/30 bg-signal/[0.06] px-3 py-1 text-signal">Ready patch</span>
          )}
          <span className="font-mono text-fg-subtle">ruleId: {rule.id}</span>
        </div>
        <p className="text-xs text-fg-subtle">
          Published <time dateTime={rule.published}>{formatDay(rule.published)}</time>
          {rule.updated !== rule.published && (
            <>
              {" "}· updated <time dateTime={rule.updated}>{formatDay(rule.updated)}</time>
            </>
          )}
        </p>

        <ProseBlock heading="What fails">
          <Code label={rule.failing.label}>{rule.failing.code}</Code>
        </ProseBlock>

        <ProseBlock heading="What Septune measures">
          <p>{rule.measured}</p>
        </ProseBlock>

        <ProseBlock heading="If you leave it">
          <p>{rule.consequence}</p>
        </ProseBlock>

        <ProseBlock heading="How to fix it">
          <p>{rule.fix}</p>
          {rule.frameworks && (
            <ul className="mt-4 space-y-2">
              {DOC_FRAMEWORKS.filter((fw) => rule.frameworks?.[fw.id]).map((fw) => (
                <li key={fw.id}>
                  <Link
                    href={`/frameworks/${fw.id}`}
                    className="font-medium text-fg underline decoration-fg/30 underline-offset-2 hover:decoration-fg"
                  >
                    {fw.name}
                  </Link>
                  : {rule.frameworks![fw.id]}
                </li>
              ))}
            </ul>
          )}
          {patches.length > 0 && (
            <div className="mt-6 space-y-3">
              <p>
                Septune generates this patch for you. Here is what it writes for each framework, on a site served from
                example.com:
              </p>
              {patches.map(({ names, files, diff }) => (
                <details key={files + names[0]} className="lg lg-thin rounded-xl px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-fg">
                    {names.join(", ")}: {files}
                  </summary>
                  <Code>{patchBody(diff)}</Code>
                </details>
              ))}
            </div>
          )}
        </ProseBlock>

        <ProseBlock heading="Check it's fixed">
          <p>{rule.verify}</p>
        </ProseBlock>

        {related.length > 0 && (
          <ProseBlock heading="Related checks and guides">
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.path}>
                  <Link
                    href={r.path}
                    className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </ProseBlock>
        )}

        <Link
          href="/docs"
          className="inline-flex items-center gap-2 text-sm text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright"
        >
          <ArrowLeft className="size-4" />
          All {RULE_PAGES.length} checks
        </Link>
      </ProsePage>
    </>
  );
}

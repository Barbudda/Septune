import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { GuideBlocks, PROSE_LINK } from "@/components/marketing/guide-blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { FIXABLE_RULE_IDS } from "@/lib/audit/deterministic-fix";
import { firstSentence, getRulePage } from "@/lib/audit/rule-docs";
import { getFramework } from "@/lib/seo/content";
import { GUIDES, getGuide, guidesFor } from "@/lib/seo/guides";
import { nearestTo } from "@/lib/seo/related";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.framework, guide: g.slug }));
}

type Params = Promise<{ slug: string; guide: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, guide: name } = await params;
  const guide = getGuide(slug, name);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/frameworks/${guide.framework}/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Params }) {
  const { slug, guide: name } = await params;
  const guide = getGuide(slug, name);
  const fw = getFramework(slug);
  if (!guide || !fw) notFound();

  const path = `/frameworks/${guide.framework}/${guide.slug}`;
  const rules = guide.rules.map((id) => getRulePage(id)!);
  const others = guidesFor(guide.framework).filter((g) => g.slug !== guide.slug);
  // The nearest pages elsewhere on the site, minus those already listed.
  const listed = new Set([...guide.rules.map((id) => `/docs/issues/${id}`), ...others.map((g) => `/frameworks/${g.framework}/${g.slug}`)]);
  const related = nearestTo(`${guide.framework}/${guide.slug}`).filter((r) => !listed.has(r.path));

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: fw.name, path: `/frameworks/${fw.slug}` },
          { name: guide.h1, path },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: guide.h1,
          description: guide.description,
          path,
          datePublished: guide.published,
          dateModified: guide.updated,
        })}
      />
      <ProsePage title={guide.h1} intro={guide.answer.replace(/`/g, "")}>
        <p className="text-xs text-fg-subtle">
          <Link href={`/frameworks/${fw.slug}`} className={PROSE_LINK}>
            Technical SEO for {fw.name}
          </Link>{" "}
          · Published <time dateTime={guide.published}>{formatDay(guide.published)}</time>
          {guide.updated !== guide.published && (
            <>
              {" "}
              · updated <time dateTime={guide.updated}>{formatDay(guide.updated)}</time>
            </>
          )}
        </p>

        {guide.sections.map((section) => (
          <ProseBlock key={section.heading} heading={section.heading}>
            <GuideBlocks blocks={section.blocks} />
          </ProseBlock>
        ))}

        <ProseBlock heading="Septune checks">
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule.id}>
                <Link href={`/docs/issues/${rule.id}`} className={PROSE_LINK}>
                  {rule.title}
                </Link>
                {FIXABLE_RULE_IDS.includes(rule.id) && <span className="text-fg-subtle"> (with a patch)</span>}
                <span className="text-fg-muted">: {firstSentence(rule.summary)}</span>
              </li>
            ))}
          </ul>
        </ProseBlock>

        <ProseBlock heading="Sources">
          <ul className="space-y-2">
            {guide.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} className={PROSE_LINK}>
                  {s.label}
                </a>
                <span className="text-fg-subtle">, read {formatDay(s.read)}</span>
              </li>
            ))}
          </ul>
        </ProseBlock>

        {others.length > 0 && (
          <ProseBlock heading={`More ${fw.name} guides`}>
            <ul className="space-y-2">
              {others.map((g) => (
                <li key={g.slug}>
                  <Link href={`/frameworks/${g.framework}/${g.slug}`} className={PROSE_LINK}>
                    {g.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </ProseBlock>
        )}

        {related.length > 0 && (
          <ProseBlock heading="Related pages">
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.path}>
                  <Link href={r.path} className={PROSE_LINK}>
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </ProseBlock>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/audit"
            className="lg lg-molten inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium rounded-full transition-[filter] hover:brightness-110"
          >
            Check your {fw.name} site
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-sm text-fg-subtle">Free, 3 pages, no signup.</p>
        </div>
      </ProsePage>
    </>
  );
}

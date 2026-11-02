import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { GuideBlocks, PROSE_LINK as LINK } from "@/components/marketing/guide-blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, faqPageSchema, techArticleSchema } from "@/lib/seo/schema";
import { RULE_CATALOG } from "@/lib/audit/catalog";
import { FRAMEWORK_FILES, type FileKind } from "@/lib/audit/engine";
import { FIXABLE_RULE_IDS } from "@/lib/audit/deterministic-fix";
import { RULE_PAGES, fixTemplateFor, getRulePage, patchBody, type DocFramework } from "@/lib/audit/rule-docs";
import { FRAMEWORK_PAGES, getFramework, type FrameworkPage } from "@/lib/seo/content";
import { guidesFor } from "@/lib/seo/guides";

export function generateStaticParams() {
  return FRAMEWORK_PAGES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fw = getFramework(slug);
  if (!fw) return {};
  return {
    title: `Technical SEO for ${fw.name}, checked on every deploy`,
    description: `Septune audits ${fw.name} sites like Googlebot, fails the pull request that would drop pages from Google, and gives ready ${fw.name} patches for mechanical fixes.`,
    alternates: { canonical: `/frameworks/${slug}` },
  };
}

const FILE_ROWS: { kind: FileKind; label: string }[] = [
  { kind: "layout", label: "Shared layout (head tags on every page)" },
  { kind: "page", label: "Page templates" },
  { kind: "config", label: "Framework config" },
  { kind: "sitemap", label: "Sitemap" },
  { kind: "robots", label: "robots.txt" },
];

export default async function FrameworkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fw = getFramework(slug);
  if (!fw) notFound();

  const files = FRAMEWORK_FILES[fw.slug];
  // Everything below comes from the engine for this framework: the files it
  // points findings at, the patches it writes, the framework notes of the docs.
  const patches = FIXABLE_RULE_IDS.map((id) => ({ rule: getRulePage(id)!, fix: fixTemplateFor(id, fw.slug)! }));
  const canonical = patches.find((p) => p.rule.id === "indexing-canonical-missing")!;
  const sitemap = patches.find((p) => p.rule.id === "framework-sitemap-missing")!;
  const robots = patches.find((p) => p.rule.id === "framework-robots-missing")!;
  const notes = RULE_PAGES.filter((r) => r.frameworks?.[fw.slug as DocFramework]).map((r) => ({
    rule: r,
    note: r.frameworks![fw.slug as DocFramework]!,
  }));
  const [near, other] = fw.compare.map((s) => getFramework(s)!) as [FrameworkPage, FrameworkPage];
  const guides = guidesFor(fw.slug);
  const path = `/frameworks/${fw.slug}`;
  const title = `Technical SEO for ${fw.name}, checked on every deploy`;

  const faqs = [
    {
      q: `How does Septune audit a ${fw.name} site?`,
      a: `It fetches the HTML each page sends, without running JavaScript, as a crawler does on its first pass, and runs its ${RULE_CATALOG.length} checks. ${fw.name} metadata comes from ${fw.metaApi}, so a missing tag on every page points at ${files.layout}, and one missing on a single route points at ${files.page}.`,
    },
    {
      q: `Where does the sitemap go in a ${fw.name} project?`,
      a: `Septune looks for it as ${files.sitemap}. When there is none, its patch adds ${sitemap.fix.filesChanged.join(", ")}: ${sitemap.fix.summary}`,
    },
    {
      q: `Which file sets the canonical URL in ${fw.name}?`,
      a: `The canonical patch edits ${canonical.fix.filesChanged.join(", ")}. ${canonical.fix.summary}`,
    },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Frameworks", path: "/#frameworks" },
          { name: fw.name, path },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: title,
          description: fw.blurb,
          path,
          datePublished: fw.published,
          dateModified: fw.updated,
        })}
      />
      <JsonLd data={faqPageSchema(faqs)} />
      <ProsePage title={fw.heading ?? title} intro={fw.blurb}>
        <p className="text-xs text-fg-subtle">
          Published <time dateTime={fw.published}>{formatDay(fw.published)}</time>
          {fw.updated !== fw.published && (
            <>
              {" "}
              · updated <time dateTime={fw.updated}>{formatDay(fw.updated)}</time>
            </>
          )}
        </p>

        {fw.sections?.map((section) => (
          <ProseBlock key={section.heading} heading={section.heading}>
            <GuideBlocks blocks={section.blocks} />
          </ProseBlock>
        ))}

        {guides.length > 0 && (
          <ProseBlock heading={`${fw.name} guides`}>
            <ul className="space-y-3">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/frameworks/${g.framework}/${g.slug}`} className={LINK}>
                    {g.h1}
                  </Link>
                  <span className="text-fg-muted">: {g.description}</span>
                </li>
              ))}
            </ul>
          </ProseBlock>
        )}

        <ProseBlock heading={`Where findings point in a ${fw.name} project`}>
          <p>
            Septune reads the rendered site, not your repository. When a page fails a check, the finding names the{" "}
            {fw.name} file that usually produces that part of the page:
          </p>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr>
                <th scope="col" className="pb-2 font-medium">What</th>
                <th scope="col" className="pb-2 font-medium">File in {fw.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FILE_ROWS.map((row) => (
                <tr key={row.kind}>
                  <td className="py-2 pr-4 text-fg-muted">{row.label}</td>
                  <td className="py-2 font-mono text-xs break-all text-fg">{files[row.kind]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ProseBlock>

        <ProseBlock heading={`Metadata in ${fw.name}`}>
          <p>
            Titles, descriptions, canonicals and social tags come from {fw.metaApi}. {canonical.fix.summary} This is the
            patch Septune writes for a {fw.name} site served from example.com when{" "}
            <Link href={`/docs/issues/${canonical.rule.id}`} className={LINK}>
              the canonical tag is missing
            </Link>
            :
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-xs leading-relaxed text-fg-muted">
            <code>{patchBody(canonical.fix.diff)}</code>
          </pre>
        </ProseBlock>

        <ProseBlock heading={`The ${patches.length} patches Septune writes for ${fw.name}`}>
          <p>
            For these checks the fix is mechanical, so Septune writes it in {fw.name} terms. The robots patch, for
            instance, adds {robots.fix.filesChanged.join(", ")}. You apply each one on a branch, and the pull-request check
            confirms the issue is gone.
          </p>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr>
                <th scope="col" className="pb-2 font-medium">Check</th>
                <th scope="col" className="pb-2 font-medium">File the patch changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patches.map(({ rule, fix }) => (
                <tr key={rule.id}>
                  <td className="py-2 pr-4">
                    <Link href={`/docs/issues/${rule.id}`} className={LINK}>
                      {rule.title}
                    </Link>
                  </td>
                  <td className="py-2 font-mono text-xs break-all text-fg">{fix.filesChanged.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ProseBlock>

        {notes.length > 0 && (
          <ProseBlock heading={`Where the fix differs in ${fw.name}`}>
            <ul className="space-y-3">
              {notes.map(({ rule, note }) => (
                <li key={rule.id}>
                  <Link href={`/docs/issues/${rule.id}`} className={LINK}>
                    {rule.title}
                  </Link>
                  <span className="text-fg-muted">: {note}</span>
                </li>
              ))}
            </ul>
          </ProseBlock>
        )}

        <ProseBlock heading="Same checks, other frameworks">
          <p>
            The {RULE_CATALOG.length} checks are the same on every site; what changes is the file you edit. In{" "}
            <Link href={`/frameworks/${near.slug}`} className={LINK}>
              technical SEO for {near.name}
            </Link>
            , the shared layout is {FRAMEWORK_FILES[near.slug].layout} and robots.txt lives in{" "}
            {FRAMEWORK_FILES[near.slug].robots}. In{" "}
            <Link href={`/frameworks/${other.slug}`} className={LINK}>
              technical SEO for {other.name}
            </Link>
            , the sitemap comes from {FRAMEWORK_FILES[other.slug].sitemap}.
          </p>
        </ProseBlock>

        <ProseBlock heading="Frequently asked">
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-fg">{f.q}</h3>
                <p className="mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </ProseBlock>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/audit"
            className="lg lg-molten inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium rounded-full transition-[filter] hover:brightness-110"
          >
            Audit your {fw.name} site
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-sm text-fg-subtle">Free, 3 pages, no signup.</p>
        </div>
      </ProsePage>
    </>
  );
}

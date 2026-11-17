import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { GuideBlocks, PROSE_LINK } from "@/components/marketing/guide-blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { VS_PAGES, vsPath, type VsPage } from "@/lib/seo/vs";

const CELL = "px-3 py-2.5 align-top text-sm";

/** Une page de comparaison : qui est fait pour quoi, le tableau, ce qui diffère, quand choisir l'autre, les sources datées. */
export function VsArticle({ page }: { page: VsPage }) {
  const path = vsPath(page);
  const others = VS_PAGES.filter((p) => p.slug !== page.slug);
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs" },
          { name: `Septune vs ${page.name}`, path },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: page.h1,
          description: page.description,
          path,
          datePublished: page.published,
          dateModified: page.updated,
        })}
      />
      <ProsePage title={page.h1} intro={page.answer}>
        <p className="text-xs text-fg-subtle">
          <Link href="/vs" className={PROSE_LINK}>
            Compare
          </Link>{" "}
          · Facts about {page.name} read on <time dateTime={page.updated}>{formatDay(page.updated)}</time>, from its own pages
        </p>

        <ProseBlock heading={`Who ${page.name} is for`}>
          <GuideBlocks blocks={[{ kind: "list", items: page.forCompetitor }]} />
        </ProseBlock>
        <ProseBlock heading="Who Septune is for">
          <GuideBlocks blocks={[{ kind: "list", items: page.forSeptune }]} />
        </ProseBlock>

        <ProseBlock heading="Feature by feature">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">
                Septune and {page.name} compared, as stated on {page.name}&apos;s own pages
              </caption>
              <thead className="bg-code text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th scope="col" className={`${CELL} w-1/5`}>
                    Feature
                  </th>
                  <th scope="col" className={`${CELL} w-2/5`}>
                    {page.name}
                  </th>
                  <th scope="col" className={`${CELL} w-2/5`}>
                    Septune
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.rows.map((r) => (
                  <tr key={r.feature}>
                    <th scope="row" className={`${CELL} font-medium text-fg`}>
                      {r.feature}
                    </th>
                    <td className={CELL}>
                      <GuideBlocks blocks={[{ kind: "p", text: r.competitor }]} />
                    </td>
                    <td className={CELL}>
                      <GuideBlocks blocks={[{ kind: "p", text: r.septune }]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-fg-subtle">&quot;Not stated&quot; means the pages we read do not say. It does not mean the feature is missing.</p>
        </ProseBlock>

        <ProseBlock heading="Where Septune is different">
          <GuideBlocks blocks={[{ kind: "list", items: page.different }]} />
        </ProseBlock>
        <ProseBlock heading={`When to pick ${page.name} instead`}>
          <GuideBlocks blocks={[{ kind: "list", items: page.pickCompetitor }]} />
        </ProseBlock>
        <ProseBlock heading="Limits of this comparison">
          <GuideBlocks blocks={[{ kind: "list", items: page.caveats }]} />
        </ProseBlock>

        <ProseBlock heading="Sources">
          <ul className="space-y-2">
            {page.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} className={PROSE_LINK} rel="noopener">
                  {s.label}
                </a>
                <span className="text-fg-subtle">, read {formatDay(s.read)}</span>
              </li>
            ))}
          </ul>
        </ProseBlock>

        <ProseBlock heading="Other comparisons">
          <ul className="space-y-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={vsPath(o)} className={PROSE_LINK}>
                  Septune vs {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </ProseBlock>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/audit"
            className="lg lg-molten inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium rounded-full transition-[filter] hover:brightness-110"
          >
            Check your site
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-sm text-fg-subtle">Free, 3 pages, no signup.</p>
        </div>
      </ProsePage>
    </>
  );
}

/** L'index /vs. */
export function VsIndex() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs" },
        ])}
      />
      <ProsePage
        title="Septune compared with other SEO tools"
        intro="Three tools developers ask about next to Septune. Each page says who the other tool is for, puts the features side by side, keeps Septune's gaps as gaps, and dates every source."
      >
        <ProseBlock heading="Comparisons">
          <ul className="space-y-5">
            {VS_PAGES.map((p) => (
              <li key={p.slug}>
                <Link href={vsPath(p)} className={`${PROSE_LINK} font-medium`}>
                  Septune vs {p.name}
                </Link>
                <p className="mt-1 text-sm text-fg-muted">{p.teaser}</p>
              </li>
            ))}
          </ul>
        </ProseBlock>
        <p className="text-sm text-fg-muted">
          Facts about other tools come from their own sites on the date shown on each page. If one is out of date, write to us and we will correct it.
        </p>
      </ProsePage>
    </>
  );
}

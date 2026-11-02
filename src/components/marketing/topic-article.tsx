import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { GuideBlocks, PROSE_LINK } from "@/components/marketing/guide-blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { FIXABLE_RULE_IDS } from "@/lib/audit/deterministic-fix";
import { firstSentence, getRulePage } from "@/lib/audit/rule-docs";
import { nearestTo } from "@/lib/seo/related";
import { GUIDE_GROUPS, HUBS, TOPICS, topicPath, type TopicPage } from "@/lib/seo/topics";

/** A topic page: the answer, the sections, the checks that catch it, its sources and its nearest pages. */
export function TopicArticle({ topic }: { topic: TopicPage }) {
  const hub = HUBS[topic.hub];
  const path = topicPath(topic);
  const rules = topic.rules.map((id) => getRulePage(id)!);
  // The nearest pages Septune's own link check would ask for, minus the
  // check pages already listed above them.
  const ruleLinks = new Set(rules.map((r) => `/docs/issues/${r.id}`));
  const related = nearestTo(path).filter((r) => !ruleLinks.has(r.path));

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: hub.name, path: `/${topic.hub}` },
          { name: topic.h1, path },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: topic.h1,
          description: topic.description,
          path,
          datePublished: topic.published,
          dateModified: topic.updated,
        })}
      />
      <ProsePage title={topic.h1} intro={topic.answer.replace(/`/g, "")}>
        <p className="text-xs text-fg-subtle">
          <Link href={`/${topic.hub}`} className={PROSE_LINK}>
            {hub.name}
          </Link>{" "}
          · Published <time dateTime={topic.published}>{formatDay(topic.published)}</time>
          {topic.updated !== topic.published && (
            <>
              {" "}
              · updated <time dateTime={topic.updated}>{formatDay(topic.updated)}</time>
            </>
          )}
        </p>

        {topic.sections.map((section) => (
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
            {topic.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} className={PROSE_LINK}>
                  {s.label}
                </a>
                <span className="text-fg-subtle">, read {formatDay(s.read)}</span>
              </li>
            ))}
          </ul>
        </ProseBlock>

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
            Check your site
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-sm text-fg-subtle">Free, 3 pages, no signup.</p>
        </div>
      </ProsePage>
    </>
  );
}

function TopicList({ topics }: { topics: TopicPage[] }) {
  return (
    <ul className="space-y-5">
      {topics.map((t) => (
        <li key={t.slug}>
          <Link href={topicPath(t)} className={`${PROSE_LINK} font-medium`}>
            {t.h1}
          </Link>
          <p className="mt-1 text-sm text-fg-muted">{t.description}</p>
        </li>
      ))}
    </ul>
  );
}

/** A section's index: what it covers and every page in it, with its one-line answer. */
export function TopicHubIndex({ hub: id, topics }: { hub: TopicPage["hub"]; topics: TopicPage[] }) {
  const hub = HUBS[id];
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: hub.name, path: `/${id}` },
        ])}
      />
      <ProsePage title={hub.title} intro={hub.intro}>
        {id === "guides" ? (
          GUIDE_GROUPS.map((g) => (
            <ProseBlock key={g.heading} heading={g.heading}>
              <TopicList topics={g.pages} />
            </ProseBlock>
          ))
        ) : (
          <ProseBlock heading={hub.list}>
            <TopicList topics={topics} />
          </ProseBlock>
        )}
        {hub.see && (
          <ProseBlock heading="Related guides">
            <TopicList topics={hub.see.map((path) => TOPICS.find((t) => topicPath(t) === path)!)} />
          </ProseBlock>
        )}
        <p className="text-sm text-fg-muted">
          Every page names the{" "}
          <Link href="/docs" className={PROSE_LINK}>
            Septune checks
          </Link>{" "}
          that catch the problem, and the sources each fact comes from.
        </p>
      </ProsePage>
    </>
  );
}

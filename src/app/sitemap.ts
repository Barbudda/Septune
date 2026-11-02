import type { MetadataRoute } from "next";
import { legalNoticeReady } from "@/lib/legal";
import { config } from "@/lib/config";
import { CHANGELOG, FRAMEWORK_PAGES } from "@/lib/seo/content";
import { RULE_PAGES } from "@/lib/audit/rule-docs";
import { GUIDES } from "@/lib/seo/guides";
import { HUBS, TOPICS, topicPath, topicsIn, type TopicHub } from "@/lib/seo/topics";

/**
 * /sitemap.xml — every public, indexable marketing route. Docs and framework
 * entries derive from the same content lib as the pages themselves, so a new
 * rule or framework can never be missing here. The (app) routes are
 * authenticated and noindexed, so they are intentionally excluded.
 * lastModified uses the latest changelog date — a real content-change signal,
 * not a request-time timestamp.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = config.appUrl;
  const lastShipped = new Date(CHANGELOG[0]?.date ?? "2026-07-04");

  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    lastModified: lastShipped,
    changeFrequency,
    priority,
  });

  return [
    entry("", 1, "weekly"),
    entry("/audit", 0.9, "weekly"),
    entry("/tools/noindex-checker", 0.8, "monthly"),
    entry("/tools/llms-txt-generator", 0.8, "monthly"),
    entry("/pricing", 0.8, "monthly"),
    entry("/docs", 0.7, "weekly"),
    entry("/docs/agent", 0.7, "monthly"),
    ...RULE_PAGES.map((r) => ({
      ...entry(`/docs/issues/${r.id}`, 0.6, "monthly"),
      lastModified: new Date(r.updated),
    })),
    ...FRAMEWORK_PAGES.map((f) => ({
      ...entry(`/frameworks/${f.slug}`, 0.7, "monthly"),
      lastModified: new Date(f.updated),
    })),
    ...GUIDES.map((g) => ({
      ...entry(`/frameworks/${g.framework}/${g.slug}`, 0.6, "monthly"),
      lastModified: new Date(g.updated),
    })),
    // A section's index exists once it has pages.
    ...(Object.keys(HUBS) as TopicHub[]).filter((h) => topicsIn(h).length > 0).map((h) => entry(`/${h}`, 0.6, "monthly")),
    ...TOPICS.map((t) => ({
      ...entry(topicPath(t), 0.6, "monthly"),
      lastModified: new Date(t.updated),
    })),
    entry("/changelog", 0.5, "weekly"),
    entry("/privacy", 0.3, "yearly"),
    entry("/terms", 0.3, "yearly"),
    ...(legalNoticeReady ? [entry("/legal", 0.2, "yearly")] : []),
  ];
}

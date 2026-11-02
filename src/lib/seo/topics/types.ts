import type { GuideSection } from "@/lib/seo/guides";

/** The four sections the topic pages live under, each with its own index page. */
export type TopicHub = "hosting" | "guides" | "search-console" | "ai-crawlers";

/**
 * One page answering one query developers type, outside the framework
 * guides: a host, a static-site generator, an HTTP header or SEO concept, a
 * Search Console status, a testing workflow, an AI crawler. Same format and
 * same bar as `Guide` (src/lib/seo/guides.ts): every fact from a source read
 * on a stated date, framework behaviour with its version.
 *
 * Text format: `code` spans and [links](/path) inline, nothing else.
 */
export interface TopicPage {
  hub: TopicHub;
  slug: string;
  /** <title> before the " · Septune" suffix: 55 characters at most. */
  title: string;
  h1: string;
  /** Meta description, 155 characters at most. */
  description: string;
  /** The direct answer under the h1, 40 to 70 words. */
  answer: string;
  sections: GuideSection[];
  /** Septune rules that detect the problem, linked to their pages. */
  rules: string[];
  sources: { label: string; url: string; read: string }[];
  published: string;
  updated: string;
}

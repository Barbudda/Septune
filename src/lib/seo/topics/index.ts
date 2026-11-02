import type { TopicHub, TopicPage } from "./types";
import { HOSTING } from "./hosting";
import { GENERATORS } from "./generators";
import { CONCEPTS } from "./concepts";
import { SITEMAPS } from "./sitemaps";
import { SEARCH_CONSOLE } from "./search-console";
import { WORKFLOW } from "./workflow";
import { AI_CRAWLERS } from "./ai-crawlers";

export type { TopicHub, TopicPage } from "./types";

/** What each section's index page says, and the order the sections come in. */
export const HUBS: Record<TopicHub, { name: string; title: string; description: string; intro: string; list: string; see?: string[] }> = {
  hosting: {
    name: "Hosting",
    title: "Technical SEO by host: what each platform changes",
    description:
      "How GitHub Pages, Cloudflare Pages, Netlify, Vercel, Firebase Hosting and AWS Amplify serve robots.txt, redirects, headers and sitemaps, and what to set.",
    intro:
      "The host decides more of your SEO than its docs say: which domain answers, which redirect code it sends, which headers it adds, which robots.txt wins. One page per host, with the setting that fixes each case.",
    list: "One page per host",
  },
  guides: {
    name: "Guides",
    title: "Technical SEO guides for developers",
    description:
      "Static-site generators, HTTP headers, redirects, sitemaps, previews and SEO tests in CI: one guide per problem, with the code and the sources.",
    intro:
      "One problem per guide, answered with the setting, the header or the test that fixes it, and the source each fact comes from.",
    list: "Guides",
  },
  "search-console": {
    name: "Search Console",
    title: "Search Console indexing statuses: SEO causes and fixes",
    description:
      "What each Google Search Console indexing status means, the framework or hosting setting that usually causes it, and how to check the fix before Google does.",
    intro:
      "Search Console names the symptom. These pages trace each status to the setting behind it, in the framework, the host or the firewall, and show how to check the fix with curl before asking Google to validate it.",
    list: "One page per status",
    see: ["/guides/canonical-vs-noindex", "/guides/redirect-status-codes", "/guides/x-robots-tag"],
  },
  "ai-crawlers": {
    name: "AI crawlers",
    title: "AI crawler user agents and how to allow them",
    description:
      "GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Applebot-Extended and Meta's crawlers: what each one fetches, its robots.txt token and how to verify it.",
    intro:
      "Each AI company runs several crawlers, and blocking the wrong one removes you from AI answers instead of from training data. One page per crawler, from the operator's own documentation.",
    list: "One page per crawler",
  },
};

export const TOPICS: TopicPage[] = [...HOSTING, ...GENERATORS, ...CONCEPTS, ...SITEMAPS, ...SEARCH_CONSOLE, ...WORKFLOW, ...AI_CRAWLERS];

/** The guides section is long: its index groups the pages by family, in this order. */
export const GUIDE_GROUPS: { heading: string; pages: TopicPage[] }[] = [
  { heading: "Static-site generators and frameworks", pages: GENERATORS },
  { heading: "Headers, redirects and canonicals", pages: CONCEPTS },
  { heading: "Sitemaps, robots.txt and link previews", pages: SITEMAPS },
  { heading: "Testing SEO before it ships", pages: WORKFLOW },
  { heading: "llms.txt", pages: AI_CRAWLERS.filter((t) => t.hub === "guides") },
];

export const topicPath = (t: Pick<TopicPage, "hub" | "slug">) => `/${t.hub}/${t.slug}`;

export function topicsIn(hub: TopicHub): TopicPage[] {
  return TOPICS.filter((t) => t.hub === hub);
}

export function getTopic(hub: TopicHub, slug: string): TopicPage | undefined {
  return TOPICS.find((t) => t.hub === hub && t.slug === slug);
}

import { embed, cosine } from "@/lib/brain/embed";
import { RULE_PAGES, pageTitle, type RulePage } from "@/lib/audit/rule-docs";
import { GUIDES, type Guide } from "./guides";

/** A page another page can link to as related. */
export type RelatedLink = { path: string; title: string };

type Doc = RelatedLink & { id: string; vector: number[] };

const ruleText = (r: RulePage) =>
  [
    pageTitle(r),
    r.title,
    r.summary,
    r.failing.label,
    r.failing.code,
    r.measured,
    r.consequence,
    r.fix,
    ...Object.values(r.frameworks ?? {}),
    r.verify,
  ].join(" ");

const guideText = (g: Guide) =>
  [
    g.title,
    g.h1,
    g.description,
    g.answer,
    ...g.sections.flatMap((s) => [
      s.heading,
      ...s.blocks.map((b) => (b.kind === "p" ? b.text : b.kind === "list" ? b.items.join(" ") : `${b.label} ${b.code}`)),
    ]),
  ].join(" ");

// Built once, at build time: the same local embedding Septune's link check
// uses, on the text each page shows.
const DOCS: Doc[] = [
  ...RULE_PAGES.map((r) => ({ id: r.id, path: `/docs/issues/${r.id}`, title: r.title, vector: embed(ruleText(r)) })),
  ...GUIDES.map((g) => ({ id: `${g.framework}/${g.slug}`, path: `/frameworks/${g.framework}/${g.slug}`, title: g.h1, vector: embed(guideText(g)) })),
];

/**
 * The pages closest in topic to this check page, among the other checks and
 * the guides: what Septune's own internal-link check expects it to link to
 * (it suggests a page's three nearest pages when they aren't linked). Five,
 * because the crawl reads the whole rendered page and ranks a little
 * differently from this text.
 */
export function nearestTo(ruleId: string, count = 5): RelatedLink[] {
  const self = DOCS.find((d) => d.id === ruleId);
  if (!self) return [];
  return DOCS.filter((d) => d !== self)
    .map((d) => ({ d, sim: cosine(self.vector, d.vector) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, count)
    .map(({ d }) => ({ path: d.path, title: d.title }));
}

/** The guides that walk through this check for one framework. */
export function guidesForRule(ruleId: string): RelatedLink[] {
  return GUIDES.filter((g) => g.rules.includes(ruleId)).map((g) => ({ path: `/frameworks/${g.framework}/${g.slug}`, title: g.h1 }));
}

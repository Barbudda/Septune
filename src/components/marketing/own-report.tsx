import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Septune's report on its own site, as the CLI printed it:
 *   septune audit https://www.septune.dev --pages 100 --json
 * run on 2026-11-01 at 22:06 (Paris). Copied as is, nothing removed; when the
 * site changes, run it again and replace these values with the new run.
 */
const RUN = { site: "septune.dev", date: "1 November 2026", pages: 93, seconds: 8, score: 99 };

const CATEGORIES: [string, number][] = [
  ["Indexing", 99],
  ["Metadata", 99],
  ["Performance", 98],
  ["Internal linking", 94],
  ["Structure", 100],
  ["Images", 100],
  ["Structured data", 100],
  ["Framework", 100],
];

type Finding = { impact: "medium" | "low"; area: string; title: string; evidence: string; pages: string[] };

const FINDINGS: Finding[] = [
  {
    impact: "medium",
    area: "internal linking",
    title: "Missing internal links between related pages",
    evidence: "40 link opportunities across 30 pages, computed from the site's own content.",
    pages: ["/docs/issues/indexing-canonical-missing to /docs/issues/meta-og-image-missing, 91% related"],
  },
  {
    impact: "medium",
    area: "performance",
    title: "Slow server response (TTFB)",
    evidence: "3 pages answered in more than 800 ms during the crawl. File to look at: next.config.mjs.",
    pages: ["/login 847 ms", "/signup 917 ms", "/preorder 1159 ms"],
  },
  {
    impact: "medium",
    area: "internal linking",
    title: "Links to broken destinations",
    evidence: "1 link answers with a hard error.",
    pages: ["github.com/Barbudda/septune#2-in-your-ai-editor-the-agent: HTTP 404"],
  },
  {
    impact: "low",
    area: "metadata",
    title: "Title and H1 don't reflect the page's content",
    evidence: "16 pages whose main topic words are missing from their title and H1.",
    pages: ["/pricing: topic pro, plan, email"],
  },
  {
    impact: "low",
    area: "indexing",
    title: "Utility pages kept out of search (noindex)",
    evidence: "3 utility pages carry noindex, and none of them is in the sitemap. Expected.",
    pages: ["/login", "/signup", "/preorder"],
  },
];

/**
 * The product, shown with real output: Septune's audit of septune.dev. A
 * report card with the score, the eight families and every finding with its
 * evidence, the way the CLI and the app print them.
 */
export function OwnReport() {
  return (
    <div className="report-card">
      <div className="grid gap-8 border-b border-border p-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10 md:p-8">
        <div className="flex items-center gap-5">
          <div className="report-score" style={{ "--score": RUN.score } as React.CSSProperties}>
            <span className="font-display text-4xl leading-none text-fg">{RUN.score}</span>
          </div>
          <div>
            <p className="font-mono text-[13px] text-fg-subtle">technical SEO score</p>
            <p className="mt-1 text-lg font-medium text-fg">{RUN.site}</p>
            <p className="mt-1 font-mono text-[13px] text-fg-muted">
              {RUN.pages} pages read in {RUN.seconds} s, {RUN.date}
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" aria-label="Score by family">
          {CATEGORIES.map(([name, score]) => (
            <li key={name}>
              <div className="flex items-baseline justify-between gap-2 font-mono text-[12.5px]">
                <span className="text-fg-muted">{name}</span>
                <span className="text-fg tabular-nums">{score}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-paper-deep" aria-hidden>
                <div className={cn("h-full rounded-full", score === 100 ? "bg-ultramarine" : "bg-ultramarine/60")} style={{ width: `${score}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ol className="divide-y divide-border" aria-label="Findings">
        {FINDINGS.map((f) => (
          <li key={f.title} className="grid gap-2 px-6 py-5 md:grid-cols-[7rem_1fr] md:gap-8 md:px-8">
            <p className="flex items-center gap-2 font-mono text-[12.5px]">
              <span className={cn("impact", f.impact === "medium" ? "impact-medium" : "impact-low")}>{f.impact}</span>
            </p>
            <div>
              <p className="text-[15px] font-medium text-fg">
                {f.title} <span className="font-mono text-[12.5px] font-normal text-fg-subtle">{f.area}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{f.evidence}</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12.5px] text-fg-subtle">
                {f.pages.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5 md:px-8">
        <p className="font-mono text-[12.5px] text-fg-subtle">5 findings: 3 medium, 2 low, none critical.</p>
        <Link href="/audit" className="btn-lime">
          Run it on your site
        </Link>
      </div>
    </div>
  );
}

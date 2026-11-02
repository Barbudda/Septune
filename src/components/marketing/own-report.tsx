import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Septune's report on its own site, as the CLI printed it:
 *   septune audit https://www.septune.dev --pages 100 --json
 * run on 2026-11-02 at 16:19 (Paris). Copied as is, nothing removed; when the
 * site changes, run it again and replace these values with the new run.
 */
const RUN = { site: "septune.dev", date: "2 November 2026", pages: 94, seconds: 9, score: 100 };

const CATEGORIES: [string, number][] = [
  ["Indexing", 100],
  ["Metadata", 100],
  ["Performance", 100],
  ["Internal linking", 100],
  ["Structure", 100],
  ["Images", 100],
  ["Structured data", 100],
  ["Framework", 100],
];

type Finding = { impact: "medium" | "low"; area: string; title: string; evidence: string; pages: string[] };

// The one finding of the run. The engine reports it but leaves it out of the
// score: a login page kept out of search is a choice, not a fault.
const FINDINGS: Finding[] = [
  {
    impact: "low",
    area: "indexing",
    title: "Utility pages kept out of search (noindex)",
    evidence: "3 utility pages carry noindex, and none of them is in the sitemap. Expected, so it costs no points.",
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
      <p className="border-t border-border px-6 py-4 text-sm leading-relaxed text-fg-muted md:px-8">
        <span className="font-mono text-[12.5px] text-fg">AI-search readiness 100/100.</span> All 11 checks pass,
        from AI crawlers allowed in robots.txt to an llms.txt, server-rendered text and a named publisher.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5 md:px-8">
        <p className="font-mono text-[12.5px] text-fg-subtle">1 finding, on purpose, none to fix. Full crawl, 94 pages.</p>
        <Link href="/audit" className="btn-lime">
          Audit 3 pages of yours, free
        </Link>
      </div>
    </div>
  );
}

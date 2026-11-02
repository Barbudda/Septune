"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Search, TriangleAlert, X } from "lucide-react";
import type { IndexabilityReport, SignalStatus } from "@/lib/audit/indexability";
import { cn } from "@/lib/utils";

const VERDICT = {
  indexable: { label: "Indexable", tone: "border-signal/30 bg-signal/[0.06]", text: "text-signal" },
  caveats: { label: "Indexable, with caveats", tone: "border-amber/30 bg-amber/[0.06]", text: "text-amber" },
  blocked: { label: "Not indexable", tone: "border-danger/30 bg-danger/[0.06]", text: "text-danger" },
} as const;

function Mark({ status }: { status: SignalStatus }) {
  if (status === "ok") return <Check aria-label="OK" className="size-4 shrink-0 text-signal" />;
  if (status === "warning") return <TriangleAlert aria-label="Warning" className="size-4 shrink-0 text-amber" />;
  return <X aria-label="Blocks indexing" className="size-4 shrink-0 text-danger" />;
}

export function NoindexChecker() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IndexabilityReport | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/tools/noindex", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "The check failed.");
      else setReport(data as IndexabilityReport);
    } catch {
      setError("The check failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const v = report ? VERDICT[report.verdict] : null;
  return (
    <div>
      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
        <label className="lg lg-thin flex h-12 items-center gap-2.5 rounded-full px-5 sm:flex-1 focus-within:ring-2 focus-within:ring-molten-bright">
          <Search className="size-4 shrink-0 text-fg-subtle" />
          <span className="sr-only">Page URL</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-site.com/pricing"
            required
            className="h-full w-full bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="lg lg-molten inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {loading ? "Checking…" : "Check this page"}
        </button>
      </form>
      <p className="mt-2.5 text-xs text-fg-subtle">Free, no signup. One page, fetched once, nothing stored.</p>

      {loading && (
        <p className="mt-6 text-sm text-fg-muted" role="status" aria-live="polite">
          Fetching the page and its robots.txt, reading the headers and meta tags…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {report && v && (
        <div className="mt-8 space-y-4" aria-live="polite">
          <div className={cn("rounded-2xl border p-5", v.tone)}>
            <p className={cn("text-sm font-semibold", v.text)}>{v.label}</p>
            <p className="mt-1 text-fg">{report.summary}</p>
            {report.finalUrl !== report.url && (
              <p className="mt-2 break-all font-mono text-xs text-fg-subtle">Checked: {report.finalUrl}</p>
            )}
          </div>
          <ul className="lg divide-y divide-border rounded-2xl">
            {report.signals.map((s) => (
              <li key={s.id} className="flex gap-3 p-4">
                <span className="mt-0.5">
                  <Mark status={s.status} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{s.label}</p>
                  <p className="mt-0.5 break-words text-sm text-fg-muted">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="lg flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">
              A noindex usually arrives with a deploy. Septune can check this site every day and alert you the morning it happens.
            </p>
            <Link
              href="/signup"
              className="lg lg-molten inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[filter] hover:brightness-110"
            >
              Watch this site free
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, Loader2, Search, TriangleAlert } from "lucide-react";

interface Result {
  url: string;
  pages: number;
  llmsTxt: string;
  existing: { problems: string[] } | null;
}

export function LlmsTxtGenerator() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/tools/llms-txt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "The crawl failed.");
      else setResult(data as Result);
    } catch {
      setError("The crawl failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.llmsTxt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    if (!result) return;
    const href = URL.createObjectURL(new Blob([result.llmsTxt], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div>
      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
        <label className="lg lg-thin flex h-12 items-center gap-2.5 rounded-full px-5 sm:flex-1 focus-within:ring-2 focus-within:ring-molten-bright">
          <Search className="size-4 shrink-0 text-fg-subtle" />
          <span className="sr-only">Site URL</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-site.com"
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
          {loading ? "Crawling…" : "Generate llms.txt"}
        </button>
      </form>
      <p className="mt-2.5 text-xs text-fg-subtle">Free, no signup. Crawls up to 15 pages, honours robots.txt, stores nothing.</p>

      {loading && (
        <p className="mt-6 text-sm text-fg-muted" role="status" aria-live="polite">
          Reading the sitemap, crawling pages, collecting titles and descriptions…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-8 space-y-4" aria-live="polite">
          {result.existing && (
            <div className="lg rounded-2xl p-5">
              {result.existing.problems.length ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber">
                    <TriangleAlert className="size-4" /> Your current llms.txt has {result.existing.problems.length} problem
                    {result.existing.problems.length > 1 ? "s" : ""}
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-fg-muted">
                    {result.existing.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm font-semibold text-signal">
                  <Check className="size-4" /> Your current llms.txt is well formed.
                </p>
              )}
            </div>
          )}
          <div className="lg overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-xs text-fg-subtle">llms.txt · {result.pages} pages</span>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="lg lg-thin inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-fg transition-[filter] hover:brightness-125"
                >
                  {copied ? <Check className="size-3.5 text-signal" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="lg lg-thin inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-fg transition-[filter] hover:brightness-125"
                >
                  <Download className="size-3.5" /> Download
                </button>
              </span>
            </div>
            <pre className="max-h-[28rem] overflow-auto bg-code p-4 font-mono text-xs leading-relaxed text-fg-muted">
              <code>{result.llmsTxt}</code>
            </pre>
          </div>
          <p className="text-sm text-fg-muted">
            Save it at the root of your site, as <span className="font-mono text-xs">/llms.txt</span>:{" "}
            <span className="font-mono text-xs">public/</span> in Next.js, Astro, Nuxt and Vite,{" "}
            <span className="font-mono text-xs">static/</span> in SvelteKit. For the whole site and to keep it current, run{" "}
            <span className="font-mono text-xs">npx septune llms {result.url} --out public/llms.txt</span>, or check your
            AI-search readiness with the{" "}
            <Link href="/audit" className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright">
              free audit
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ForgeField } from "@/components/marketing/forge/forge-field";
import { Chapter } from "@/components/marketing/forge/chapter";
import { TourVideo } from "@/components/marketing/tour-video";
import { FAQS } from "@/components/marketing/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema } from "@/lib/seo/schema";
import { RULE_CATALOG } from "@/lib/audit/catalog";
import { BILLING_NOTE, PRICING_TIERS } from "@/lib/pricing";
import { FRAMEWORK_PAGES } from "@/lib/seo/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CHECKS = RULE_CATALOG.length;

/* Sculptures, see forge/shaders.ts: 0 the mark, 1 a pull request, 2 a site, 3 a fix. */

// Shared chapter grid: text on the left, the sculpture's place on the right.
// On narrow screens the sculpture sits above, so the text starts lower.
const GRID =
  "container-rf grid min-h-[100svh] content-end pt-[50svh] pb-20 lg:grid-cols-[minmax(0,34rem)_1fr] lg:content-center lg:py-32";
const LABEL = "font-mono text-[13px] text-molten-bright";
const TITLE = "mt-4 text-4xl leading-[1.08] tracking-tight text-balance md:text-5xl";
const BODY = "mt-5 text-base leading-relaxed text-fg-muted md:text-lg";
// Reveal delays for lists, written out so Tailwind sees every class.
const STAGGER = ["[--d:90]", "[--d:180]", "[--d:270]", "[--d:360]", "[--d:450]", "[--d:540]"];
const TEXT_LINK =
  "font-mono text-[13px] text-fg underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-molten";

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS)} />
      <ForgeField />

      {/* 0 · the mark: what Septune is, and the shortest way to try it */}
      <Chapter id="top" shape={0} first labelledBy="hero-title">
        <div className="container-rf grid min-h-[100svh] content-end pt-[46svh] pb-16 lg:grid-cols-[minmax(0,36rem)_1fr] lg:content-center lg:py-32">
          <div>
            <p className={LABEL}>[technical SEO, checked on every deploy]</p>
            <h1 id="hero-title" className="mt-5 text-5xl leading-[1.04] tracking-tight md:text-7xl">
              Ship fast. <span className="block text-signal">Stay indexed.</span>
            </h1>
            <p className={BODY}>
              Septune reads your site the way Googlebot does and checks it where SEO breaks: in your
              editor, in every pull request, and in production.
            </p>

            <form action="/audit" method="get" className="mt-8">
              <label htmlFor="hero-url" className="sr-only">
                Your site&apos;s URL
              </label>
              <div className="flex h-13 items-center gap-2 rounded-full border border-border bg-bg/70 py-1.5 pr-1.5 pl-5 transition-colors duration-200 focus-within:border-molten/70 hover:border-fg-subtle/60">
                <input
                  id="hero-url"
                  name="url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  required
                  placeholder="your-site.com"
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-full bg-molten px-5 text-sm font-medium text-ink transition-[filter] duration-200 hover:brightness-110 active:brightness-95"
                >
                  Audit free
                </button>
              </div>
            </form>
            <p className="mt-3 font-mono text-[13px] text-fg-subtle">
              no signup · {CHECKS} checks · every finding cites its evidence
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link href="/signup" className={TEXT_LINK}>
                start free
              </Link>
              <TourVideo className="-ml-1" />
            </div>
          </div>
        </div>
      </Chapter>

      {/* 1 · a pull request: where it is caught */}
      <Chapter id="how-it-works" shape={1} labelledBy="caught-title">
        <div className={GRID}>
          <div>
            <p data-reveal className={LABEL}>
              [where it&apos;s caught]
            </p>
            <h2 id="caught-title" data-reveal className={`${TITLE} [--d:80]`}>
              It fails the pull request that would drop pages from Google.
            </h2>
            <p data-reveal className={`${BODY} [--d:160]`}>
              The GitHub Action audits the preview deployment against production, page by page, and
              comments the result where your team reviews.
            </p>

            <div data-reveal className="mt-8 rounded-xs border border-border bg-code/85 font-mono text-[13px] [--d:260]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
                <span aria-hidden className="size-2 rounded-full bg-danger" />
                <span className="text-fg">Septune SEO check</span>
                <span className="text-fg-subtle">preview vs production</span>
                <span className="ml-auto text-danger">failing</span>
              </div>
              <ul className="divide-y divide-border">
                <li className="flex gap-4 px-4 py-2">
                  <span className="w-16 shrink-0 text-danger">critical</span>
                  <span className="text-fg-muted">/pricing became noindex (robots meta tag)</span>
                </li>
                <li className="flex gap-4 px-4 py-2">
                  <span className="w-16 shrink-0 text-amber">warning</span>
                  <span className="text-fg-muted">/docs canonical changed to /docs/v2</span>
                </li>
              </ul>
              <p className="border-t border-border px-4 py-2 text-fg-subtle">score 91 → 84</p>
            </div>

            <dl className="mt-10 border-t border-border">
              {[
                ["before you push", "The CLI or the Claude Code plugin audits localhost, and your AI assistant fixes what it finds."],
                ["in the pull request", "Preview against production on each push, with the result commented on the pull request."],
                ["after the merge", "The live site is checked on a schedule, with an alert by email, Slack or Discord when something critical changes."],
              ].map(([term, text], i) => (
                <div
                  key={term}
                  data-reveal
                  className={`grid gap-1 border-b border-border py-4 sm:grid-cols-[10rem_1fr] sm:gap-6 ${STAGGER[i + 3]}`}
                >
                  <dt className="font-mono text-[13px] text-fg">{term}</dt>
                  <dd className="text-sm leading-relaxed text-fg-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Chapter>

      {/* 2 · a site: what it reads */}
      <Chapter id="features" shape={2} labelledBy="reads-title">
        <div className={GRID}>
          <div>
            <p data-reveal className={LABEL}>
              [what it reads]
            </p>
            <h2 id="reads-title" data-reveal className={`${TITLE} [--d:80]`}>
              It reads your site the way Googlebot does.
            </h2>
            <p data-reveal className={`${BODY} [--d:160]`}>
              Links first, then every URL your sitemap lists. robots.txt is read and honoured the way
              Google reads it.
            </p>

            <div data-reveal className="mt-8 flex items-end gap-5 [--d:240]">
              <span data-count={CHECKS} className="font-display text-[7.5rem] leading-[0.8] font-light text-molten md:text-[9rem]">
                {CHECKS}
              </span>
              <span className="pb-2 font-mono text-[13px] leading-snug text-fg-muted">
                checks for what
                <br />
                actually breaks
              </span>
            </div>

            <ul data-reveal className="mt-8 flex flex-wrap gap-1.5 [--d:340]" aria-label="What the checks cover">
              {["indexing", "canonicals", "sitemaps", "structured data", "speed", "AI-search access"].map((c) => (
                <li key={c} className="rounded-xs bg-elevated px-2.5 py-1.5 font-mono text-xs text-fg-muted">
                  {c}
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-8 text-sm leading-relaxed text-fg-muted [--d:420]">
              One deterministic engine, so the editor, the pull request and production always agree.
              Every finding cites its evidence.
            </p>
            <p data-reveal className="mt-6 [--d:480]">
              <Link href="/docs" className={TEXT_LINK}>
                read every check
              </Link>
            </p>
          </div>
        </div>
      </Chapter>

      {/* 3 · a fix: how it is fixed, and what Septune never touches */}
      <Chapter id="fix" shape={3} labelledBy="fix-title">
        <div className={GRID}>
          <div>
            <p data-reveal className={LABEL}>
              [how it&apos;s fixed]
            </p>
            <h2 id="fix-title" data-reveal className={`${TITLE} [--d:80]`}>
              Each fix goes to your AI editor.
            </h2>
            <p data-reveal className={`${BODY} [--d:160]`}>
              Every finding comes with the affected URLs and the files to look at. Mechanical ones come
              with a ready patch for your framework.
            </p>

            <pre data-reveal className="mt-8 overflow-x-auto rounded-xs border border-border bg-code/85 px-4 py-3 font-mono text-[13px] leading-relaxed [--d:260]">
              <span className="text-fg-subtle">app/pricing/page.tsx</span>
              {"\n"}
              <span className="text-fg-muted">{"  export const metadata = {\n    title: \"Pricing\",\n"}</span>
              <span className="text-danger">{"-   robots: { index: false },\n"}</span>
              <span className="text-fg-muted">{"  };"}</span>
            </pre>

            <p data-reveal className="mt-8 font-mono text-[13px] text-fg-subtle [--d:340]">
              patches written in your framework&apos;s conventions
            </p>
            <ul data-reveal className="mt-3 flex flex-wrap gap-x-5 gap-y-2 [--d:380]">
              {FRAMEWORK_PAGES.map((fw) => (
                <li key={fw.slug}>
                  <Link href={`/frameworks/${fw.slug}`} className={TEXT_LINK}>
                    {fw.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div id="security" data-reveal className="mt-10 border-t border-border pt-5 [--d:460]">
              <p className="font-mono text-[13px] text-fg">what it never touches</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Septune reads your rendered pages, like any crawler. It never writes to your repository,
                and never reads your source code or your environment secrets: fixes reach your code
                through your own pull requests.
              </p>
            </div>
          </div>
        </div>
      </Chapter>

      {/* 4 · the mark again: how to start */}
      <Chapter id="start" shape={0} labelledBy="start-title">
        <div className={GRID}>
          <div>
            <p data-reveal className={LABEL}>
              [start]
            </p>
            <h2 id="start-title" data-reveal className={`${TITLE} [--d:80]`}>
              One site watched for free. No credit card.
            </h2>

            <ul className="mt-8 border-t border-border">
              {PRICING_TIERS.map((tier, i) => (
                <li
                  key={tier.id}
                  data-reveal
                  className={`grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-border py-4 ${STAGGER[i + 1]}`}
                >
                  <p className="font-mono text-[13px] text-fg">
                    {tier.name.toLowerCase()} <span className="text-fg-subtle">· €{tier.priceMonthly}/month</span>
                  </p>
                  <Link href={tier.ctaHref} className={TEXT_LINK}>
                    {tier.cta.toLowerCase()}
                  </Link>
                  <p className="col-span-2 text-sm leading-relaxed text-fg-muted">{tier.tagline}</p>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-5 text-sm leading-relaxed text-fg-subtle [--d:480]">
              {BILLING_NOTE}
            </p>
            <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 [--d:540]">
              <Link
                href="/audit"
                className="inline-flex h-11 items-center rounded-full bg-molten px-5 text-sm font-medium text-ink transition-[filter] duration-200 hover:brightness-110"
              >
                Audit a URL, free
              </Link>
              <Link href="/pricing" className={TEXT_LINK}>
                compare plans
              </Link>
            </div>
          </div>
        </div>
      </Chapter>

      {/* Questions: plain text, nothing waits */}
      <section id="faq" aria-labelledby="faq-title" className="relative py-24 md:py-32">
        <div className="container-rf grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className={LABEL}>[questions]</p>
            <h2 id="faq-title" className="mt-4 text-3xl leading-tight tracking-tight md:text-4xl">
              What people ask before they try it.
            </h2>
          </div>
          <div className="border-t border-border">
            {FAQS.map((item) => (
              <details key={item.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-base text-fg transition-colors duration-200 hover:text-molten-bright [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus aria-hidden className="mt-1 size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="max-w-2xl pb-6 text-sm leading-relaxed text-fg-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

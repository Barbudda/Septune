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

/*
 * Each chapter's picture is drawn by the forge field (SCENES in
 * forge/forge-field.tsx, keyed by the chapter id) inside its [data-stage]
 * box. Text sits above the canvas (relative z-10); section grounds below it.
 */

const LABEL = "font-mono text-[13px] tracking-wide text-molten-bright";
const TITLE = "mt-5 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-balance md:text-[3.6rem]";
const BODY = "mt-6 text-base leading-relaxed text-fg-muted md:text-lg";
const TEXT_LINK =
  "font-mono text-[13px] text-fg underline decoration-verdigris/50 underline-offset-[6px] transition-colors duration-200 hover:text-verdigris-soft hover:decoration-verdigris";
// Reveal delays for lists, written out so Tailwind sees every class.
const STAGGER = ["[--d:90]", "[--d:180]", "[--d:270]", "[--d:360]", "[--d:450]", "[--d:540]"];
// Text left, picture right on large screens; picture above on small ones.
const SPLIT = "container-rf grid min-h-[110svh] items-center gap-8 py-24 lg:grid-cols-[minmax(0,31rem)_1fr] lg:gap-16 lg:py-32";
// The picture's box runs past the column to the right edge of the screen: the pictures are wide.
const STAGE_SIDE = "h-[44svh] lg:order-2 lg:-mr-[14vw] lg:h-[80svh]";

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS)} />
      <ForgeField />

      {/* ── Hero: the site as a crawler reads it, rising from the horizon ── */}
      <Chapter id="top" first labelledBy="hero-title" className="hero-field overflow-hidden">
        <div className="container-rf relative z-10 flex h-[100svh] min-h-[44rem] flex-col items-center pt-[13svh] text-center">
          <p className="font-mono text-[13px] tracking-wide text-verdigris-soft">technical SEO, checked on every deploy</p>
          <h1 id="hero-title" className="mt-6 text-[clamp(3.3rem,8.8vw,8.6rem)] leading-[0.9] tracking-[-0.035em]">
            Ship fast.
            <br />
            <em>Stay indexed.</em>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-fg-muted md:text-xl">
            Septune reads your site the way Googlebot does and checks it where SEO breaks: in your editor, in every pull
            request, and in production.
          </p>

          <form action="/audit" method="get" className="mt-8 w-full max-w-xl">
            <label htmlFor="hero-url" className="sr-only">
              Your site&apos;s URL
            </label>
            <div className="flex h-14 items-center gap-2 rounded-full border border-verdigris/40 bg-bg/60 py-1.5 pr-1.5 pl-6 backdrop-blur-md transition-colors duration-200 focus-within:border-molten hover:border-verdigris/70">
              <input
                id="hero-url"
                name="url"
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                required
                placeholder="your-site.com"
                className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              <button
                type="submit"
                className="h-11 shrink-0 rounded-full bg-molten px-6 text-[15px] font-medium text-ink transition-[filter] duration-200 hover:brightness-110 active:brightness-95"
              >
                Audit free
              </button>
            </div>
          </form>
          <p className="mt-4 font-mono text-[13px] text-fg-subtle">
            no signup · {CHECKS} checks · every finding cites its evidence
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            <Link href="/signup" className={TEXT_LINK}>
              start free
            </Link>
            <TourVideo />
          </div>
        </div>
        <div data-stage aria-hidden className="absolute inset-x-0 bottom-0 h-[24svh] md:h-[40svh] lg:h-[50svh]" />
        {/* A clearing in the light where the text sits: above the particles, under the words. */}
        <div aria-hidden className="hero-clearing pointer-events-none absolute inset-0 z-[3]" />
      </Chapter>

      {/* ── 1 · The crawl: the same tree, read page by page ── */}
      <Chapter id="features" labelledBy="reads-title" className="field-right">
        <div className={SPLIT}>
          <div data-stage aria-hidden className={STAGE_SIDE} />
          <div className="relative z-10 lg:order-1">
            <p data-reveal className={LABEL}>
              [what it reads]
            </p>
            <h2 id="reads-title" data-reveal className={`${TITLE} [--d:80]`}>
              It reads your site <em>the way Googlebot does.</em>
            </h2>
            <p data-reveal className={`${BODY} [--d:160]`}>
              Links first, then every URL your sitemap lists. robots.txt is read and honoured the way Google reads it,
              and every page it reaches goes through the same checks.
            </p>

            <div data-reveal className="mt-10 flex items-end gap-5 border-t border-border pt-8 [--d:240]">
              <span data-count={CHECKS} className="font-display text-[7rem] leading-[0.78] font-light text-molten md:text-[8.5rem]">
                {CHECKS}
              </span>
              <span className="pb-1 text-base leading-snug text-fg-muted">
                checks for what actually breaks, each one documented with the evidence it reads.
              </span>
            </div>
            <ul data-reveal className="mt-8 flex flex-wrap gap-1.5 [--d:330]" aria-label="What the checks cover">
              {["indexing", "canonicals", "sitemaps", "structured data", "speed", "AI-search access"].map((c) => (
                <li key={c} className="rounded-full border border-border bg-elevated/70 px-3 py-1.5 font-mono text-xs text-fg-muted">
                  {c}
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-8 [--d:420]">
              <Link href="/docs" className={TEXT_LINK}>
                read every check
              </Link>
            </p>
          </div>
        </div>
      </Chapter>

      {/* ── 2 · Where it's caught: deploys through three checkpoints ── */}
      <Chapter id="how-it-works" labelledBy="caught-title" className="field-band">
        <div className="container-rf relative z-10 pt-28 text-center lg:pt-36">
          <p data-reveal className={LABEL}>
            [where it&apos;s caught]
          </p>
          <h2 id="caught-title" data-reveal className={`${TITLE} mx-auto max-w-4xl [--d:80]`}>
            It fails the pull request <em>that would drop pages from Google.</em>
          </h2>
          <p data-reveal className={`${BODY} mx-auto max-w-2xl [--d:160]`}>
            Septune checks every deploy at three points. In the pull request, the GitHub Action audits the preview
            against production, page by page, and stops what would leave search.
          </p>
        </div>

        <div className="container-rf">
          <div data-stage aria-hidden className="h-[32svh] w-full md:h-[36svh]" />
        </div>

        <div className="container-rf relative z-10 grid gap-10 pb-28 md:grid-cols-3 md:gap-8 lg:pb-36">
          <div data-reveal className="md:text-center [--d:240]">
            <p className="font-mono text-[13px] text-verdigris-soft">before you push</p>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted md:mx-auto md:max-w-[17rem]">
              The CLI or the Claude Code plugin audits localhost, and your AI assistant fixes what it finds.
            </p>
          </div>
          <div data-reveal className="[--d:330]">
            <p className="font-mono text-[13px] text-molten-bright md:text-center">in the pull request</p>
            <div className="panel-bone mt-4 overflow-hidden font-mono text-[12.5px] leading-relaxed">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-ink-on-bone/10 px-4 py-2.5">
                <span aria-hidden className="size-2 rounded-full bg-molten-deep" />
                <span className="font-semibold">Septune SEO check</span>
                <span className="ml-auto font-semibold text-molten-deep">failing</span>
              </div>
              <p className="flex gap-3 border-b border-ink-on-bone/10 px-4 py-2">
                <span className="w-14 shrink-0 font-semibold text-molten-deep">critical</span>
                <span>/pricing became noindex</span>
              </p>
              <p className="flex gap-3 border-b border-ink-on-bone/10 px-4 py-2">
                <span className="w-14 shrink-0 text-ink-on-bone/70">warning</span>
                <span>/docs canonical changed</span>
              </p>
              <p className="px-4 py-2 text-ink-on-bone/70">score 91 → 84</p>
            </div>
          </div>
          <div data-reveal className="md:text-center [--d:420]">
            <p className="font-mono text-[13px] text-verdigris-soft">after the merge</p>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted md:mx-auto md:max-w-[17rem]">
              The live site is checked on a schedule, with an alert by email, Slack or Discord when something critical
              changes.
            </p>
          </div>
        </div>
      </Chapter>

      {/* ── 3 · How it's fixed: the file, and the line that breaks it ── */}
      <Chapter id="fix" labelledBy="fix-title" className="field-ember">
        <div className={SPLIT}>
          <div data-stage aria-hidden className={STAGE_SIDE} />
          <div className="relative z-10 lg:order-1">
            <p data-reveal className={LABEL}>
              [how it&apos;s fixed]
            </p>
            <h2 id="fix-title" data-reveal className={`${TITLE} [--d:80]`}>
              Each fix goes <em>to your AI editor.</em>
            </h2>
            <p data-reveal className={`${BODY} [--d:160]`}>
              Every finding comes with the affected URLs and the files to look at. Mechanical ones come with a ready
              patch for your framework.
            </p>

            <pre data-reveal className="panel-bone mt-9 overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed [--d:250]">
              <span className="text-ink-on-bone/60">app/pricing/page.tsx</span>
              {"\n"}
              <span>{"  export const metadata = {\n    title: \"Pricing\",\n"}</span>
              <span className="font-semibold text-molten-deep">{"-   robots: { index: false },\n"}</span>
              <span>{"  };"}</span>
            </pre>

            <ul data-reveal className="mt-8 flex flex-wrap gap-x-5 gap-y-2 [--d:330]" aria-label="Framework guides">
              {FRAMEWORK_PAGES.map((fw) => (
                <li key={fw.slug}>
                  <Link href={`/frameworks/${fw.slug}`} className={TEXT_LINK}>
                    {fw.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div id="security" data-reveal className="mt-10 border-t border-border pt-6 [--d:420]">
              <p className="font-mono text-[13px] text-verdigris-soft">what it never touches</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Septune reads your rendered pages, like any crawler. It never writes to your repository and never reads
                your source code or your environment secrets: fixes reach your code through your own pull requests.
              </p>
            </div>
          </div>
        </div>
      </Chapter>

      {/* ── 4 · Start: as many sites light up as the plan watches ── */}
      <Chapter id="start" labelledBy="start-title" className="field-right">
        <div className={SPLIT}>
          <div data-stage aria-hidden className={STAGE_SIDE} />
          <div className="relative z-10 lg:order-1">
            <p data-reveal className={LABEL}>
              [start]
            </p>
            <h2 id="start-title" data-reveal className={`${TITLE} [--d:80]`}>
              One site watched <em>for free.</em>
            </h2>
            <p data-reveal className={`${BODY} [--d:160]`}>
              No credit card. Plans add sites and check them every day.
            </p>

            <ul className="mt-9 space-y-3">
              {PRICING_TIERS.map((tier, i) => (
                <li key={tier.id} data-reveal className={`panel-bone px-5 py-4 ${STAGGER[i + 1]}`}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-display text-2xl">
                      {tier.name} <span className="font-mono text-sm text-ink-on-bone/70">€{tier.priceMonthly}/month</span>
                    </p>
                    <Link
                      href={tier.ctaHref}
                      className="shrink-0 font-mono text-[13px] text-ink-on-bone underline decoration-ink-on-bone/30 underline-offset-4 transition-colors duration-200 hover:text-molten-deep hover:decoration-molten-deep"
                    >
                      {tier.cta.toLowerCase()}
                    </Link>
                  </div>
                  <p className="mt-1 font-mono text-[12.5px] text-ink-on-bone/75">
                    {tier.limits.sites} {tier.limits.sites === 1 ? "site" : "sites"}, checked {tier.limits.frequency}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-on-bone/85">{tier.tagline}</p>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-5 text-sm leading-relaxed text-fg-subtle [--d:480]">
              {BILLING_NOTE}
            </p>
            <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 [--d:540]">
              <Link
                href="/audit"
                className="inline-flex h-12 items-center rounded-full bg-molten px-6 text-[15px] font-medium text-ink transition-[filter] duration-200 hover:brightness-110"
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

      {/* ── Questions: plain text, nothing waits ── */}
      <section id="faq" aria-labelledby="faq-title" className="relative border-t border-border py-24 md:py-32">
        <div className="container-rf relative z-10 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className={LABEL}>[questions]</p>
            <h2 id="faq-title" className="mt-5 text-[2.4rem] leading-[1.05] tracking-[-0.02em] md:text-5xl">
              What people ask <em>before they try it.</em>
            </h2>
          </div>
          <div className="border-t border-border">
            {FAQS.map((item) => (
              <details key={item.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-base text-fg transition-colors duration-200 hover:text-verdigris-soft [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus aria-hidden className="mt-1 size-4 shrink-0 text-verdigris transition-transform duration-200 group-open:rotate-45" />
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

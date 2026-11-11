import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ForgeField } from "@/components/marketing/forge/forge-field";
import { Letters, plain } from "@/components/marketing/forge/letters";
import { Reveal } from "@/components/marketing/forge/reveal";
import { InlineView, StoryPanel } from "@/components/marketing/product-views";
import { VIEW_LABELS, type View } from "@/components/marketing/views";
import { OwnReport } from "@/components/marketing/own-report";
import { CONTACT_EMAIL } from "@/components/marketing/site-footer";
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
 * One blue stage, one figure at a time. The hero is the first stage; below
 * it the panel stays beside the text (a card above each step on small
 * screens) and the figure turns into the next one in place, on a clock
 * (forge/forge-field.tsx). Text never sits on a figure: the canvas is masked
 * to the [data-forge-region] stages.
 */

// Families of checks, counted from the catalog so the page never drifts from it.
const FAMILY_NAMES: Record<string, string> = {
  indexing: "indexing",
  performance: "performance",
  metadata: "metadata",
  structure: "structure",
  "internal-linking": "internal linking",
  images: "images",
  framework: "framework",
  schema: "structured data",
};
const FAMILIES = Object.entries(
  RULE_CATALOG.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + 1 }), {}),
).sort((a, b) => b[1] - a[1]);

const HERO = [{ text: "Ship fast." }, { text: "Stay indexed.", em: true, br: true }];

const TEXT_LINK =
  "font-mono text-[13px] text-fg underline decoration-ultramarine/40 underline-offset-[6px] transition-colors duration-200 hover:text-ultramarine hover:decoration-ultramarine";

type StepCopy = { view: View; n: string; title: { text: string; em?: boolean }[] };

/**
 * One feature per step: its name, a line that says why it matters, then its
 * own content. Beside it on large screens the panel shows the feature in use
 * (product-views.tsx); on small screens that window sits under the text.
 */
function StepBlock({ copy, children }: { copy: StepCopy; children: React.ReactNode }) {
  const id = `${copy.view}-title`;
  return (
    <article id={copy.view} data-story-step={copy.view} aria-labelledby={id} className="step-block container-rf">
      <div className="step-text">
        <p className="step-label" data-reveal>
          <span className="step-num">{copy.n}</span>
          {VIEW_LABELS[copy.view]}
        </p>
        <h2 id={id} aria-label={plain(copy.title)} data-reveal className="step-title [--d:60]">
          <Letters parts={copy.title} />
        </h2>
        {children}
        <InlineView view={copy.view} />
      </div>
    </article>
  );
}

/* Headlines are the sentence a founder would repeat; the body says how. */
const STEPS: Record<View, StepCopy> = {
  crawl: { view: "crawl", n: "01", title: [{ text: "If Googlebot can't reach it," }, { text: "it doesn't exist.", em: true }] },
  pr: { view: "pr", n: "02", title: [{ text: "The merge that drops pages" }, { text: "never ships.", em: true }] },
  fix: { view: "fix", n: "03", title: [{ text: "Your AI editor gets the proof." }, { text: "You get the fix.", em: true }] },
  monitor: { view: "monitor", n: "04", title: [{ text: "Rankings fade slowly." }, { text: "Pages vanish overnight.", em: true }] },
  ai: { view: "ai", n: "05", title: [{ text: "ChatGPT can't cite" }, { text: "what it can't read.", em: true }] },
};

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS)} />
      <ForgeField />
      <Reveal />

      {/* ── Hero: the first stage. The galaxy on its horizon, the words below it ── */}
      <section data-forge-step="hero" data-forge-region data-nav-hero aria-labelledby="hero-title" className="hero relative overflow-hidden">
        {/* The sky: one gradient field, also behind the steps' panel and the last call. */}
        <div aria-hidden className="sky-field" />
        {/* The galaxy's box: centred on the horizon, wider than the screen. The
            words stand in clearings (data-forge-hole) where it is dimmed. */}
        <div aria-hidden data-forge-stage="hero" className="hero-stage" />
        {/* Proof before atmosphere: the real report, one click away. */}
        <Link href="#report" data-forge-hole className="hero-proof">
          <span className="report-score report-score-sm" style={{ "--score": 100 } as React.CSSProperties}>
            <span className="text-[15px] font-semibold text-navy">100</span>
          </span>
          <span>
            <span className="block text-[14px] font-medium text-navy">septune.dev, audited by Septune</span>
            <span className="mt-0.5 block font-mono text-[12px] text-navy/70">94 pages in 9 s · see the report</span>
          </span>
        </Link>
        <div className="hero-words container-rf relative z-10 flex min-h-[100svh] flex-col justify-end pt-[76px] pb-10 lg:pb-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
            <div data-forge-hole>
              <h1 id="hero-title" aria-label={plain(HERO)} className="hero-title">
                <Letters parts={HERO} />
              </h1>
            </div>
            <div data-forge-hole className="lg:pb-2">
              <p className="text-lg leading-relaxed text-on-blue md:text-xl">
                The SEO guard for teams that deploy every day. It crawls like Google, blocks the pull request that would
                drop pages, and watches production.
              </p>
              <form action="/audit" method="get" className="mt-7">
                <label htmlFor="hero-url" className="sr-only">
                  Your site&apos;s URL
                </label>
                <div className="url-field">
                  <input
                    id="hero-url"
                    name="url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    required
                    placeholder="your-site.com"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-navy placeholder:text-navy/70 focus:outline-none"
                  />
                  <button type="submit" className="btn-lime h-11 shrink-0 px-6">
                    Audit free
                  </button>
                </div>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <p className="font-mono text-[13px] text-on-blue-muted">
                  no signup · 3 pages free
                </p>
                <TourVideo className="tour-on-blue" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Five features: the text on paper, the feature in use in the panel beside it ── */}
      <section id="how-it-works" aria-label="What Septune does" className="story relative">
        <div className="story-stage max-lg:hidden">
          <div className="story-stage-grid container-rf">
            <div className="stage-spacer" />
            <StoryPanel />
          </div>
        </div>

        <div className="story-steps">
          <StepBlock copy={STEPS.crawl}>
            <p data-reveal className="step-body [--d:160]">
              Septune follows your links, your sitemap and your robots.txt by Google&apos;s rules, then runs {CHECKS}{" "}
              checks on every page it reaches. Each finding comes with its proof.
            </p>
            <ul id="features" data-reveal className="mt-7 flex flex-wrap gap-1.5 [--d:260]" aria-label="What the checks cover">
              {FAMILIES.map(([cat, n]) => (
                <li key={cat} className="chip">
                  {FAMILY_NAMES[cat] ?? cat} <span className="text-fg-subtle tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-6 [--d:340]">
              <Link href="/docs" className={TEXT_LINK}>
                read every check
              </Link>
            </p>
          </StepBlock>

          <StepBlock copy={STEPS.pr}>
            <p data-reveal className="step-body [--d:160]">
              On every pull request, the GitHub Action audits the preview against production, page by page. A page
              that would leave Google fails the check, before anyone merges.
            </p>
            <ol data-reveal className="points mt-7 [--d:260]">
              <li>
                <span>before the push</span>The CLI or the Claude Code plugin audits localhost.
              </li>
              <li>
                <span>in the pull request</span>Preview against production, one comment, one check.
              </li>
              <li>
                <span>after the merge</span>Production, on a schedule.
              </li>
            </ol>
          </StepBlock>

          <StepBlock copy={STEPS.fix}>
            <p data-reveal className="step-body [--d:160]">
              Findings reach Claude Code, Cursor, VS Code or Windsurf over MCP, with the URLs, the evidence and the file
              to change. Mechanical fixes come as a ready patch for your framework.
            </p>
            <ul data-reveal className="mt-7 flex flex-wrap gap-x-5 gap-y-2 [--d:260]" aria-label="Framework guides">
              {FRAMEWORK_PAGES.map((fw) => (
                <li key={fw.slug}>
                  <Link href={`/frameworks/${fw.slug}`} className={TEXT_LINK}>
                    {fw.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p id="security" data-reveal className="mt-6 text-sm leading-relaxed text-fg-muted [--d:340]">
              Septune reads your pages like any crawler. It never writes to your repository and never sees your source
              code or secrets.{" "}
              <Link href="/docs/agent" className={TEXT_LINK}>
                connect your editor
              </Link>
            </p>
          </StepBlock>

          <StepBlock copy={STEPS.monitor}>
            <p data-reveal className="step-body [--d:160]">
              Septune re-reads production on a schedule and tells you the day something breaks, by email, Slack,
              Discord or webhook. One site is free, no card.
            </p>
            <ul className="mt-7 space-y-2.5">
              {PRICING_TIERS.map((tier, i) => (
                <li
                  key={tier.id}
                  data-reveal
                  data-tier={i}
                  className="ui-card plan"
                  style={{ "--d": 240 + i * 80 } as React.CSSProperties}
                >
                  <div>
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-2xl text-fg">{tier.name}</span>
                      <span className="font-mono text-[13px] text-fg-muted">€{tier.priceMonthly}/month</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[12.5px] text-fg-subtle">
                      {tier.limits.sites} {tier.limits.sites === 1 ? "site" : "sites"}, checked {tier.limits.frequency}
                    </p>
                  </div>
                  <Link href={tier.ctaHref} className={TEXT_LINK}>
                    {tier.cta.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-4 text-sm leading-relaxed text-fg-subtle [--d:500]">
              {BILLING_NOTE}
            </p>
          </StepBlock>

          <StepBlock copy={STEPS.ai}>
            <p data-reveal className="step-body [--d:160]">
              Most AI crawlers don&apos;t run JavaScript. Septune checks which of 21 crawlers your robots.txt lets in,
              from Googlebot to OAI-SearchBot, and how much of each page they can actually read.
            </p>
            <p data-reveal className="mt-6 [--d:260]">
              <Link href="/ai-crawlers" className={TEXT_LINK}>
                the crawlers behind AI answers
              </Link>
            </p>
          </StepBlock>
        </div>
      </section>

      {/* ── The product, with real output: Septune's report on this site ── */}
      <section id="report" aria-labelledby="report-title" className="relative z-10 py-24 md:py-32">
        <div className="container-rf">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-end lg:gap-16">
            <div>
              <p className="step-label" data-reveal>
                A real report
              </p>
              <h2 id="report-title" aria-label="We ran Septune on this site." data-reveal className="step-title [--d:60]">
                <Letters parts={[{ text: "We ran Septune" }, { text: "on this site.", em: true }]} />
              </h2>
            </div>
            <p data-reveal className="step-body lg:pb-2 [--d:140]">
              94 pages in 9 seconds, on 2 November 2026. The run is shown as it came out, including its one note.
            </p>
          </div>
          <div data-reveal className="mt-12 [--d:220]">
            <OwnReport />
          </div>
        </div>
      </section>

      {/* ── Questions: plain text, nothing waits ── */}
      <section id="faq" aria-labelledby="faq-title" className="relative z-10 border-t border-border py-24 md:py-32">
        <div className="container-rf grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="step-label">Questions</p>
            <h2 id="faq-title" className="step-title">
              What people ask <em>before they try it.</em>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-fg-muted">
              Something not covered here? Write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-fg underline decoration-fg/30 underline-offset-4 transition-colors duration-200 hover:decoration-ultramarine"
              >
                {CONTACT_EMAIL}
              </a>
              , or audit your own site and read what Septune reports.
            </p>
          </div>
          <div className="border-t border-border">
            {FAQS.map((item) => (
              <details key={item.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-base text-fg transition-colors duration-200 hover:text-ultramarine [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus aria-hidden className="mt-1 size-4 shrink-0 text-ultramarine transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="max-w-2xl pb-6 text-sm leading-relaxed text-fg-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Last call, on the blue again ── */}
      <section aria-labelledby="cta-title" className="cta-band relative z-10 overflow-hidden">
        <div aria-hidden className="sky-field sky-field--dawn" />
        <div className="container-rf relative grid gap-8 py-20 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-16">
          <h2 id="cta-title" className="cta-title">
            Know what Google sees <em>before your next deploy.</em>
          </h2>
          <form action="/audit" method="get">
            <label htmlFor="cta-url" className="sr-only">
              Your site&apos;s URL
            </label>
            <div className="url-field">
              <input
                id="cta-url"
                name="url"
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                required
                placeholder="your-site.com"
                className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-navy placeholder:text-navy/70 focus:outline-none"
              />
              <button type="submit" className="btn-lime h-11 shrink-0 px-6">
                Audit free
              </button>
            </div>
            <p className="mt-4 font-mono text-[13px] text-on-blue-muted">no signup · 3 pages free</p>
          </form>
        </div>
      </section>
    </>
  );
}

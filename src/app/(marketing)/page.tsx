import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ForgeField } from "@/components/marketing/forge/forge-field";
import { Letters, plain } from "@/components/marketing/forge/letters";
import { Reveal } from "@/components/marketing/forge/reveal";
import { finalReadout, type Step } from "@/components/marketing/forge/scenes";
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

type StepCopy = { step: Step; n: string; label: string; title: { text: string; em?: boolean }[] };

/** The step's number, name and headline, then its own content. */
function StepText({ copy, children }: { copy: StepCopy; children: React.ReactNode }) {
  const id = `${copy.step}-title`;
  return (
    <div className="step-text">
      <p className="step-label" data-reveal>
        <span className="step-num">{copy.n}</span>
        {copy.label}
      </p>
      <h2 id={id} aria-label={plain(copy.title)} data-reveal className="step-title [--d:60]">
        <Letters parts={copy.title} />
      </h2>
      {children}
      <p className="readout" data-reveal style={{ "--d": 420 } as React.CSSProperties}>
        <span aria-hidden className="readout-dot" />
        <span data-forge-readout aria-live="off">
          {finalReadout(copy.step)}
        </span>
      </p>
    </div>
  );
}

/** A step: on small screens its own blue card above the text, on large ones the shared panel beside it. */
function StepBlock({ copy, children }: { copy: StepCopy; children: React.ReactNode }) {
  return (
    <article id={copy.step} data-forge-step={copy.step} aria-labelledby={`${copy.step}-title`} className="step-block container-rf">
      <div aria-hidden data-forge-region data-forge-stage={copy.step} className="step-card" />
      <StepText copy={copy}>{children}</StepText>
    </article>
  );
}

const STEPS: Record<Step, StepCopy> = {
  hero: { step: "hero", n: "", label: "", title: [] },
  read: { step: "read", n: "01", label: "Read", title: [{ text: "It reads your site" }, { text: "the way Googlebot does.", em: true }] },
  catch: { step: "catch", n: "02", label: "Catch", title: [{ text: "It fails the pull request" }, { text: "that would drop pages from Google.", em: true }] },
  fix: { step: "fix", n: "03", label: "Fix", title: [{ text: "Each fix goes" }, { text: "to your AI editor.", em: true }] },
  watch: { step: "watch", n: "04", label: "Watch", title: [{ text: "One site watched" }, { text: "for free.", em: true }] },
};

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS)} />
      <ForgeField />
      <Reveal />

      {/* ── Hero: the first stage. The figure above, the words below it ── */}
      <section data-forge-step="hero" data-forge-region data-nav-hero aria-labelledby="hero-title" className="hero relative overflow-hidden">
        {/* Proof before atmosphere: the real report, one click away. */}
        <Link href="#report" className="hero-proof">
          <span className="report-score report-score-sm" style={{ "--score": 99 } as React.CSSProperties}>
            <span className="text-[15px] font-semibold text-navy">99</span>
          </span>
          <span>
            <span className="block text-[14px] font-medium text-navy">septune.dev, audited by Septune</span>
            <span className="mt-0.5 block font-mono text-[12px] text-navy/70">93 pages in 8 s · see the report</span>
          </span>
        </Link>
        <div className="container-rf relative z-10 flex min-h-[100svh] flex-col pt-[76px] pb-10 lg:pb-14">
          {/* The figure's box takes the room the words leave: it can never sit under them. */}
          <div aria-hidden data-forge-stage="hero" className="hero-stage" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
            <div>
              <p className="hero-pill">
                <span aria-hidden className="size-1.5 rounded-full bg-lime" />
                technical SEO, checked on every deploy
              </p>
              <h1 id="hero-title" aria-label={plain(HERO)} className="hero-title">
                <Letters parts={HERO} />
              </h1>
            </div>
            <div className="lg:pb-2">
              <p className="text-lg leading-relaxed text-on-blue md:text-xl">
                Septune reads your site the way Googlebot does and checks it where SEO breaks: in your editor, in every
                pull request, and in production.
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
                    className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-navy placeholder:text-navy/55 focus:outline-none"
                  />
                  <button type="submit" className="btn-lime h-11 shrink-0 px-6">
                    Audit free
                  </button>
                </div>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <p className="font-mono text-[13px] text-on-blue-muted">
                  no signup · {CHECKS} checks · every finding cites its evidence
                </p>
                <TourVideo className="tour-on-blue" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The four steps: text on paper, the figure in the panel beside it ── */}
      <section aria-label="How Septune works" className="story relative">
        <div className="story-stage">
          <div className="container-rf grid h-full grid-cols-[minmax(0,30rem)_1fr] gap-16 pt-[88px] pb-5">
            <div />
            <div data-forge-panel className="stage-col">
              <div aria-hidden data-forge-region data-forge-stage="read catch fix watch" className="stage-panel" />
              <nav aria-label="Steps" className="stage-chips">
                {(["read", "catch", "fix", "watch"] as const).map((s) => (
                  <a key={s} href={`#${s}`} data-chip={s}>
                    <span>{STEPS[s].n}</span> {STEPS[s].label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="story-steps">
          <StepBlock copy={STEPS.read}>
            <p data-reveal className="step-body [--d:160]">
              Links first, then every URL your sitemap lists. robots.txt is read and honoured the way Google reads it,
              and every page it reaches goes through the same {CHECKS} checks.
            </p>
            <div data-reveal className="mt-7 [--d:260]">
              <p className="font-mono text-[12.5px] text-fg-subtle">{CHECKS} checks, by family</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What the checks cover">
                {FAMILIES.map(([cat, n]) => (
                  <li key={cat} className="chip">
                    {FAMILY_NAMES[cat] ?? cat} <span className="text-fg-subtle tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p data-reveal className="mt-6 text-sm leading-relaxed text-fg-muted [--d:340]">
              The figure is this site: septune.dev, crawled by Septune on 1 November 2026.{" "}
              <Link href="/docs" className={TEXT_LINK}>
                read every check
              </Link>
            </p>
          </StepBlock>

          <StepBlock copy={STEPS.catch}>
            <p data-reveal className="step-body [--d:160]">
              Septune checks every deploy at three points. In the pull request, the GitHub Action audits the preview
              against production, page by page, and stops what would leave search.
            </p>
            <div data-reveal className="ui-card mt-7 font-mono text-[12.5px] leading-relaxed [--d:260]">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border px-4 py-2.5">
                <span aria-hidden className="size-2 rounded-full bg-danger" />
                <span className="font-semibold text-fg">Septune SEO check</span>
                <span className="ml-auto font-semibold text-danger">failing</span>
              </div>
              <p className="flex gap-3 border-b border-border px-4 py-2">
                <span className="w-16 shrink-0 font-semibold text-danger">critical</span>
                <span className="text-fg">/pricing became noindex</span>
              </p>
              <p className="flex gap-3 border-b border-border px-4 py-2">
                <span className="w-16 shrink-0 text-fg-muted">warning</span>
                <span className="text-fg">/docs canonical changed</span>
              </p>
              <p className="px-4 py-2 text-fg-muted">score 91 to 84</p>
            </div>
            <ol data-reveal className="points mt-6 [--d:340]">
              <li>
                <span>before you push</span>The CLI or the Claude Code plugin audits localhost.
              </li>
              <li>
                <span>in the pull request</span>The check above, on the preview.
              </li>
              <li>
                <span>after the merge</span>Production on a schedule, alerts by email, Slack, Discord or webhook.
              </li>
            </ol>
          </StepBlock>

          <StepBlock copy={STEPS.fix}>
            <p data-reveal className="step-body [--d:160]">
              Every finding comes with the affected URLs and the files to look at. Mechanical ones come with a ready
              patch for your framework.
            </p>
            <pre data-reveal className="ui-card diff mt-7 overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed [--d:260]">
              <span className="text-fg-subtle">app/pricing/page.tsx</span>
              {"\n"}
              <span className="text-fg">{"  export const metadata = {\n    title: \"Pricing\",\n"}</span>
              <span className="diff-del">{"-   robots: { index: false },\n"}</span>
              <span className="text-fg">{"  };"}</span>
            </pre>
            <ul data-reveal className="mt-6 flex flex-wrap gap-x-5 gap-y-2 [--d:340]" aria-label="Framework guides">
              {FRAMEWORK_PAGES.map((fw) => (
                <li key={fw.slug}>
                  <Link href={`/frameworks/${fw.slug}`} className={TEXT_LINK}>
                    {fw.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-5 text-sm leading-relaxed text-fg-muted [--d:380]">
              In Claude Code, Cursor, VS Code or Windsurf, over MCP:{" "}
              <Link href="/docs/agent" className={TEXT_LINK}>
                connect your editor
              </Link>
              . Septune reads your rendered pages like any crawler; it never writes to your repository and never reads
              your source code or secrets.
            </p>
          </StepBlock>

          <StepBlock copy={STEPS.watch}>
            <p data-reveal className="step-body [--d:160]">
              No credit card. Plans add sites and check them every day.
            </p>
            <ul className="mt-7 space-y-2.5">
              {PRICING_TIERS.map((tier, i) => (
                <li key={tier.id} data-reveal className="ui-card plan" style={{ "--d": 240 + i * 80 } as React.CSSProperties}>
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
              On 1 November 2026 it read septune.dev, 93 pages in 8 seconds. This is everything it found, nothing
              removed: three things to fix, two that are expected.
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
      <section aria-labelledby="cta-title" className="cta-band relative z-10">
        <div className="container-rf grid gap-8 py-20 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-16">
          <h2 id="cta-title" className="cta-title">
            See what Septune finds <em>on your site.</em>
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
                className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-navy placeholder:text-navy/55 focus:outline-none"
              />
              <button type="submit" className="btn-lime h-11 shrink-0 px-6">
                Audit free
              </button>
            </div>
            <p className="mt-4 font-mono text-[13px] text-on-blue-muted">no signup · {CHECKS} checks · results in seconds</p>
          </form>
        </div>
      </section>
    </>
  );
}

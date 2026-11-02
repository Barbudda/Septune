import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import Link from "next/link";
import { PublicAudit } from "@/components/marketing/public-audit";
import { FlowField } from "@/components/marketing/dots/flow-field-layer";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { config } from "@/lib/config";
import { RULE_CATALOG } from "@/lib/audit/catalog";

export const metadata: Metadata = {
  title: "Free technical SEO audit: measured, no signup",
  description:
    "Free technical SEO audit of any site, no account needed. Measures metadata, indexing, images, structured data, links and speed, with evidence. No AI guessing.",
  alternates: { canonical: "/audit" },
  openGraph: {
    title: "Free technical SEO audit: measured, no signup",
    description:
      "Enter a URL, get a scored technical-SEO report with evidence for every issue. Free, no account, no AI guessing.",
    url: "/audit",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
};

const CHECKS = [
  ["Metadata", "Missing or duplicate titles and descriptions, length, OpenGraph and Twitter cards."],
  ["Indexing", "Canonicals, accidental noindex, html lang, redirect chains, near-duplicate pages."],
  ["Structure", "H1s, skipped heading levels, thin pages, readability, title vs. content alignment."],
  ["Images", "Missing alt text and dimensions, lazy-loading, real byte weights and legacy formats."],
  ["Structured data", "Missing JSON-LD and schema.org blocks missing required properties."],
  ["Internal linking", "Orphan pages, click depth, broken links (real HTTP status), semantic link gaps."],
  ["Performance", "Server response time, render-blocking resources, oversized HTML, mixed content."],
  ["Framework", "robots.txt and sitemap presence and conventions for Next.js, Nuxt, Astro, SvelteKit…"],
] as const;

export default function FreeAuditPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Free SEO audit", path: "/audit" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Septune free technical SEO audit",
            url: `${config.appUrl}/audit`,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            description:
              "Free, no-signup technical SEO audit that measures a site's metadata, indexing, images, structured data, internal links and performance.",
          },
        ]}
      />

      <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
        <FlowField
          variant="pricing"
          className="[mask-image:linear-gradient(to_bottom,transparent_10%,#000_50%,#000_85%,transparent)]"
        />
        <div className="container-rf relative z-10">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
              Free technical SEO audit. <em>Measured</em>, not guessed.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-fg-muted">
              Enter a URL. Septune crawls the rendered pages and reports every technical-SEO issue it
              can actually evidence, with the affected URLs and a ready patch where one exists. No
              account, no AI, no data kept.
            </p>
            <div className="mt-8">
              <PublicAudit />
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container-rf">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What it measures</h2>
            <p className="mt-3 text-fg-muted">
              Eight categories, {RULE_CATALOG.length} checks, all deterministic. Green in a Septune report always means
              measured. A finding is never reported without evidence from the page.
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {CHECKS.map(([name, desc]) => (
                <div key={name} className="lg rounded-2xl p-4">
                  <dt className="font-medium text-fg">{name}</dt>
                  <dd className="mt-1 text-sm text-fg-muted">{desc}</dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-16 text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
            <ol className="mt-6 space-y-4">
              {[
                ["Crawl", "It fetches your pages the way a search engine does: the rendered HTML, following internal links breadth-first."],
                ["Measure", "A rule engine checks each page, builds the internal link graph, and probes images and links for their real weight and status."],
                ["Report", "You get a score per category and an issue list ranked by impact, each with its evidence and the pages it affects."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface font-mono text-sm text-molten-bright">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-fg">{t}</div>
                    <p className="mt-0.5 text-sm text-fg-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h2 className="mt-16 text-2xl font-semibold tracking-tight md:text-3xl">The honest limits</h2>
            <div className="mt-4 space-y-3 text-fg-muted">
              <p>
                The free audit crawls <strong className="text-fg">3 pages</strong> so it stays instant and
                free for everyone. The full crawl (up to 24 pages), audit history and fixes grouped by file
                are in the{" "}
                <Link href="/signup" className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright">
                  free app
                </Link>
                ; unlimited audits (including <span className="font-mono text-sm">localhost</span>) are
                one command away with the open-source CLI:{" "}
                <span className="font-mono text-sm text-fg">npx septune audit &lt;url&gt;</span>.
              </p>
              <p>
                It audits the technical layer your code controls. It can&apos;t see your backlinks, your
                search volumes or your rankings, since no in-browser tool honestly can, and Septune never
                promises ranking outcomes.
              </p>
              <p>
                It only reads public pages, the same way any crawler does. Private and internal addresses
                are refused, and nothing you audit is stored.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

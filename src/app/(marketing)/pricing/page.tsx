import type { Metadata } from "next";
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing";
import { ComparisonSection } from "@/components/marketing/sections";
import { FaqSection } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { PRICING_FAQS } from "@/lib/seo/content";
import { LIMIT_TABLE } from "@/lib/pricing";

const TITLE = "Pricing: Free, Pro and Studio plans";
const DESCRIPTION =
  "Septune pricing: free audits, CLI and CI gate; paid plans for daily SEO monitoring with alerts when a deploy breaks something.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `${TITLE} · Septune`,
    description: DESCRIPTION,
    url: "/pricing",
    siteName: "Septune",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · Septune`,
    description: DESCRIPTION,
  },
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(PRICING_FAQS)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />
      <section className="relative overflow-hidden pt-36 pb-4">
        <div className="absolute inset-x-0 top-0 h-96 spotlight" />
        <div className="container-rf relative text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Free to audit. Paid to keep watch.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted">
            Everything that runs on your machine is free. Plans pay for Septune
            checking your live sites every day and alerting you when a deploy
            breaks SEO.
          </p>
        </div>
      </section>
      <PricingSection standalone />
      <p className="container-rf -mt-6 pb-10 text-center text-sm text-fg-muted">
        What the pull-request gate compares, page by page:{" "}
        <Link
          href="/guides/seo-regression-testing"
          className="text-fg underline decoration-ultramarine/40 underline-offset-4 transition-colors hover:text-ultramarine"
        >
          SEO regression testing, preview against production
        </Link>
        .
      </p>
      <section id="limits" className="container-rf scroll-mt-24 pb-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Where each limit applies</h2>
          <p className="mt-2 text-sm text-fg-muted">
            The page limits differ because the places differ: a free audit on this site, an audit in the app,
            and a crawl that runs on your own machine.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-fg-subtle">
                <tr>
                  <th className="py-2 pr-4 font-medium">Where</th>
                  <th className="py-2 pr-4 font-medium">Limit</th>
                  <th className="py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {LIMIT_TABLE.map((r) => (
                  <tr key={r.where} className="border-t border-border align-top">
                    <th scope="row" className="py-2 pr-4 font-medium text-fg">{r.where}</th>
                    <td className="py-2 pr-4 tabular-nums text-fg">{r.limit}</td>
                    <td className="py-2 text-fg-muted">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <ComparisonSection />
      <FaqSection items={PRICING_FAQS} title="Pricing questions" />
      <FinalCta />
    </>
  );
}

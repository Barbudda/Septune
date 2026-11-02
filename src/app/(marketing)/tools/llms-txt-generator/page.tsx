import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import Link from "next/link";
import { LlmsTxtGenerator } from "@/components/marketing/tools/llms-txt-generator";
import { FlowField } from "@/components/marketing/dots/flow-field-layer";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Free llms.txt generator and checker",
  description:
    "Generate an llms.txt from your real pages in seconds, and check the one you already have. Free, no signup, robots.txt honoured, nothing stored.",
  alternates: { canonical: "/tools/llms-txt-generator" },
  openGraph: {
    title: "Free llms.txt generator and checker",
    description: "Crawls your site, writes an llms.txt from its pages, checks your current one. Free, no signup.",
    url: "/tools/llms-txt-generator",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function LlmsTxtGeneratorPage() {
  const link = "text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright";
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "llms.txt generator", path: "/tools/llms-txt-generator" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Septune llms.txt generator",
            url: `${config.appUrl}/tools/llms-txt-generator`,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            description: "Free generator that crawls a site and writes an llms.txt from its pages, and checks an existing llms.txt's format.",
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
              llms.txt generator
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-fg-muted">
              Paste your site&apos;s URL. Septune crawls up to 15 pages, writes an llms.txt from their real titles and
              descriptions, and checks the one you already have.
            </p>
            <div className="mt-8">
              <LlmsTxtGenerator />
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container-rf">
          <div className="mx-auto max-w-3xl space-y-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What llms.txt is</h2>
              <p className="mt-3 text-fg-muted">
                A Markdown file at <span className="font-mono text-sm">/llms.txt</span>, proposed at{" "}
                <a className={link} href="https://llmstxt.org">
                  llmstxt.org
                </a>
                : the site&apos;s name as a heading, a one-line summary, then links to the pages that matter, each with
                a short description. It gives AI tools a clean map of the site instead of navigation and markup. Real
                files from Svelte, Cloudflare and Stripe are in the{" "}
                <Link href="/guides/llms-txt-examples" className={link}>
                  llms.txt examples guide
                </Link>
                .
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Does it help?</h2>
              <p className="mt-3 text-fg-muted">
                Honestly: it&apos;s a proposal, not a standard. Google Search doesn&apos;t use it, some AI tools and
                agents read it, and Lighthouse now checks for it. It costs one file and a minute, which is why
                Septune&apos;s AI-search audit reports it as a suggestion, never as an error. What decides whether
                answer engines can cite you is still access (robots.txt), text in the server HTML, and clear answers.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Keep it current</h2>
              <p className="mt-3 text-fg-muted">
                Pages change; a stale llms.txt points at pages that moved. The open-source CLI regenerates it from the
                whole site in your build or CI:{" "}
                <span className="font-mono text-sm">npx septune llms https://your-site.com --out public/llms.txt</span>.
                To see everything AI search engines need from your site, run the{" "}
                <Link href="/audit" className={link}>
                  free audit
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

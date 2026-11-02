import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/og";
import Link from "next/link";
import { NoindexChecker } from "@/components/marketing/tools/noindex-checker";
import { FlowField } from "@/components/marketing/dots/flow-field-layer";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Noindex checker: can Google index this page?",
  description:
    "Free noindex checker: one URL, every place Google reads an indexing directive. Status code, X-Robots-Tag, robots and googlebot meta, robots.txt, canonical.",
  alternates: { canonical: "/tools/noindex-checker" },
  openGraph: {
    title: "Noindex checker: can Google index this page?",
    description: "Paste a URL and see what keeps it out of Google, if anything. Free, no signup.",
    url: "/tools/noindex-checker",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
};

const WHERE = [
  ["The X-Robots-Tag header", "Sent by the server, invisible in the HTML. A CDN rule, a staging setting or a framework's preview mode can add it to every page."],
  ["The robots and googlebot meta tags", "In the page's head. One line in a shared layout noindexes every page built on it."],
  ["robots.txt", "It doesn't remove a page from Google, it stops Google from reading it, including any noindex on it. Blocking a page you want gone keeps it listed."],
  ["The canonical", "Not a directive, a hint: a canonical pointing elsewhere tells Google to index the other URL instead."],
] as const;

export default function NoindexCheckerPage() {
  const link = "text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright";
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Noindex checker", path: "/tools/noindex-checker" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Septune noindex checker",
            url: `${config.appUrl}/tools/noindex-checker`,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            description: "Free check of whether Google can index a URL: HTTP status, X-Robots-Tag, robots and googlebot meta tags, robots.txt and canonical.",
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
              Noindex checker
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-fg-muted">
              Paste a URL. Septune checks every place Google reads an indexing directive and tells you which one, if
              any, keeps the page out of search.
            </p>
            <div className="mt-8">
              <NoindexChecker />
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-20">
        <div className="container-rf">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Where a noindex hides</h2>
            <p className="mt-3 text-fg-muted">
              Most accidental noindexes don&apos;t come from someone typing one. They come with a deploy. The{" "}
              <Link href="/docs/issues/indexing-noindex" className={link}>
                noindex check page
              </Link>{" "}
              shows exactly what Septune reads and how to fix each source.
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {WHERE.map(([t, d]) => (
                <div key={t} className="lg rounded-2xl p-5">
                  <dt className="text-sm font-semibold text-fg">{t}</dt>
                  <dd className="mt-1.5 text-sm text-fg-muted">{d}</dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-14 text-2xl font-semibold tracking-tight md:text-3xl">Catch it before Google does</h2>
            <p className="mt-3 text-fg-muted">
              This checker looks at one page, once. Septune checks every page of a pull request&apos;s preview against
              production and fails the check when a page would turn noindex, then watches the live site every day.
              Start with the{" "}
              <Link href="/audit" className={link}>
                free audit
              </Link>
              , or run <span className="font-mono text-sm">npx septune audit your-site.com</span> on any site,
              localhost included.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

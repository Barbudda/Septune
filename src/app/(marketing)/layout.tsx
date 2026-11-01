import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { siteGraph } from "@/lib/seo/schema";
import { RULE_CATALOG } from "@/lib/audit/catalog";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // forge-ui: the marketing surface since the 2026-10-31 redesign (thin
    // lines instead of glass, docs/DESIGN.md). The app keeps its own look.
    <div className="forge-ui">
      {/* Site-wide entity graph (Organization + WebSite + SoftwareApplication) */}
      <JsonLd data={siteGraph} />
      {/* The nav watches this marker to know the page has moved (site-nav.tsx). */}
      <div data-nav-top aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-2" />
      <SiteNav checks={RULE_CATALOG.length} />
      <main className="marketing relative">{children}</main>
      <SiteFooter />
    </div>
  );
}

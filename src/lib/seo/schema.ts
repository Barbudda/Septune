/**
 * JSON-LD structured data for the Septune marketing site.
 *
 * Septune is a technical-SEO product, so its own site ships best-in-class
 * structured data: a single @graph (Organization + WebSite + SoftwareApplication
 * with machine-readable pricing) rendered once on every public page, plus
 * per-page helpers for FAQ and breadcrumbs.
 *
 * All absolute URLs come from the single hardened `config.appUrl` so they are
 * correct in production (never localhost). Currency mirrors the prices the UI
 * actually renders (EUR) — see src/components/marketing/pricing.tsx.
 */
import { config } from "@/lib/config";
import { BILLING_OPEN, PRICING_TIERS } from "@/lib/pricing";
import { RULE_CATALOG } from "@/lib/audit/catalog";
import { LEGAL } from "@/lib/legal";

const APP_URL = config.appUrl;
const PRICE_CURRENCY = "EUR";

const DESCRIPTION =
  "Automated technical SEO for developers. Septune fails the pull request that would drop pages from Google and watches production after the merge.";

// The profiles that are the same entity: the open-source CLI's repository
// and its npm package (published as rankforge-cli, Septune's first name).
// GitHub keeps redirecting the repository's old name after a rename.
const SAME_AS = ["https://github.com/Barbudda/rankforge-cli", "https://www.npmjs.com/package/rankforge-cli"];

const organization = {
  "@type": "Organization",
  "@id": `${APP_URL}/#organization`,
  name: "Septune",
  url: APP_URL,
  // A raster logo: Google's logo and favicon surfaces don't read SVG.
  logo: `${APP_URL}/icon-512.png`,
  description: DESCRIPTION,
  sameAs: SAME_AS,
  founder: { "@type": "Person", name: LEGAL.name },
  email: LEGAL.email,
  address: { "@type": "PostalAddress", addressLocality: "Sevrier", postalCode: "74320", addressCountry: "FR" },
};

const website = {
  "@type": "WebSite",
  "@id": `${APP_URL}/#website`,
  url: APP_URL,
  name: "Septune",
  description: DESCRIPTION,
  publisher: { "@id": `${APP_URL}/#organization` },
};

const pricedTiers = PRICING_TIERS.filter(
  (t): t is typeof t & { priceMonthly: number } => t.priceMonthly !== null,
);
const prices = pricedTiers.map((t) => t.priceMonthly);

const softwareApplication = {
  "@type": "SoftwareApplication",
  "@id": `${APP_URL}/#software`,
  name: "Septune",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: APP_URL,
  description: DESCRIPTION,
  publisher: { "@id": `${APP_URL}/#organization` },
  featureList: [
    `Deterministic technical-SEO audit: ${RULE_CATALOG.length} checks with evidence, no AI guessing`,
    "Production monitoring with email, Slack, Discord and webhook alerts",
    "Regression gate for pull requests: preview against production",
    "AI-search readiness (GEO): AI crawler access, llms.txt, citability",
    "Core Web Vitals of real users (Chrome UX Report)",
    "Ready patches for mechanical fixes: robots.txt, sitemap, canonical, viewport, lang, JSON-LD, OpenGraph",
    "MCP server and Claude Code plugin for AI coding assistants",
    "White-label HTML reports",
  ],
  // Until billing opens, the free plan is the only offer anyone can take: the
  // paid prices are announced on /pricing, not sold, so they stay out of the
  // markup (structured data must describe what exists).
  offers: BILLING_OPEN
    ? {
        "@type": "AggregateOffer",
        priceCurrency: PRICE_CURRENCY,
        lowPrice: String(Math.min(...prices)),
        highPrice: String(Math.max(...prices)),
        offerCount: pricedTiers.length,
        offers: pricedTiers.map((t) => ({
          "@type": "Offer",
          name: t.name,
          price: String(t.priceMonthly),
          priceCurrency: PRICE_CURRENCY,
          url: `${APP_URL}/pricing`,
          category: "subscription",
        })),
      }
    : { "@type": "Offer", name: "Free", price: "0", priceCurrency: PRICE_CURRENCY, url: `${APP_URL}/pricing` },
};

/** Site-wide entity graph — render once per public page (marketing layout). */
export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [organization, website, softwareApplication],
};

/** FAQPage schema built from the on-page FAQ so markup and data never drift. */
export function faqPageSchema(faqs: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * TechArticle for a documentation page: dated with the real publication and
 * last-change dates, published by Septune (the organization of siteGraph).
 */
export function techArticleSchema(a: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: a.headline,
    description: a.description,
    url: `${APP_URL}${a.path}`,
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    author: { "@id": `${APP_URL}/#organization` },
    publisher: { "@id": `${APP_URL}/#organization` },
    isPartOf: { "@id": `${APP_URL}/#website` },
  };
}

/** BreadcrumbList for a second-level page (e.g. Home › Pricing). */
export function breadcrumbSchema(
  items: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${APP_URL}${it.path}`,
    })),
  };
}

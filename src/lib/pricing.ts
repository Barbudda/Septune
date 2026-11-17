import type { Plan } from "@/types";

/**
 * Plans and their limits: one source for the pricing page, the billing
 * screen, the JSON-LD offers, the support chatbot and the monitoring limits.
 *
 * Rule for this file: a feature is listed only once it works. What's planned
 * goes in ROADMAP, labelled as not available yet.
 */

export interface PlanLimits {
  /** Sites Septune monitors on its own. */
  sites: number;
  /** How often each monitored site is checked. */
  frequency: "daily" | "weekly";
  /** Pages crawled per check. */
  pages: number;
  /** Alert channels: email, and Slack / Discord / any webhook. */
  webhooks: boolean;
  /** Months of check history kept. */
  historyMonths: number;
}

export interface PricingTier {
  id: Plan;
  name: string;
  priceMonthly: number;
  tagline: string;
  highlight?: boolean;
  cta: string;
  /** CTA destination: the pre-order page until payments open, then the billing page (Stripe Checkout). */
  ctaHref: string;
  features: string[];
  limits: PlanLimits;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { sites: 1, frequency: "weekly", pages: 25, webhooks: false, historyMonths: 3 },
  pro: { sites: 5, frequency: "daily", pages: 100, webhooks: true, historyMonths: 12 },
  studio: { sites: 25, frequency: "daily", pages: 250, webhooks: true, historyMonths: 24 },
};

/**
 * Billing opens when NEXT_PUBLIC_RANKFORGE_BILLING=open (public so server
 * and client render the same CTA). Until then Pro and Studio can only be
 * pre-ordered (/preorder): everyone is on Free.
 */
export const BILLING_OPEN = process.env.NEXT_PUBLIC_RANKFORGE_BILLING === "open";

/** The plan whose limits apply; legacy values map to free. */
export function effectivePlan(plan: string | null | undefined): Plan {
  return plan === "pro" || plan === "studio" ? plan : "free";
}

function ctaFor(plan: Plan): { cta: string; ctaHref: string } {
  if (plan === "free") return { cta: "Start free", ctaHref: "/signup" };
  // Signed-out visitors land on /login first, which brings them back here.
  const name = plan === "pro" ? "Pro" : "Studio";
  if (BILLING_OPEN) return { cta: `Get ${name}`, ctaHref: `/billing?plan=${plan}` };
  return { cta: `Pre-order ${name}`, ctaHref: `/preorder?plan=${plan}&source=pricing` };
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Everything that runs on your machine, plus one site watched every week.",
    ...ctaFor("free"),
    limits: PLAN_LIMITS.free,
    features: [
      "Unlimited audits from the CLI and your editor (MCP), up to 500 pages",
      "CI regression gate: a pull request that breaks SEO fails, preview vs production",
      "AI-search readiness, llms.txt generator and ready fix templates",
      "White-label HTML reports with your name and colour",
      "Monitoring: 1 site, checked weekly, email alerts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    tagline: "Septune watches your production sites and tells you when a deploy breaks SEO.",
    highlight: true,
    ...ctaFor("pro"),
    limits: PLAN_LIMITS.pro,
    features: [
      "Monitoring: 5 sites, checked daily, up to 100 pages each",
      "Alerts by email, Slack, Discord or webhook when something critical changes",
      "Watches noindex, robots.txt, canonicals, pages that start failing, redirects, the sitemap, the HTTPS certificate and Core Web Vitals",
      "12 months of check history and change log",
      "Everything in Free",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    priceMonthly: 49,
    tagline: "For freelancers and small agencies looking after client sites.",
    ...ctaFor("studio"),
    limits: PLAN_LIMITS.studio,
    features: [
      "Monitoring: 25 sites, checked daily, up to 250 pages each",
      "A separate alert address and webhook per site, yours or your client's",
      "24 months of check history",
      "Everything in Pro",
    ],
  },
];

/**
 * Planned, not built. Shown as such, never as a plan feature. Written in
 * mid-sentence case: both places that show it put it after a colon.
 */
export const ROADMAP = [
  "the live Google Search Console connection (the CLI already reads a Search Console export with --gsc)",
  "scheduled white-label reports emailed to your clients",
  "team seats",
];

export const BILLING_NOTE = BILLING_OPEN
  ? "Monthly plans in euros, paid by card through Stripe. Cancel anytime from the billing portal; your plan runs until the end of the month you paid for."
  : "Pro and Studio open soon. Pre-order one and we'll email you the day it does; nothing is charged before you check out. Free works today.";

/**
 * Page limits by place, for the table on /pricing. Values checked in code on
 * 2026-11-17: public audit = MAX_PAGES in app/api/public-audit/route.ts,
 * hosted app crawl = hardCap in lib/agents/crawl.ts (also the hosted MCP
 * ceiling in lib/mcp/tools.ts), CLI = 25 by default, 500 with --pages,
 * monitoring = PLAN_LIMITS above.
 */
export const LIMIT_TABLE: { where: string; limit: string; note: string }[] = [
  { where: "Free public audit on septune.dev", limit: "3 pages", note: "No signup. Instant, so the crawl stays short." },
  { where: "Audits in the app and the hosted MCP server", limit: "24 pages", note: "Per audit. Free account." },
  { where: "CLI, local MCP server and GitHub Action", limit: "up to 500 pages", note: "25 by default, raised with --pages. Runs on your machine or CI." },
  { where: "Monitoring, Free", limit: `${PLAN_LIMITS.free.pages} pages per check`, note: `${PLAN_LIMITS.free.sites} site, checked ${PLAN_LIMITS.free.frequency}.` },
  { where: "Monitoring, Pro", limit: `${PLAN_LIMITS.pro.pages} pages per check`, note: `${PLAN_LIMITS.pro.sites} sites, checked ${PLAN_LIMITS.pro.frequency}.` },
  { where: "Monitoring, Studio", limit: `${PLAN_LIMITS.studio.pages} pages per check`, note: `${PLAN_LIMITS.studio.sites} sites, checked ${PLAN_LIMITS.studio.frequency}.` },
];

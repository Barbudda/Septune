import { PRICING_TIERS } from "@/lib/pricing";

/**
 * Pages de comparaison /vs/<concurrent>. Règles : chaque affirmation sur un
 * concurrent vient d'une page de SON site, lue à la date indiquée dans
 * `sources` ; un point que ces pages ne disent pas s'écrit « not stated »,
 * jamais une supposition. Les « no » de Septune restent des « no ».
 *
 * Trous connus au 2026-11-17 (à relire avant de modifier une cellule) :
 * - Screaming Frog : la page de prix donne 245 EUR/an, le guide utilisateur
 *   écrit encore 199 GBP/an ; la page de prix liste les mêmes fonctions en
 *   gratuit et en payant alors que d'autres pages les réservent à la licence.
 *   Les deux écarts sont dits tels quels sur la page.
 * - Screaming Frog : le détail de la comparaison staging/prod (mappage d'URL)
 *   et des outils du serveur MCP n'a pas été lu ; la page le dit.
 * - SEO Radar : la page « seo-testing-staging » n'a pas été lue.
 * - Little Warden : fréquence des contrôles, historique, CI/CLI non indiqués
 *   sur les trois pages lues.
 *
 * Format texte : `code` et [lien](/chemin) en ligne, rien d'autre.
 */

export interface VsRow {
  feature: string;
  competitor: string;
  septune: string;
}

export interface VsPage {
  slug: "seo-radar" | "screaming-frog" | "little-warden";
  name: string;
  /** <title> avant le suffixe, 55 caractères au plus. */
  title: string;
  h1: string;
  /** Meta description, 155 caractères au plus. */
  description: string;
  /** La réponse directe sous le h1. */
  answer: string;
  /** Une ligne pour la page d'index. */
  teaser: string;
  forCompetitor: string[];
  forSeptune: string[];
  rows: VsRow[];
  different: string[];
  pickCompetitor: string[];
  caveats: string[];
  sources: { label: string; url: string; read: string }[];
  published: string;
  updated: string;
}

const READ = "2026-11-17";
const pro = PRICING_TIERS.find((t) => t.id === "pro")!;

const SEPTUNE_PRICE = `Free CLI, MCP server and GitHub Action. Hosted monitoring: Free (1 site, weekly), Pro €${pro.priceMonthly}/month`;

export const VS_PAGES: VsPage[] = [
  {
    slug: "seo-radar",
    name: "SEO Radar",
    title: "Septune vs SEO Radar: staging checks compared",
    h1: "Septune vs SEO Radar: two ways to catch SEO changes before they cost you traffic",
    description:
      "SEO Radar archives your HTML and alerts on changes; Septune checks every pull request and fails it. Features, prices and when to pick SEO Radar instead.",
    answer:
      "SEO Radar (seoradar.com) is a hosted change-monitoring service that snapshots your HTML and alerts your team, priced from $199 a month. Septune is an open-source engine that runs in your terminal, your editor and your pull requests, and compares the preview with production. Pick SEO Radar for archives and non-developer teams, Septune for a failing check in CI.",
    teaser: "A hosted HTML archive with alerts for SEO teams, against a free CLI that fails the pull request.",
    forCompetitor: [
      "SEO and product teams on large sites who want every change to the HTML archived and alerted, with several people changing the site (engineers, designers, content writers).",
      "Teams that need to see what a page looked like months ago: SEO Radar says it archives full HTML, server responses, alerts, screenshots and the DOM.",
      "Teams that want alerts by email, SMS or Slack with priorities and per-URL suppression.",
    ],
    forSeptune: [
      "Developers who want SEO checked where the code changes: in the terminal, in an AI editor through MCP, and in the pull request.",
      "Projects that need a free tier and an engine they can read: the CLI, GitHub Action and MCP server are MIT-licensed.",
      "Anyone who wants the build to fail when the preview would drop pages from search, rather than an alert after the fact.",
    ],
    rows: [
      { feature: "What it is", competitor: "Hosted change monitoring and SEO auditing service", septune: "Open-source CLI, MCP server, GitHub Action, plus hosted monitoring" },
      { feature: "Staging vs production", competitor: "Yes, on the Max plan ($999/month) per its pricing page", septune: "Yes, on every pull request (preview vs production); `septune diff` locally; free" },
      { feature: "Fails a pull request or CI job", competitor: "Not stated (CLI and CI/CD are not mentioned on the pages read)", septune: "Yes, `--fail-on` gate in the GitHub Action and the CLI" },
      { feature: "HTML snapshot history", competitor: "Yes: full HTML, responses, screenshots and DOM archived (3 to 12 months by plan)", septune: "No. Septune keeps check history (3 to 24 months by plan), not HTML snapshots" },
      { feature: "Screenshots", competitor: "Yes, mobile and desktop on Max", septune: "No" },
      { feature: "Monitoring frequency", competitor: "Audits per week by plan (1, 3 or unlimited); interval between checks not stated", septune: "Weekly on Free, daily on Pro and Studio; no deploy-triggered monitoring" },
      { feature: "Alert channels", competitor: "Email, SMS, Slack", septune: "Email, Slack, Discord, webhook" },
      { feature: "MCP server for AI editors", competitor: "Not stated", septune: "Yes, findings and fix templates inside Claude Code, Cursor, VS Code, Windsurf" },
      { feature: "AI crawler access diff", competitor: "Not stated", septune: "Yes: AI crawlers the preview blocks and production allows" },
      { feature: "Search Console", competitor: "Yes: extended archive of Search Console data (12 months on its enterprise version)", septune: "CLI `--gsc` reads a Search Console export and shows the clicks at stake per finding; no data archive" },
      { feature: "Google Analytics", competitor: "Not stated as a data connection (it monitors analytics tags on pages)", septune: "No" },
      { feature: "API", competitor: "Max plan", septune: "CLI `--json` output and an MCP server" },
      { feature: "Source code", competitor: "Not stated", septune: "MIT-licensed, deterministic engine, no model in the measurements" },
      { feature: "Price", competitor: "$199, $499 or $999 a month, 30-day free trial", septune: SEPTUNE_PRICE },
    ],
    different: [
      "Septune compares the preview with production on every pull request and fails the check, so a new `noindex` or a blocked robots.txt stops the merge. SEO Radar's pages describe on-demand staging tests and alerts instead.",
      "The engine is deterministic and open source. The CLI is free (up to 500 pages per audit), so a solo developer pays nothing to check every commit.",
      "Findings reach AI editors through MCP, so an assistant can run the audit, compare the local build with production and patch the repo.",
      "`septune diff` also lists the AI crawlers a preview blocks that production lets in, which matters when a staging robots.txt is copied to production.",
    ],
    pickCompetitor: [
      "You need months of archived HTML, DOM and screenshots to investigate what changed on a page.",
      "The people watching the site are SEO managers or QA, not developers, and they want alerts without touching a repository.",
      "You monitor competitors: SEO Radar's plans include 3 to 20 competitors.",
      "You need Search Console data kept beyond Google's 90 days.",
    ],
    caveats: [
      "Other products use similar names. This page covers seoradar.com.",
      "The seoradar.com footer reads 2025, and its overview mentions a 15-month archive while the pricing page says 12 months at most. We quote both pages and flag the gap.",
      "We have not tested SEO Radar. Everything above comes from its own pages on the date below.",
    ],
    sources: [
      { label: "SEO Radar, home page", url: "https://www.seoradar.com/", read: READ },
      { label: "SEO Radar, pricing", url: "https://www.seoradar.com/pricing", read: READ },
      { label: "SEO Radar, product overview", url: "https://www.seoradar.com/info/product-overview", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    slug: "screaming-frog",
    name: "Screaming Frog",
    title: "Screaming Frog alternative for CI: Septune compared",
    h1: "Screaming Frog alternative: when a CLI that fails the pull request is enough",
    description:
      "Screaming Frog SEO Spider is a desktop crawler; Septune is a CLI, MCP server and GitHub Action. Prices, features and when to keep using Screaming Frog.",
    answer:
      "Screaming Frog SEO Spider is a desktop crawler with a free 500-URL limit and a yearly paid licence, built for deep, manual site audits. Septune is a free command-line audit and pull request check that compares a preview with production. Keep Screaming Frog for large crawls and custom extraction; add Septune to stop regressions shipping.",
    teaser: "The desktop crawler for deep audits, against a CLI and GitHub Action for regressions on every pull request.",
    forCompetitor: [
      "SEO specialists and agencies auditing large sites by hand: crawl limits depend on your memory and storage, not on a plan.",
      "Anyone who needs JavaScript rendering with headless Chromium, custom extraction (CSS path, XPath, regex) or custom JavaScript during the crawl.",
      "Teams who want Google Analytics, Search Console and PageSpeed Insights data joined to every crawled URL, and crawls scheduled with exports to a folder or Google Sheets.",
    ],
    forSeptune: [
      "Developers who want a check that lives in the repository: `npx septune audit`, a GitHub Action and an MCP server, all free.",
      "Teams who want a failing pull request when the preview breaks SEO, rather than a crawl somebody remembers to run.",
      "Sites small enough that a 500-page audit covers them, and people who do not want to install a desktop application.",
    ],
    rows: [
      { feature: "What it is", competitor: "Desktop crawler for Windows, macOS and Linux", septune: "CLI (Node 18+), MCP server, GitHub Action, hosted monitoring" },
      { feature: "Free tier", competitor: "Crawls up to 500 URLs", septune: "CLI audits up to 500 pages, no signup; one site monitored weekly" },
      { feature: "Paid price", competitor: "€245 per licence per year on the pricing page (the user guide says £199); bands from 5 licences", septune: `Pro €${pro.priceMonthly}/month for hosted monitoring; the CLI stays free` },
      { feature: "Crawl size", competitor: "Unlimited with a licence, bounded by memory and storage", septune: "Up to 500 pages per CLI audit; 25 to 250 pages per monitored site" },
      { feature: "Staging vs production", competitor: "Yes: crawl comparison with URL mapping (mapping rules not read)", septune: "Yes: `septune diff` and the GitHub Action compare preview and production" },
      { feature: "Fails a CI job", competitor: "Not stated. It has a command-line mode and scheduling, no pass/fail gate on the pages read", septune: "Yes, `--fail-on critical`, exit code 1" },
      { feature: "Command line", competitor: "Yes, command-line automation", septune: "Yes" },
      { feature: "MCP server", competitor: "Yes, listed on its pricing page (tools not read)", septune: "Yes, with fix templates for the editor to apply" },
      { feature: "JavaScript rendering", competitor: "Yes, headless Chromium", septune: "`--render` compares raw HTML with the browser-rendered page (words, links, JSON-LD); not a full rendered crawl" },
      { feature: "Custom extraction", competitor: "Yes (CSS path, XPath, regex, custom JavaScript)", septune: "No" },
      { feature: "Search Console", competitor: "Yes, Search Analytics and URL Inspection APIs", septune: "CLI `--gsc` reads an export and shows clicks at stake per finding" },
      { feature: "Google Analytics", competitor: "Yes (GA4 not named on the pages read)", septune: "No" },
      { feature: "Alerts and monitoring", competitor: "Scheduled crawls with an email when a crawl completes; no change alerts described", septune: "Scheduled checks (weekly or daily) with email, Slack, Discord, webhook alerts" },
      { feature: "AI crawler access diff", competitor: "Not stated", septune: "Yes, preview vs production" },
      { feature: "Source code", competitor: "Proprietary", septune: "MIT, deterministic" },
    ],
    different: [
      "Septune is built for the moment code changes. The preview is compared with production, and a regression fails the check before the merge.",
      "It is free end to end for local use, with no licence renewal, and its engine is open source and deterministic.",
      "Findings come to the AI editor over MCP with the clicks at stake from your own Search Console export (`--gsc`), so fixes are ordered by traffic.",
      "It lists the AI crawlers a preview blocks that production allows.",
    ],
    pickCompetitor: [
      "You audit sites of tens of thousands of URLs or more.",
      "You need custom extraction, custom JavaScript, or a fully rendered crawl.",
      "You want Google Analytics or PageSpeed Insights data next to every URL.",
      "You are a consultant who works from a desktop and exports spreadsheets for clients.",
    ],
    caveats: [
      "Screaming Frog's own pages disagree on two points: the price (€245 on the pricing page, £199 in the user guide) and which features the free version includes (the pricing page lists them for both columns, other pages say some need a licence). Check the pricing page before you decide.",
      "We did not read its crawl comparison tutorial or its MCP server documentation, so we do not describe how URL mapping works or which tools the MCP server exposes.",
      "We have not benchmarked either tool. Septune does not crawl a site of 50,000 pages in a single audit.",
    ],
    sources: [
      { label: "Screaming Frog SEO Spider, pricing", url: "https://www.screamingfrog.co.uk/seo-spider/pricing/", read: READ },
      { label: "Screaming Frog SEO Spider, home page", url: "https://www.screamingfrog.co.uk/seo-spider/", read: READ },
      { label: "Screaming Frog SEO Spider, user guide: general (scheduling, licence)", url: "https://www.screamingfrog.co.uk/seo-spider/user-guide/general/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    slug: "little-warden",
    name: "Little Warden",
    title: "Septune vs Little Warden: monitoring compared",
    h1: "Septune vs Little Warden: agency change alerts or a developer's pull request check",
    description:
      "Little Warden watches client sites for 30+ changes with alerts; Septune checks every pull request and monitors production. Prices and when to pick each.",
    answer:
      "Little Warden is a hosted monitor for agencies: it runs a pre-launch checklist of 30+ checks on client URLs and alerts you when something changes, from £24.99 a month. Septune is a developer tool that fails a pull request when a preview breaks SEO and also monitors production. Pick Little Warden for client portfolios and DNS or domain checks.",
    teaser: "A hosted checklist monitor for agencies, against a developer tool that gates pull requests.",
    forCompetitor: [
      "Agencies and freelancers watching many client sites, with team access and the option to invite clients.",
      "Anyone who needs checks beyond SEO: domain and SSL expiry, nameserver, MX and IP changes, malware detection, tracking tag changes.",
      "People who want a monitor they set up in a browser, with no repository involved.",
    ],
    forSeptune: [
      "Developers who want the check in the pull request and the editor, not only an alert after a deploy.",
      "Teams who want a free CLI and an open-source, deterministic engine they can read.",
      "Sites where the risk is a code change: a new `noindex`, a robots.txt that blocks crawlers, canonicals that move.",
    ],
    rows: [
      { feature: "What it is", competitor: "Hosted monitoring of a list of URLs, aimed at agencies", septune: "Open-source CLI, MCP server, GitHub Action, plus hosted monitoring" },
      { feature: "Checks", competitor: "30+, including robots.txt, indexability, canonical, hreflang, sitemap, title, meta description, redirects, Core Web Vitals", septune: "69 rules over the crawled pages, plus robots.txt, sitemap, redirects, certificate and Core Web Vitals in monitoring" },
      { feature: "Domain, DNS, malware checks", competitor: "Yes: domain and SSL expiry, nameserver, MX, IP, malware", septune: "No. Septune watches the HTTPS certificate only" },
      { feature: "Tracking tag changes (GA, GTM)", competitor: "Yes", septune: "No" },
      { feature: "Custom monitors (text, element, API)", competitor: "Yes, a \"Monitor Anything\" wizard", septune: "No" },
      { feature: "Staging vs production", competitor: "Not stated", septune: "Yes, preview vs production on every pull request" },
      { feature: "Fails a pull request or CI job", competitor: "Not stated", septune: "Yes, `--fail-on` gate" },
      { feature: "MCP server", competitor: "Not stated", septune: "Yes" },
      { feature: "AI crawler access diff", competitor: "Not stated (robots.txt change monitoring only)", septune: "Yes, preview vs production" },
      { feature: "Monitoring frequency", competitor: "\"All day, every day\"; interval not stated", septune: "Weekly on Free, daily on Pro and Studio; not triggered by a deploy" },
      { feature: "Alert channels", competitor: "Slack, email, messenger, API, webhook", septune: "Email, Slack, Discord, webhook" },
      { feature: "History", competitor: "Data retention 2 weeks to 6 months by plan", septune: "Check history 3 to 24 months by plan; no HTML snapshots" },
      { feature: "Search Console / Google Analytics", competitor: "Not stated as data connections", septune: "CLI `--gsc` reads a Search Console export (clicks per finding); no Google Analytics" },
      { feature: "Team access", competitor: "Yes, clients can be invited", septune: "No team seats yet (planned); Studio has a separate alert address per site" },
      { feature: "Price", competitor: "£24.99 to £149.99 a month (20 to 5,000 URLs); 40-day free trial", septune: SEPTUNE_PRICE },
    ],
    different: [
      "Septune measures a change before it ships: the preview is compared with production in the pull request, and a regression fails the check.",
      "The measurements are deterministic and open source, the CLI is free, and the MCP server gives AI editors the findings and the fix templates.",
      "It reports AI crawler access (the crawlers a preview blocks and production allows) and, with a Search Console export, the clicks each finding puts at stake.",
    ],
    pickCompetitor: [
      "You look after many client sites and want a per-URL checklist with team and client access.",
      "You need domain expiry, DNS, malware or tracking tag monitoring.",
      "You want custom monitors for text, elements, prices or an API response.",
      "No developer on the team will touch a CI pipeline.",
    ],
    caveats: [
      "Little Warden shows its prices in pounds on the pricing page, with a currency switch. We quote the pound figures only.",
      "We did not read its individual check pages or its updates page. A point marked \"not stated\" means the three pages we read do not say it, not that the feature is absent.",
      "We have not tested Little Warden.",
    ],
    sources: [
      { label: "Little Warden, home page", url: "https://www.littlewarden.com/", read: READ },
      { label: "Little Warden, features", url: "https://www.littlewarden.com/features", read: READ },
      { label: "Little Warden, pricing", url: "https://www.littlewarden.com/pricing", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];

export const vsPath = (p: Pick<VsPage, "slug">) => `/vs/${p.slug}`;
export const getVs = (slug: string) => VS_PAGES.find((p) => p.slug === slug);

import { config } from "@/lib/config";
import { FRAMEWORK_PAGES } from "@/lib/seo/content";
import { BILLING_OPEN, PRICING_TIERS } from "@/lib/pricing";

/**
 * Septune's own /llms.txt (llmstxt.org): the product checks other sites
 * for one, so it ships one. Built from the same sources as the pages and the
 * sitemap, so it can't drift from them.
 */

export const dynamic = "force-static";

export function GET() {
  const u = (path: string) => `${config.appUrl}${path}`;
  const plans = PRICING_TIERS.map((t) => `${t.name} €${t.priceMonthly}/month`).join(", ");
  const lines = [
    "# Septune",
    "",
    "> Technical SEO checks for every deploy. Septune reads a site the way Googlebot does and checks it where SEO breaks: in the editor (open-source CLI and Claude Code plugin), on every pull request (a GitHub Action that compares the preview with production and comments the result) and in production (scheduled monitoring with alerts). Deterministic measurements, no ranking promises.",
    "",
    "## Product",
    "",
    `- [Home](${u("/")}): what Septune checks, at which checkpoint, and how fixes reach your code.`,
    `- [Pricing](${u("/pricing")}): ${plans}. ${BILLING_OPEN ? "Paid monthly through Stripe." : "Payments open soon: Pro and Studio can be pre-ordered."}`,
    `- [Free SEO audit](${u("/audit")}): audit a few pages of any public site, no signup.`,
    `- [Noindex checker](${u("/tools/noindex-checker")}): whether Google can index one URL, and what blocks it.`,
    `- [llms.txt generator](${u("/tools/llms-txt-generator")}): an llms.txt built from a site's real pages, and a check of the current one.`,
    "",
    "## Docs",
    "",
    `- [Docs](${u("/docs")}): every technical-SEO issue Septune detects and how to fix it.`,
    `- [Agent in your editor](${u("/docs/agent")}): the MCP server and the Claude Code plugin.`,
    ...FRAMEWORK_PAGES.map((f) => `- [Technical SEO for ${f.name}](${u(`/frameworks/${f.slug}`)}): ${f.metaApi}, sitemaps, robots.txt and canonicals.`),
    `- [Changelog](${u("/changelog")}): what changed, release by release.`,
    "",
    "## Open source",
    "",
    "- [septune on GitHub](https://github.com/Barbudda/rankforge-cli): the CLI, the GitHub Action, the MCP server and the Claude Code plugin, MIT-licensed.",
    "- [septune on npm](https://www.npmjs.com/package/septune): `npx septune audit <url>`.",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}

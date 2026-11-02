import { NextResponse } from "next/server";
import type { CategoryScore, Repository, SeoCategory } from "@/types";
import { scanSite } from "@/lib/agents/crawl";
import { runDeterministicAudit } from "@/lib/audit/engine";
import { probeResources } from "@/lib/audit/resource-probe";
import { FIXABLE_RULE_IDS } from "@/lib/audit/deterministic-fix";
import { computeOverallScore } from "@/lib/scoring";
import { runGeoAudit } from "@/lib/audit/geo";
import { CATEGORY_WEIGHTS } from "@/lib/seo/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * The free, no-signup audit behind /audit — Septune's lead magnet.
 *
 * Deliberately BOUNDED so a public endpoint can't become a cost or an abuse
 * vector: 3 pages max, a 15s crawl budget, tightly capped resource probing,
 * a per-IP limit, and the SSRF guard (active on every hosted deployment) so it
 * can only ever read public sites. The full crawl lives behind an account,
 * the CLI and the MCP agent.
 */

const MAX_PAGES = 3;
const CRAWL_DEADLINE_MS = 15_000;
const PER_IP_PER_HOUR = 6;
const MAX_CONCURRENT = 4;

// Best-effort limiter: per-instance memory (serverless instances don't share
// it, so this bounds burst abuse rather than being a hard global quota — the
// per-request caps above are the real cost control).
const hits = new Map<string, number[]>();
let inFlight = 0;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  if (recent.length >= PER_IP_PER_HOUR) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => t > windowStart)) hits.delete(k);
  }
  return false;
}

function parseUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 2048) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { url?: unknown; framework?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const url = parseUrl(body.url);
  if (!url) return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "That's a lot of audits for one hour. Run unlimited audits locally: npx septune audit <url>" },
      { status: 429 },
    );
  }
  if (inFlight >= MAX_CONCURRENT) {
    return NextResponse.json({ error: "Busy right now. Try again in a few seconds." }, { status: 503 });
  }

  inFlight++;
  const started = Date.now();
  try {
    const repo = {
      id: "public",
      framework: "nextjs",
      productionUrl: url,
      fullName: "public/site",
      defaultBranch: "main",
      score: 0,
    } as unknown as Repository;

    // robots.txt is honoured here: this endpoint audits other people's sites.
    const { pages, siteFiles } = await scanSite(url, {
      maxPages: MAX_PAGES,
      deadlineMs: CRAWL_DEADLINE_MS,
      light: true,
      concurrency: 3,
      sitemapSeeds: 0,
    });
    const resources = await probeResources(pages, url, {
      maxImages: 12,
      maxLinks: 16,
      concurrency: 6,
      timeoutMs: 4000,
    }).catch(() => undefined);

    const engine = runDeterministicAudit(repo, pages, siteFiles, resources);
    const geo = runGeoAudit(pages, siteFiles);

    const categoryScores: CategoryScore[] = (
      Object.entries(engine.categoryScores) as [SeoCategory, number][]
    ).map(([category, score]) => ({
      category,
      score,
      issues: engine.issues.filter((i) => i.category === category).length,
      weight: CATEGORY_WEIGHTS[category],
    }));
    const overall = computeOverallScore(categoryScores);

    const order = ["critical", "high", "medium", "low"];
    const issues = [...engine.issues]
      .sort(
        (a, b) =>
          order.indexOf(a.impact) - order.indexOf(b.impact) ||
          b.affectedUrls.length - a.affectedUrls.length,
      )
      .map((i) => ({
        ruleId: i.ruleId,
        category: i.category,
        impact: i.impact,
        title: i.title,
        evidence: i.evidence,
        affectedCount: i.affectedUrls.length,
        affectedUrls: i.affectedUrls.slice(0, 5).map((u) => u.url),
        fixTemplate: FIXABLE_RULE_IDS.includes(i.ruleId),
      }));

    const s = engine.siteSignals;
    return NextResponse.json({
      url: pages[0]?.url ?? url,
      pagesCrawled: pages.length,
      elapsedMs: Date.now() - started,
      overall,
      categoryScores: categoryScores.map(({ category, score }) => ({ category, score })),
      issues,
      signals: {
        orphanPages: s.orphanPages?.length ?? 0,
        maxDepth: s.maxDepth ?? 0,
        brokenInternalLinks: s.brokenInternalLinks?.length ?? 0,
        linkSuggestions: s.linkSuggestions?.length ?? 0,
      },
      geo: {
        score: geo.score,
        checks: geo.checks.map(({ id, title, status, detail }) => ({ id, title, status, detail })),
        blockedBots: geo.bots.filter((b) => !b.allowed).map((b) => ({ bot: b.bot, purpose: b.purpose })),
      },
      limited: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Audit failed.";
    // Surface the SSRF guard's own message (e.g. private host) — it's safe and
    // tells the user exactly why.
    const status = /not allowed|resolve/i.test(msg) ? 400 : 502;
    return NextResponse.json(
      { error: status === 400 ? msg : "Couldn't reach that site. Check the URL and try again." },
      { status },
    );
  } finally {
    inFlight--;
  }
}

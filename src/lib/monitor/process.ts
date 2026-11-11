import type { SupabaseClient } from "@supabase/supabase-js";
import type { Framework, Plan } from "@/types";
import { PLAN_LIMITS } from "@/lib/pricing";
import { isSnapshot, runSiteCheck } from "./check";
import { annotateDiff } from "@/lib/gsc/annotate";
import { fetchMonitorTraffic, recordMonitorTraffic } from "@/lib/gsc/monitor";
import { levelReached, sendEmail, sendWebhook, type AlertContent, type AlertLevel } from "./alerts";

/**
 * Run one monitor end to end: check the site, store the check, schedule the
 * next one, send alerts. Shared by the cron route (service-role client) and
 * the "Check now" action (the user's own RLS client), so both paths behave
 * identically.
 */

export interface MonitorRow {
  repo_id: string;
  user_id: string;
  enabled: boolean;
  frequency: "daily" | "weekly";
  alert_email: string | null;
  webhook_url: string | null;
  min_level: "critical" | "warning" | "info";
  last_check_at: string | null;
  last_level: string | null;
  last_snapshot: unknown;
}

export interface MonitoredSite {
  name: string;
  productionUrl: string;
  framework: Framework;
}

export interface ProcessResult {
  ok: boolean;
  level: AlertLevel;
  summary: string;
  alerted: boolean;
  error?: string;
}

const DAY = 86_400_000;

/**
 * Drop checks older than the plan's history window, so what the privacy
 * policy says about retention is what happens. Housekeeping only: a failed
 * delete never fails the check.
 */
async function pruneHistory(db: SupabaseClient, repoId: string, months: number, now: number) {
  const cutoff = new Date(now - months * 31 * DAY).toISOString();
  try {
    await db.from("monitor_checks").delete().eq("repo_id", repoId).lt("created_at", cutoff);
  } catch {
    // Next check retries.
  }
}

export async function processMonitor(
  db: SupabaseClient,
  monitor: MonitorRow,
  site: MonitoredSite,
  opts: { plan: Plan; trigger: "scheduled" | "manual"; appUrl: string; ownerEmail?: string | null },
): Promise<ProcessResult> {
  const limits = PLAN_LIMITS[opts.plan];
  // A plan limited to weekly checks never runs daily, whatever is stored.
  const frequency = limits.frequency === "weekly" ? "weekly" : monitor.frequency;
  const previous = isSnapshot(monitor.last_snapshot) ? monitor.last_snapshot : null;
  const link = `${opts.appUrl.replace(/\/$/, "")}/monitoring#${encodeURIComponent(monitor.repo_id)}`;
  const recipient = monitor.alert_email || opts.ownerEmail || null;
  const now = Date.now();

  const deliver = async (content: AlertContent, withWebhook: boolean) => {
    const sent = await Promise.all([
      recipient ? sendEmail(recipient, content) : Promise.resolve(false),
      withWebhook && limits.webhooks && monitor.webhook_url ? sendWebhook(monitor.webhook_url, content) : Promise.resolve(false),
    ]);
    return sent.some(Boolean);
  };

  try {
    const result = await runSiteCheck({
      url: site.productionUrl,
      framework: site.framework,
      maxPages: limits.pages,
      previous,
      deadlineMs: opts.trigger === "manual" ? 90_000 : 120_000,
    });
    // Search Console, when the owner connected it: clicks on each change, stored with the run.
    const traffic = await fetchMonitorTraffic(monitor.user_id, site.productionUrl);
    const diff = result.diff && traffic ? annotateDiff(result.diff, traffic.index) : result.diff;
    if (traffic) await recordMonitorTraffic(monitor.user_id, monitor.repo_id, traffic);
    const level: AlertLevel = diff ? diff.level : "none";
    const summary = diff
      ? diff.summary
      : `First check: score ${result.snapshot.overall}/100 on ${result.pages} pages${result.crawlComplete ? "" : " (stopped at the plan's page limit)"}.`;

    let alerted = false;
    if (!previous) {
      // Day-one value: the first check sends the state of the site.
      alerted = await deliver(
        {
          siteName: site.name,
          siteUrl: site.productionUrl,
          level,
          summary,
          changes: [],
          link,
          firstCheck: { overall: result.snapshot.overall, topIssues: result.topIssues },
        },
        false,
      );
    } else if (level !== "none" && levelReached(level, monitor.min_level)) {
      const changes = diff!.changes.filter((c) => levelReached(c.level, monitor.min_level));
      alerted = await deliver({ siteName: site.name, siteUrl: site.productionUrl, level, summary, changes, link }, true);
    }

    await db.from("monitor_checks").insert({
      user_id: monitor.user_id,
      repo_id: monitor.repo_id,
      trigger: opts.trigger,
      status: "ok",
      overall: result.snapshot.overall,
      geo_score: result.snapshot.geoScore,
      pages: result.pages,
      level,
      summary,
      changes: (diff?.changes ?? []).slice(0, 60),
      alerted,
    });
    await pruneHistory(db, monitor.repo_id, limits.historyMonths, now);
    await db
      .from("monitors")
      .update({
        last_check_at: new Date(now).toISOString(),
        next_check_at: new Date(now + (frequency === "daily" ? DAY : 7 * DAY)).toISOString(),
        last_level: level,
        last_summary: summary,
        last_snapshot: result.snapshot,
      })
      .eq("repo_id", monitor.repo_id);
    return { ok: true, level, summary, alerted };
  } catch (e) {
    const message = e instanceof Error ? e.message : "The check failed.";
    // Tell the owner once when a site stops answering, not on every retry.
    const alerted =
      monitor.last_level !== "error" && previous
        ? await deliver(
            { siteName: site.name, siteUrl: site.productionUrl, level: "critical", summary: message, changes: [], link, error: message },
            true,
          )
        : false;
    await db.from("monitor_checks").insert({
      user_id: monitor.user_id,
      repo_id: monitor.repo_id,
      trigger: opts.trigger,
      status: "error",
      level: "critical",
      summary: message,
      error: message.slice(0, 500),
      alerted,
    });
    await db
      .from("monitors")
      .update({
        last_check_at: new Date(now).toISOString(),
        // Retry sooner than the normal cadence.
        next_check_at: new Date(now + 6 * 3_600_000).toISOString(),
        last_level: "error",
        last_summary: message,
      })
      .eq("repo_id", monitor.repo_id);
    return { ok: false, level: "critical", summary: message, alerted, error: message };
  }
}

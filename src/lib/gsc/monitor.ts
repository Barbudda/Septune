import { createAdminClient } from "@/lib/supabase/admin";
import { gscConfigured, listSites, pickProperty, queryPages, refreshAccessToken, storableRows } from "./api";
import type { TrafficIndex } from "./export";

/**
 * Monitoring hook: when the owner connected Search Console, each check pulls
 * the last 28 days of clicks per page so the diff can say what a regression
 * puts at stake, and stores them with the run. Off (null, no query) when the
 * Google env vars, the service key or the connection are missing, and any
 * failure here leaves the check itself untouched.
 */

export interface MonitorTraffic {
  index: TrafficIndex;
  property: string;
  start: string;
  end: string;
}

export async function fetchMonitorTraffic(userId: string, productionUrl: string): Promise<MonitorTraffic | null> {
  if (!gscConfigured()) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  try {
    const { data } = await admin.from("gsc_connections").select("refresh_token").eq("user_id", userId).maybeSingle();
    if (!data?.refresh_token) return null;
    const token = await refreshAccessToken(data.refresh_token as string);
    const property = pickProperty(await listSites(token), productionUrl);
    if (!property) return null;
    const { index, start, end } = await queryPages(token, property);
    return { index, property, start, end };
  } catch {
    return null;
  }
}

export async function recordMonitorTraffic(userId: string, repoId: string, t: MonitorTraffic): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  try {
    await admin.from("gsc_page_stats").insert({
      user_id: userId,
      repo_id: repoId,
      property: t.property,
      period_start: t.start,
      period_end: t.end,
      pages: storableRows(t.index),
    });
  } catch {
    // The next check stores a fresh copy.
  }
}

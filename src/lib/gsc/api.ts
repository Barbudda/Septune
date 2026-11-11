import { parseGscPages, pathKey, type TrafficIndex } from "./export";

/**
 * Search Console API client (read-only). Everything is off until
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set: `gscConfigured()` is the
 * one switch the connect route and the monitoring hook check. `fetch` is
 * injectable so tests never touch the network.
 */

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://searchconsole.googleapis.com/webmasters/v3";

type Fetch = typeof fetch;

export function gscConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function gscRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/gsc/callback`;
}

/** The Google consent screen URL. offline + consent so Google returns a refresh token every time. */
export function gscAuthUrl(appUrl: string, state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: gscRedirectUri(appUrl),
    response_type: "code",
    scope: GSC_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${q}`;
}

async function tokenRequest(body: Record<string, string>, f: Fetch): Promise<{ access_token: string; refresh_token?: string }> {
  const res = await f(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", ...body }),
  });
  if (!res.ok) throw new Error(`Google refused the token request (HTTP ${res.status})`);
  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token) throw new Error("Google returned no access token");
  return { access_token: json.access_token, refresh_token: json.refresh_token };
}

export function exchangeCode(code: string, appUrl: string, f: Fetch = fetch) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: gscRedirectUri(appUrl) }, f);
}

export async function refreshAccessToken(refreshToken: string, f: Fetch = fetch): Promise<string> {
  return (await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }, f)).access_token;
}

export async function listSites(accessToken: string, f: Fetch = fetch): Promise<string[]> {
  const res = await f(`${API}/sites`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Search Console sites list failed (HTTP ${res.status})`);
  const json = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
  return (json.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => s.siteUrl);
}

/** The property that covers `url`: the domain property (sc-domain:) first, else a URL-prefix property on the same host, the exact prefix of the URL preferred. */
export function pickProperty(sites: string[], url: string): string | null {
  let host: string;
  let href: string;
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    href = u.href;
  } catch {
    return null;
  }
  const domain = sites.find((s) => s === `sc-domain:${host}`);
  if (domain) return domain;
  const sameHost = sites.filter((s) => {
    try {
      return /^https?:\/\//.test(s) && new URL(s).hostname.replace(/^www\./, "") === host;
    } catch {
      return false;
    }
  });
  return sameHost.find((s) => href.startsWith(s)) ?? sameHost[0] ?? null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The last `days` days ending 2 days ago: Search Console data lags by about two days. */
export function gscPeriod(days = 28, now = new Date()): { start: string; end: string } {
  const end = new Date(now.getTime() - 2 * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  return { start: iso(start), end: iso(end) };
}

const PAGE_SIZE = 5000;
const MAX_PAGES = 4;

/** searchanalytics.query by page for the last `days` days, as the same index a file export gives. */
export async function queryPages(
  accessToken: string,
  property: string,
  opts: { days?: number; now?: Date; fetch?: Fetch } = {},
): Promise<{ index: TrafficIndex; start: string; end: string }> {
  const f = opts.fetch ?? fetch;
  const { start, end } = gscPeriod(opts.days ?? 28, opts.now);
  const rows: { keys: string[]; clicks: number; impressions: number }[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await f(`${API}/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["page"], rowLimit: PAGE_SIZE, startRow: page * PAGE_SIZE }),
    });
    if (!res.ok) throw new Error(`Search Console query failed (HTTP ${res.status})`);
    const json = (await res.json()) as { rows?: typeof rows };
    rows.push(...(json.rows ?? []));
    if ((json.rows?.length ?? 0) < PAGE_SIZE) break;
  }
  // Reuse the export parser so both sources normalise URLs the same way.
  const csv = ["Top pages,Clicks,Impressions", ...rows.map((r) => `"${r.keys[0]!.replace(/"/g, '""')}",${Math.round(r.clicks)},${Math.round(r.impressions)}`)].join("\n");
  const index = rows.length
    ? parseGscPages(csv, `${start} to ${end}`)
    : { period: `${start} to ${end}`, byPath: new Map<string, { clicks: number; impressions: number }>() };
  return { index, start, end };
}

/** Rows to store with a check: the pages, most clicks first, capped. */
export function storableRows(index: TrafficIndex, limit = 500): { path: string; clicks: number; impressions: number }[] {
  return [...index.byPath.entries()]
    .map(([path, t]) => ({ path: pathKey(path), ...t }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

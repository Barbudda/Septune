import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { exchangeCode, gscConfigured } from "@/lib/gsc/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Google sends the user back here with a code; the refresh token is stored server-side only. */
export async function GET(request: Request) {
  if (!gscConfigured() || !isSupabaseConfigured) {
    return NextResponse.json({ error: "Search Console isn't set up on this server." }, { status: 404 });
  }
  const url = new URL(request.url);
  const done = (status: string) => {
    const res = NextResponse.redirect(new URL(`/settings?gsc=${status}`, request.url), { status: 303 });
    res.cookies.delete({ name: "gsc_state", path: "/api/gsc" });
    return res;
  };
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)gsc_state=([^;]+)/)?.[1];
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code || !cookie || cookie !== url.searchParams.get("state")) return done("denied");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (!data.user || !admin) return done("error");
  try {
    const tokens = await exchangeCode(code, config.appUrl);
    if (!tokens.refresh_token) return done("error");
    const { error } = await admin
      .from("gsc_connections")
      .upsert({ user_id: data.user.id, refresh_token: tokens.refresh_token, connected_at: new Date().toISOString() });
    return done(error ? "error" : "connected");
  } catch {
    return done("error");
  }
}

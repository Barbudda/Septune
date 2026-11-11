import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { gscAuthUrl, gscConfigured } from "@/lib/gsc/api";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Starts the Search Console connection: the signed-in user goes to Google's consent screen (read-only scope). */
export async function GET(request: Request) {
  if (!gscConfigured() || !isSupabaseConfigured) {
    return NextResponse.json({ error: "Search Console isn't set up on this server." }, { status: 404 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", request.url), { status: 303 });

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(gscAuthUrl(config.appUrl, state), { status: 303 });
  res.cookies.set("gsc_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/gsc", maxAge: 600 });
  return res;
}

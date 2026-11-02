import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Only the authenticated app surface + auth pages need session work.
     * Static marketing/SEO routes (/, /pricing, /docs, sitemap, robots…)
     * never invoke middleware, so their TTFB carries no Supabase RTT.
     */
    "/dashboard/:path*",
    "/repositories/:path*",
    "/audits/:path*",
    "/issues/:path*",
    "/pull-requests/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/monitoring/:path*",
    // Not /login nor /signup: static pages that need no session work. Through
    // the middleware they answered in 850-920 ms in production (Septune's
    // TTFB check, 2026-11-01); the auth callbacks still go through it.
    "/auth/:path*",
  ],
};

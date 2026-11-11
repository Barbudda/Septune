-- ─────────────────────────────────────────────────────────────────────
-- 0008 · Google Search Console: the connection and the clicks per page.
--
--   gsc_connections  one row per user: the OAuth refresh token (read-only
--                    scope webmasters.readonly). No policy at all on purpose:
--                    only the server (service-role key) reads or writes it,
--                    so the token never reaches the browser.
--   gsc_page_stats   clicks and impressions per page, stored with each
--                    monitoring check (last 28 days at that moment), so a
--                    finding can say how much traffic it puts at stake.
--
-- NOT RUN YET. Run it in the Supabase SQL editor after 0007, once
-- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set; running it again changes
-- nothing.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.gsc_connections (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  refresh_token  text not null,
  connected_at   timestamptz not null default now()
);

create table if not exists public.gsc_page_stats (
  id            text primary key default gen_random_uuid()::text,
  user_id       uuid not null references auth.users (id) on delete cascade,
  repo_id       text not null references public.repositories (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- The Search Console property the numbers come from, e.g. sc-domain:example.com
  property      text not null,
  period_start  date not null,
  period_end    date not null,
  -- [{ "path": "/pricing", "clicks": 1240, "impressions": 30500 }, ...]
  pages         jsonb not null default '[]'
);
create index if not exists gsc_page_stats_repo_idx on public.gsc_page_stats (repo_id, created_at desc);
create index if not exists gsc_page_stats_user_idx on public.gsc_page_stats (user_id);

alter table public.gsc_connections enable row level security;
alter table public.gsc_page_stats  enable row level security;

-- Users read and delete their stats, never write them (the monitoring does,
-- with the service key).
drop policy if exists "read own gsc stats" on public.gsc_page_stats;
create policy "read own gsc stats" on public.gsc_page_stats
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "delete own gsc stats" on public.gsc_page_stats;
create policy "delete own gsc stats" on public.gsc_page_stats
  for delete to authenticated
  using ((select auth.uid()) = user_id);

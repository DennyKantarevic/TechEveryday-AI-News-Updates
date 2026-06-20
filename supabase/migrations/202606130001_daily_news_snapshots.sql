create table if not exists public.daily_news_snapshots (
  id text primary key,
  daily_news jsonb not null default '{}'::jsonb,
  last_refresh jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists daily_news_snapshots_updated_at_idx
  on public.daily_news_snapshots(updated_at desc);

alter table public.daily_news_snapshots enable row level security;

drop policy if exists "Service role manages daily news snapshots"
  on public.daily_news_snapshots;
create policy "Service role manages daily news snapshots"
on public.daily_news_snapshots for all
to service_role
using (true)
with check (true);

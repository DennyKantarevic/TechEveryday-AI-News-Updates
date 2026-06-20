create table if not exists public.newsletter_snapshots (
  id text primary key,
  daily_news jsonb not null,
  last_refresh jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz,
  last_refresh_date_america_new_york text,
  candidates_found integer not null default 0,
  items_selected integer not null default 0,
  failed_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.refresh_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz,
  completed_at timestamptz,
  status text not null,
  trigger text,
  last_refresh_date_america_new_york text,
  candidates_found integer not null default 0,
  items_selected integer not null default 0,
  failed_sources jsonb not null default '[]'::jsonb,
  safe_error_message text,
  category_counts jsonb not null default '{}'::jsonb,
  debug jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint refresh_runs_status_check check (status in ('success', 'skipped', 'error', 'running')),
  constraint refresh_runs_trigger_check check (trigger in ('scheduled', 'manual', 'api') or trigger is null)
);

create index if not exists newsletter_snapshots_updated_at_idx
  on public.newsletter_snapshots(updated_at desc);

create index if not exists refresh_runs_created_at_idx
  on public.refresh_runs(created_at desc);

create index if not exists refresh_runs_status_created_idx
  on public.refresh_runs(status, created_at desc);

alter table public.newsletter_snapshots enable row level security;
alter table public.refresh_runs enable row level security;

drop policy if exists "Service role manages newsletter snapshots"
  on public.newsletter_snapshots;
create policy "Service role manages newsletter snapshots"
on public.newsletter_snapshots for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role manages refresh runs"
  on public.refresh_runs;
create policy "Service role manages refresh runs"
on public.refresh_runs for all
to service_role
using (true)
with check (true);

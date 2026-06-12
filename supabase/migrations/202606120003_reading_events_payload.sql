alter table public.reading_events
add column if not exists event_payload jsonb not null default '{}'::jsonb;

alter table public.saved_articles
add column if not exists article_payload jsonb not null default '{}'::jsonb;

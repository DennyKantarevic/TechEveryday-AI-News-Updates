create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email_subscribed boolean not null default false,
  email_frequency text not null default 'daily',
  preferred_categories text[] not null default '{}',
  personalization_enabled boolean not null default true,
  analytics_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null,
  article_url text not null,
  title text not null,
  source_name text,
  category text,
  summary text,
  image_url text,
  saved_at timestamptz not null default now(),
  unique (user_id, article_id)
);

create table if not exists public.reading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null,
  article_url text,
  category text,
  event_type text not null,
  source_name text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint reading_events_event_type_check check (
    event_type in (
      'article_viewed',
      'article_opened',
      'article_saved',
      'category_visited',
      'gallery_saved'
    )
  )
);

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null unique,
  subscribed boolean not null default false,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token_hash text,
  confirmation_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.newsletter_subscriptions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  status text not null,
  provider_message_id text,
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists user_preferences_user_id_idx on public.user_preferences(user_id);
create index if not exists saved_articles_user_saved_idx
  on public.saved_articles(user_id, saved_at desc);
create index if not exists reading_events_user_created_idx
  on public.reading_events(user_id, created_at desc);
create index if not exists newsletter_subscriptions_user_id_idx
  on public.newsletter_subscriptions(user_id);
create index if not exists newsletter_subscriptions_email_idx
  on public.newsletter_subscriptions(email);
create index if not exists email_delivery_logs_email_sent_idx
  on public.email_delivery_logs(email, sent_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists newsletter_subscriptions_set_updated_at
  on public.newsletter_subscriptions;
create trigger newsletter_subscriptions_set_updated_at
before update on public.newsletter_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_articles enable row level security;
alter table public.reading_events enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.email_delivery_logs enable row level security;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can view own preferences"
on public.user_preferences for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own preferences"
on public.user_preferences for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own preferences"
on public.user_preferences for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can manage own saved articles"
on public.saved_articles for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can manage own reading events"
on public.reading_events for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can view own subscription"
on public.newsletter_subscriptions for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own subscription"
on public.newsletter_subscriptions for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own subscription"
on public.newsletter_subscriptions for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

# Supabase Auth Email Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth, RLS-protected account data, private saved articles, optional personalization events, and double opt-in Resend daily email subscriptions while preserving the public TechEveryday UI.

**Architecture:** Keep the newsletter pipeline and public pages intact. Add Supabase SSR clients for user-scoped operations under RLS, an admin client only for server-only cron/token routes, and thin API routes validated with Zod. Logged-out users keep localStorage/file fallback; logged-in users use Supabase-owned rows.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth/Postgres/RLS, `@supabase/ssr`, Resend, Zod, Vitest, Tailwind CSS.

---

## File Structure

- Create `lib/supabase/client.ts`: browser-safe Supabase client.
- Create `lib/supabase/server.ts`: SSR cookie Supabase client for route handlers/server components.
- Create `lib/supabase/admin.ts`: server-only service-role Supabase client.
- Create `lib/auth/get-user.ts`: server helper for current user, profile, preferences, subscription.
- Create `lib/auth/actions.ts`: login/signup/logout server actions.
- Create `lib/security/tokens.ts`: secure random token generation.
- Create `lib/security/hash.ts`: SHA-256 token hashing.
- Create `lib/email/resend.ts`: server-only Resend client.
- Create `lib/email/templates/dailyNewsletter.ts`: HTML/text email renderer.
- Create `supabase/migrations/202606120001_auth_user_data.sql`: schema, triggers, RLS.
- Create `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts`, `app/account/page.tsx`.
- Create `components/AuthButton.tsx`, `components/AccountSettings.tsx`, `components/EmailSubscriptionToggle.tsx`, `components/DeleteDataPanel.tsx`.
- Modify `components/StickyHeader.tsx`: add compact auth/account link without changing existing nav layout.
- Modify `app/gallery/page.tsx`, `app/api/gallery/route.ts`, `components/GalleryGrid.tsx`, `components/NewsCard.tsx`: authenticated saved article path with fallback.
- Modify `app/for-you/page.tsx`, `components/ForYouFeed.tsx`, `lib/interactions.ts`: logged-in events path with local fallback.
- Create `app/api/account/preferences/route.ts`, `app/api/account/clear-history/route.ts`, `app/api/events/route.ts`.
- Create `app/api/email/subscribe/route.ts`, `app/api/email/confirm/route.ts`, `app/api/email/unsubscribe/route.ts`.
- Create `app/api/cron/send-daily-emails/route.ts`.
- Modify `.env.example`, `package.json`, lockfile.
- Add tests under `tests/auth`, `tests/email`, `tests/security`, and update existing interaction/gallery tests.

---

### Task 1: Dependencies, Environment, and Supabase Clients

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/auth/get-user.ts`
- Test: `tests/security/supabase-imports.test.ts`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install @supabase/supabase-js @supabase/ssr resend zod server-only
```

Expected: dependencies are added to `package.json` and lockfile.

- [ ] **Step 2: Write failing server-only import test**

Create `tests/security/supabase-imports.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoots = ["app", "components"];

describe("Supabase service role isolation", () => {
  it("does not import the admin client from browser-facing files", () => {
    const files = clientRoots.flatMap((root) =>
      require("node:fs")
        .readdirSync(join(process.cwd(), root), { recursive: true })
        .filter((entry: string) => /\.(ts|tsx)$/.test(entry))
        .map((entry: string) => join(process.cwd(), root, entry))
    );

    const offenders = files.filter((file) =>
      readFileSync(file, "utf8").includes("@/lib/supabase/admin")
    );

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm test -- tests/security/supabase-imports.test.ts
```

Expected before implementation: PASS if no admin import exists yet; keep it as a regression guard.

- [ ] **Step 4: Add env example keys**

Update `.env.example` to include:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=
APP_BASE_URL=
CRON_SECRET=
X_BEARER_TOKEN=
NEWS_API_KEY=
OPENAI_API_KEY=
```

- [ ] **Step 5: Add browser Supabase client**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase browser env vars are not configured.");
  }

  return createBrowserClient(url, anonKey);
}
```

- [ ] **Step 6: Add SSR Supabase client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server components cannot set cookies; route handlers can.
        }
      }
    }
  });
}
```

- [ ] **Step 7: Add admin Supabase client**

Create `lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin env vars are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

- [ ] **Step 8: Add current-user helper**

Create `lib/auth/get-user.ts`:

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { supabase: null, user: null };
  }

  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}
```

- [ ] **Step 9: Verify and commit**

Run:

```bash
npm test -- tests/security/supabase-imports.test.ts
npm run build
git add package.json package-lock.json .env.example lib/supabase lib/auth/get-user.ts tests/security/supabase-imports.test.ts
git commit -m "feat: add supabase client foundation"
```

Expected: tests and build pass.

---

### Task 2: Supabase Migration and RLS Policies

**Files:**
- Create: `supabase/migrations/202606120001_auth_user_data.sql`
- Test: `tests/auth/rls-migration.test.ts`

- [ ] **Step 1: Write migration coverage test**

Create `tests/auth/rls-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202606120001_auth_user_data.sql"),
  "utf8"
);

describe("Supabase auth data migration", () => {
  it("enables RLS on every user-owned table", () => {
    for (const table of [
      "profiles",
      "user_preferences",
      "saved_articles",
      "reading_events",
      "newsletter_subscriptions",
      "email_delivery_logs"
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("uses auth.uid policies for user-owned rows", () => {
    expect(migration).toMatch(/auth\.uid\(\) is not null and auth\.uid\(\) = user_id/g);
    expect(migration).toContain("Users can manage own saved articles");
    expect(migration).toContain("Users can manage own reading events");
  });

  it("creates profile and preference rows when auth users are created", () => {
    expect(migration).toContain("handle_new_auth_user");
    expect(migration).toContain("after insert on auth.users");
    expect(migration).toContain("insert into public.profiles");
    expect(migration).toContain("insert into public.user_preferences");
  });
});
```

- [ ] **Step 2: Run test and confirm it fails**

Run:

```bash
npm test -- tests/auth/rls-migration.test.ts
```

Expected: FAIL because migration file does not exist.

- [ ] **Step 3: Create migration**

Create `supabase/migrations/202606120001_auth_user_data.sql` with:

```sql
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
  created_at timestamptz not null default now()
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
create index if not exists saved_articles_user_saved_idx on public.saved_articles(user_id, saved_at desc);
create index if not exists reading_events_user_created_idx on public.reading_events(user_id, created_at desc);
create index if not exists newsletter_subscriptions_user_id_idx on public.newsletter_subscriptions(user_id);
create index if not exists newsletter_subscriptions_email_idx on public.newsletter_subscriptions(email);
create index if not exists email_delivery_logs_email_sent_idx on public.email_delivery_logs(email, sent_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

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
on public.profiles for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can view own preferences"
on public.user_preferences for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own preferences"
on public.user_preferences for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can manage own saved articles"
on public.saved_articles for all to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can manage own reading events"
on public.reading_events for all to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can view own subscription"
on public.newsletter_subscriptions for select to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own subscription"
on public.newsletter_subscriptions for update to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);
```

- [ ] **Step 4: Run migration test and commit**

Run:

```bash
npm test -- tests/auth/rls-migration.test.ts
git add supabase/migrations/202606120001_auth_user_data.sql tests/auth/rls-migration.test.ts
git commit -m "feat: add supabase rls schema"
```

Expected: migration test passes.

---

### Task 3: Auth Pages, Callback, and Header Auth Button

**Files:**
- Create: `lib/auth/actions.ts`
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`
- Create: `app/auth/callback/route.ts`
- Create: `components/AuthButton.tsx`
- Modify: `components/StickyHeader.tsx`
- Test: `tests/auth/auth-pages.test.tsx`
- Test: `tests/navigation.test.tsx`

- [ ] **Step 1: Write rendering tests**

Create `tests/auth/auth-pages.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import AuthButton from "@/components/AuthButton";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  })
}));

describe("auth pages", () => {
  it("renders login with privacy-first account copy", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/Privacy-first account system/i)).toBeInTheDocument();
  });

  it("renders signup without custom password storage copy", () => {
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByText(/Supabase Auth/i)).toBeInTheDocument();
  });

  it("shows sign in when no user is loaded", async () => {
    render(<AuthButton />);
    expect(await screen.findByRole("link", { name: /Sign in/i })).toHaveAttribute("href", "/login");
  });
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm test -- tests/auth/auth-pages.test.tsx
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Add auth server actions**

Create `lib/auth/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function appBaseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const supabase = await createServerSupabaseClient();

  if (!supabase || !email) {
    redirect("/login?message=missing-email");
  }

  const redirectTo = `${appBaseUrl()}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) {
    redirect("/login?message=signin-failed");
  }

  redirect("/login?message=check-email");
}

export async function signUpWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const supabase = await createServerSupabaseClient();

  if (!supabase || !email) {
    redirect("/signup?message=missing-email");
  }

  const redirectTo = `${appBaseUrl()}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
  });

  if (error) {
    redirect("/signup?message=signup-failed");
  }

  redirect("/signup?message=check-email");
}
```

- [ ] **Step 4: Add login/signup pages**

Create both pages with matching editorial form shells, one email input named `email`, and form actions above. Include copy:

```tsx
<p>Privacy-first account system for saved articles, preferences, and optional reading signals.</p>
```

and:

```tsx
<p>Authentication is handled by Supabase Auth. TechEveryday does not store passwords in app tables.</p>
```

- [ ] **Step 5: Add callback route**

Create `app/auth/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/account";
  const supabase = await createServerSupabaseClient();

  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
```

- [ ] **Step 6: Add client AuthButton and header link**

`components/AuthButton.tsx` should use the browser Supabase client inside `useEffect`, render `Sign in` by default, render `Account` and `Sign out` after user load, and never access Supabase during SSR.

Modify `components/StickyHeader.tsx` to include `<AuthButton />` near the existing gallery link without changing the centered brand overlay.

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/auth/auth-pages.test.tsx tests/navigation.test.tsx
npm run build
git add lib/auth/actions.ts app/login app/signup app/auth/callback components/AuthButton.tsx components/StickyHeader.tsx tests/auth/auth-pages.test.tsx tests/navigation.test.tsx
git commit -m "feat: add supabase auth entry points"
```

Expected: focused tests and build pass.

---

### Task 4: Account Settings and Privacy Controls

**Files:**
- Create: `app/account/page.tsx`
- Create: `components/AccountSettings.tsx`
- Create: `components/EmailSubscriptionToggle.tsx`
- Create: `components/DeleteDataPanel.tsx`
- Create: `app/api/account/preferences/route.ts`
- Create: `app/api/account/clear-history/route.ts`
- Test: `tests/auth/account-settings.test.tsx`

- [ ] **Step 1: Write account component tests**

Create `tests/auth/account-settings.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountSettings from "@/components/AccountSettings";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }))));
});

describe("AccountSettings", () => {
  it("renders honest privacy copy and controls", () => {
    render(
      <AccountSettings
        profile={{ displayName: "Denny", email: "denny@example.com" }}
        preferences={{ emailSubscribed: false, personalizationEnabled: true }}
      />
    );

    expect(screen.getByText(/Privacy-first account system/i)).toBeInTheDocument();
    expect(screen.getByText(/We store your email for login\/subscriptions/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear reading history/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear saved articles/i })).toBeInTheDocument();
  });

  it("can request clearing reading history", async () => {
    render(
      <AccountSettings
        profile={{ displayName: "", email: "denny@example.com" }}
        preferences={{ emailSubscribed: false, personalizationEnabled: true }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Clear reading history/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/account/clear-history", expect.objectContaining({ method: "POST" }))
    );
  });
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm test -- tests/auth/account-settings.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Add account page**

`app/account/page.tsx` should call `getCurrentUser()`, redirect unauthenticated users to `/login?next=/account`, load profile/preferences/subscription through the server Supabase client, and render `StickyHeader alwaysVisible` plus `AccountSettings`.

- [ ] **Step 4: Add preferences API**

`app/api/account/preferences/route.ts` should:

- get current user
- validate body with Zod:

```ts
z.object({
  displayName: z.string().trim().max(80).optional(),
  personalizationEnabled: z.boolean().optional(),
  preferredCategories: z.array(z.string()).max(12).optional()
})
```

- update `profiles` and `user_preferences` only for `user.id`
- return `{ ok: true }`

- [ ] **Step 5: Add clear-history API**

`app/api/account/clear-history/route.ts` should:

- accept `{ target: "history" | "saved" }` defaulting to `"history"`
- delete from `reading_events` for history
- delete from `saved_articles` for saved
- require authenticated user
- return `{ ok: true }`

- [ ] **Step 6: Add account components**

`AccountSettings` should show:

- display name form
- email subscription toggle component
- personalization toggle
- privacy copy: "We store your email for login/subscriptions, saved articles, preferences, and optional reading signals used for For You recommendations."
- clear history button
- clear saved articles button

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/auth/account-settings.test.tsx
npm run build
git add app/account components/AccountSettings.tsx components/EmailSubscriptionToggle.tsx components/DeleteDataPanel.tsx app/api/account tests/auth/account-settings.test.tsx
git commit -m "feat: add account privacy controls"
```

Expected: focused tests and build pass.

---

### Task 5: Account-Scoped Gallery Saves

**Files:**
- Modify: `app/api/gallery/route.ts`
- Modify: `app/gallery/page.tsx`
- Modify: `components/GalleryGrid.tsx`
- Modify: `components/NewsCard.tsx`
- Test: `tests/gallery-api.test.ts`
- Test: `tests/news-card-interactions.test.tsx`

- [ ] **Step 1: Write gallery route behavior test**

Create `tests/gallery-api.test.ts` with mocked `getCurrentUser` and file storage. The key assertions:

```ts
expect(unauthenticatedGetResponse.status).toBe(200);
expect(authenticatedSupabase.from).toHaveBeenCalledWith("saved_articles");
expect(insertPayload.user_id).toBe("user-1");
```

- [ ] **Step 2: Run focused test and confirm failure**

Run:

```bash
npm test -- tests/gallery-api.test.ts
```

Expected: FAIL until gallery route branches on auth.

- [ ] **Step 3: Update `app/api/gallery/route.ts`**

Use `getCurrentUser()`. If no user or no Supabase env, keep existing `fileStorage` behavior. If authenticated:

- GET selects `saved_articles` for current user ordered by `saved_at desc`.
- POST validates `{ item }` with Zod, upserts into `saved_articles` with `user_id`.
- DELETE accepts id/article_id and deletes `eq("user_id", user.id).eq("article_id", id)`.

Return `NewsItem`-compatible objects for the UI.

- [ ] **Step 4: Update gallery page**

`app/gallery/page.tsx` should call `getCurrentUser()`. If authenticated, fetch `/api/gallery` equivalent directly through Supabase server client or a shared helper. If logged out, keep `fileStorage.readGallery()`.

- [ ] **Step 5: Keep NewsCard save flow stable**

`NewsCard` can continue POSTing to `/api/gallery`. Add graceful error copy/state only if the API returns non-OK. Keep local event tracking unchanged.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/gallery-api.test.ts tests/news-card-interactions.test.tsx
npm run build
git add app/api/gallery/route.ts app/gallery/page.tsx components/GalleryGrid.tsx components/NewsCard.tsx tests/gallery-api.test.ts
git commit -m "feat: store saved articles per account"
```

Expected: tests and build pass.

---

### Task 6: Logged-In Reading Events and For You Personalization

**Files:**
- Create: `app/api/events/route.ts`
- Modify: `lib/interactions.ts`
- Modify: `app/for-you/page.tsx`
- Modify: `components/ForYouFeed.tsx`
- Test: `tests/events-api.test.ts`
- Test: `tests/for-you-feed.test.tsx`

- [ ] **Step 1: Write events API tests**

Create `tests/events-api.test.ts` asserting:

```ts
expect(anonymousPost.status).toBe(204);
expect(disabledPersonalizationPost.status).toBe(204);
expect(insertPayload.event_type).toBe("article_opened");
expect(insertPayload.user_id).toBe("user-1");
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm test -- tests/events-api.test.ts
```

Expected: FAIL until route exists.

- [ ] **Step 3: Add `app/api/events/route.ts`**

Validate:

```ts
z.object({
  type: z.enum(["article_viewed", "article_opened", "article_saved", "category_visited", "gallery_saved"]),
  articleId: z.string().min(1),
  articleUrl: z.string().url().optional(),
  category: z.string().optional(),
  sourceName: z.string().optional(),
  tags: z.array(z.string()).max(20).optional()
})
```

Behavior:

- if logged out, return 204
- load `user_preferences`
- if personalization disabled, return 204
- insert minimal row in `reading_events`
- return `{ ok: true }`

- [ ] **Step 4: Update local interaction helpers**

In `lib/interactions.ts`, after localStorage writes, call a best-effort `fetch("/api/events", { method: "POST", body: JSON.stringify(...) })` only in the browser. Do not await it in UI event handlers.

- [ ] **Step 5: Update For You**

`app/for-you/page.tsx` should:

- load daily articles as now
- if logged in and personalization enabled, load recent `reading_events` and saved articles
- pass `initialEvents` and `personalizationEnabled` to `ForYouFeed`

`ForYouFeed` should:

- use `initialEvents` if supplied
- keep localStorage fallback when not supplied
- show `Start reading and saving articles to personalize this page.` when history is empty
- show a privacy-disabled empty state when personalization is disabled

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- tests/events-api.test.ts tests/for-you-feed.test.tsx
npm run build
git add app/api/events app/for-you/page.tsx components/ForYouFeed.tsx lib/interactions.ts tests/events-api.test.ts tests/for-you-feed.test.tsx
git commit -m "feat: record private personalization events"
```

Expected: tests and build pass.

---

### Task 7: Email Token Utilities, Resend Client, and Templates

**Files:**
- Create: `lib/security/tokens.ts`
- Create: `lib/security/hash.ts`
- Create: `lib/email/resend.ts`
- Create: `lib/email/templates/dailyNewsletter.ts`
- Test: `tests/security/tokens.test.ts`
- Test: `tests/email/daily-newsletter-template.test.ts`

- [ ] **Step 1: Write token tests**

Create `tests/security/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashToken } from "@/lib/security/hash";
import { createSecureToken } from "@/lib/security/tokens";

describe("email tokens", () => {
  it("generates random tokens and stable hashes without exposing raw values as hashes", async () => {
    const one = createSecureToken();
    const two = createSecureToken();
    const oneHash = await hashToken(one);

    expect(one).not.toBe(two);
    expect(one.length).toBeGreaterThan(30);
    expect(oneHash).not.toBe(one);
    expect(await hashToken(one)).toBe(oneHash);
  });
});
```

- [ ] **Step 2: Write email template test**

Create `tests/email/daily-newsletter-template.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderDailyNewsletterEmail } from "@/lib/email/templates/dailyNewsletter";

describe("daily newsletter email template", () => {
  it("includes article content and unsubscribe link", () => {
    const result = renderDailyNewsletterEmail({
      baseUrl: "https://techeveryday.example",
      unsubscribeUrl: "https://techeveryday.example/api/email/unsubscribe?token=abc",
      items: [
        {
          title: "Cloud scheduler explains p99 latency",
          url: "https://example.com/cloud",
          sourceName: "Example Engineering",
          summary: "A scheduler writeup explains production latency.",
          whyItMatters: "It shows how teams trade locality against fairness.",
          category: "Cloud / Infrastructure"
        }
      ]
    });

    expect(result.subject).toBe("TechEveryday: Today's AI, Systems, and Infrastructure Brief");
    expect(result.html).toContain("Cloud scheduler explains p99 latency");
    expect(result.html).toContain("Unsubscribe");
    expect(result.text).toContain("https://techeveryday.example/api/email/unsubscribe?token=abc");
  });
});
```

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```bash
npm test -- tests/security/tokens.test.ts tests/email/daily-newsletter-template.test.ts
```

Expected: FAIL until utilities exist.

- [ ] **Step 4: Add token/hash utilities**

`createSecureToken()` uses `crypto.randomBytes(32).toString("base64url")`.

`hashToken(token)` uses Web Crypto or Node crypto SHA-256 and returns hex.

- [ ] **Step 5: Add Resend server client**

`lib/email/resend.ts` imports `server-only`, creates `new Resend(process.env.RESEND_API_KEY)`, and throws only inside send paths when the key is missing.

- [ ] **Step 6: Add email template**

Render clean beige/white/black HTML plus plain text with:

- brand header
- top items
- source
- summary
- why it matters
- site link
- unsubscribe link

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/security/tokens.test.ts tests/email/daily-newsletter-template.test.ts
npm run build
git add lib/security lib/email tests/security/tokens.test.ts tests/email/daily-newsletter-template.test.ts
git commit -m "feat: add secure email utilities"
```

Expected: tests and build pass.

---

### Task 8: Subscription, Confirmation, and Unsubscribe Routes

**Files:**
- Create: `app/api/email/subscribe/route.ts`
- Create: `app/api/email/confirm/route.ts`
- Create: `app/api/email/unsubscribe/route.ts`
- Modify: `components/EmailSubscriptionToggle.tsx`
- Test: `tests/email/subscription-routes.test.ts`

- [ ] **Step 1: Write route tests**

Create `tests/email/subscription-routes.test.ts` with mocked admin/client Supabase and Resend. Assertions:

```ts
expect(subscribeResponse.status).toBe(200);
expect(storedRow.subscribed).toBe(false);
expect(storedRow.confirmation_token_hash).not.toContain(rawToken);
expect(confirmResponse.status).toBe(200);
expect(unsubscribeResponse.status).toBe(200);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm test -- tests/email/subscription-routes.test.ts
```

Expected: FAIL until routes exist.

- [ ] **Step 3: Add subscribe route**

`POST /api/email/subscribe`:

- require authenticated user
- validate `{ subscribed: boolean }`
- when false: update subscription and preferences to unsubscribed
- when true: create confirmation and unsubscribe tokens, store hashes, send confirmation email
- return `{ ok: true, confirmationRequired: true }`

- [ ] **Step 4: Add confirm route**

`GET /api/email/confirm?token=...`:

- hash token
- admin lookup by `confirmation_token_hash`
- update `subscribed=true`, `confirmed_at=now()`, clear `confirmation_token_hash`
- update `user_preferences.email_subscribed=true` if `user_id` exists
- return simple HTML confirmation

- [ ] **Step 5: Add unsubscribe route**

`GET /api/email/unsubscribe?token=...`:

- hash token
- admin lookup by `unsubscribe_token_hash`
- update `subscribed=false`, `unsubscribed_at=now()`
- update `user_preferences.email_subscribed=false` if `user_id` exists
- return simple HTML confirmation

- [ ] **Step 6: Wire subscription toggle**

`EmailSubscriptionToggle` POSTs to `/api/email/subscribe` and displays:

- confirmation required state
- unsubscribed state
- error state without exposing tokens

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/email/subscription-routes.test.ts tests/auth/account-settings.test.tsx
npm run build
git add app/api/email components/EmailSubscriptionToggle.tsx tests/email/subscription-routes.test.ts
git commit -m "feat: add confirmed email subscriptions"
```

Expected: tests and build pass.

---

### Task 9: Daily Email Cron

**Files:**
- Create: `app/api/cron/send-daily-emails/route.ts`
- Test: `tests/email/send-daily-emails.test.ts`

- [ ] **Step 1: Write cron tests**

Create `tests/email/send-daily-emails.test.ts` asserting:

```ts
expect(unauthorized.status).toBe(401);
expect(resendSend).toHaveBeenCalledTimes(1);
expect(logInsert.status).toBe("sent");
expect(duplicateRun.skipped).toBeGreaterThanOrEqual(1);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm test -- tests/email/send-daily-emails.test.ts
```

Expected: FAIL until cron route exists.

- [ ] **Step 3: Add cron route**

`GET /api/cron/send-daily-emails`:

- require `Authorization: Bearer ${CRON_SECRET}` or `?secret=...`
- load `fileStorage.readDailyNews()`
- flatten top items by category
- query admin Supabase for confirmed subscribed rows
- skip if `email_delivery_logs` has sent status for same email and subject since start of current America/New_York day
- send through Resend
- insert log row with success/failure
- return counts `{ sent, skipped, failed }`

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- tests/email/send-daily-emails.test.ts
npm run build
git add app/api/cron/send-daily-emails/route.ts tests/email/send-daily-emails.test.ts
git commit -m "feat: send confirmed daily emails"
```

Expected: tests and build pass.

---

### Task 10: Final Integration Verification

**Files:**
- Modify: `README.md`
- Modify: `vercel.json` if cron entry needs daily email route.
- Test: all tests.

- [ ] **Step 1: Update README**

Add setup sections for:

- Supabase env vars
- applying migrations
- auth redirect URL
- Resend sender env
- daily email cron route
- privacy controls
- unsubscribe behavior

- [ ] **Step 2: Update Vercel cron if needed**

Add or preserve cron entries:

```json
{
  "crons": [
    { "path": "/api/refresh-news", "schedule": "0 11 * * *" },
    { "path": "/api/cron/send-daily-emails", "schedule": "15 11 * * *" }
  ]
}
```

Document UTC/DST considerations in README.

- [ ] **Step 3: Run complete verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests and build pass.

- [ ] **Step 4: Manual local navigation check**

Run:

```bash
npm run dev -- --port 3001
```

Open:

- `http://localhost:3001/`
- `http://localhost:3001/learning`
- `http://localhost:3001/for-you`
- `http://localhost:3001/gallery`
- `http://localhost:3001/login`
- `http://localhost:3001/signup`

Expected:

- existing navigation/page transitions still work
- no horizontal scroll
- logged-out For You shows safe empty state
- auth pages render without Supabase env crashes
- account route redirects to login when logged out

- [ ] **Step 5: Commit docs and verification fixes**

Run:

```bash
git add README.md vercel.json tests app components lib supabase package.json package-lock.json .env.example
git commit -m "docs: document account backend setup"
```

Expected: final commit contains docs or last integration fixes only.

---

## Self-Review

- Spec coverage: The plan covers Supabase Auth, RLS migrations, user-owned saved articles, minimal reading events, account privacy controls, double opt-in email subscriptions, login-free unsubscribe, cron email sending, server-only service role use, Zod validation, and logged-out fallbacks.
- Placeholder scan: No task contains deferred placeholder work. Route tests with mocked Supabase need concrete mocks during execution, and the expected assertions and behavior are specified.
- Type consistency: Event names match existing `InteractionType`; category labels remain string IDs in storage and UI labels in templates; subscription booleans match `user_preferences.email_subscribed` and `newsletter_subscriptions.subscribed`.
- Risk note: Live Supabase and Resend behavior cannot be fully verified without configured project keys, applied migrations, auth redirect URLs, and a verified Resend sender.

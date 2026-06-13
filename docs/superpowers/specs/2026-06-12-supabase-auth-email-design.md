# TechEveryday Supabase Auth, User Data, and Email Design

## Context

TechEveryday is currently a public Next.js App Router application with local JSON storage for the daily feed and gallery plus browser-local interaction tracking for For You recommendations. The next backend layer needs to add secure accounts, account-owned saved articles, optional personalization, and opt-in daily email delivery without breaking public browsing, existing route transitions, the newsletter refresh pipeline, or logged-out For You behavior.

This design follows the current Supabase guidance for Next.js SSR session cookies and Postgres Row Level Security. Supabase Auth remains responsible for authentication and password handling. Application tables store only user profile metadata, preferences, saved article records, minimal personalization events, newsletter subscription state, and email delivery logs. Resend is used only from server-side code.

## Goals

- Support secure account creation, sign-in, sign-out, and protected account settings.
- Keep public newsletter, Learning, For You, and Gallery pages available without login unless account data is needed.
- Store logged-in saved articles and personalization data in Supabase Postgres.
- Enforce user data isolation with RLS and `auth.uid()` policies.
- Keep logged-out saved/recommendation behavior working with existing local mechanisms.
- Add privacy controls for email subscription, personalization, clearing reading history, and deleting saved articles.
- Add double opt-in daily email subscriptions through Resend.
- Add login-free unsubscribe links backed by hashed tokens.
- Keep the service role key server-only and never import it into client components.
- Preserve the existing beige/white/black UI, page transitions, newsletter intro, and no-horizontal-scroll behavior.

## Non-Goals

- Building custom password hashing or custom session storage.
- Replacing Supabase Auth with an application-owned password system.
- Exposing subscriber lists, service-role operations, or private user rows to browser bundles.
- Tracking raw scroll behavior, invasive analytics, device fingerprinting, or detailed behavioral telemetry.
- Replacing the current daily research pipeline or changing source-selection behavior beyond email consumption of the generated snapshot.

## Architecture

Use a hybrid account layer:

1. Public users keep current access to the newsletter, Learning, For You, and Gallery UI.
2. Logged-out personalization continues to use localStorage-based interaction events.
3. Logged-in users use Supabase-backed `saved_articles` and `reading_events`.
4. API routes detect the current Supabase session through server-side cookie helpers.
5. Account settings are protected on the server and redirect unauthenticated visitors to `/login`.
6. Email subscription and cron delivery use server-only Supabase admin access plus Resend.
7. Confirmation and unsubscribe flows store only token hashes, never raw tokens.

## Dependencies

Add:

- `@supabase/supabase-js`
- `@supabase/ssr`
- `resend`
- `zod`
- `server-only` if needed for explicit server import guards

## Environment

Update `.env.example` to include:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=TechEveryday <updates@techeveryday.org>
APP_BASE_URL=https://tech-everyday-ai-news-updates.vercel.app
CRON_SECRET=
```

Preserve existing feed-related keys where present:

```env
X_BEARER_TOKEN=
NEWS_API_KEY=
OPENAI_API_KEY=
```

The browser client only receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The service role key is imported only from server-only modules.

## Supabase Clients

Add:

- `lib/supabase/client.ts`
  - Browser client using `createBrowserClient`.
  - Used by client auth UI and browser-side sign-out.

- `lib/supabase/server.ts`
  - Server cookie client using `createServerClient`.
  - Used in server components and route handlers to read the current user under RLS.

- `lib/supabase/admin.ts`
  - Server-only service role client.
  - Used only for cron, token confirmation/unsubscribe, email delivery logging, and safe server-side maintenance.

- `lib/auth/get-user.ts`
  - Server helper returning current user plus optional profile/preferences.

## Database Schema

Create `supabase/migrations/*.sql` containing the requested tables:

- `profiles`
- `user_preferences`
- `saved_articles`
- `reading_events`
- `newsletter_subscriptions`
- `email_delivery_logs`

Add helpful indexes:

- `profiles(user_id)`
- `user_preferences(user_id)`
- `saved_articles(user_id, saved_at desc)`
- `reading_events(user_id, created_at desc)`
- `newsletter_subscriptions(email)`
- `newsletter_subscriptions(user_id)`
- `email_delivery_logs(email, sent_at desc)`

Add an `updated_at` trigger function for profile, preferences, and subscription updates.

Add a trigger on `auth.users` insert to create:

- a minimal profile row with `user_id` and email
- a default preferences row

This keeps signup/callback behavior robust even if the application route is interrupted after auth confirmation.

## Row Level Security

Enable RLS on every public user-data table:

- `profiles`
- `user_preferences`
- `saved_articles`
- `reading_events`
- `newsletter_subscriptions`
- `email_delivery_logs`

Policies:

- Authenticated users can select/update their own `profiles`.
- Authenticated users can select/update their own `user_preferences`.
- Authenticated users can manage their own `saved_articles`.
- Authenticated users can manage their own `reading_events`.
- Authenticated users can select/update their own `newsletter_subscriptions`.
- `email_delivery_logs` should not be exposed in the first UI. Keep RLS enabled and omit browser-facing policies unless an account delivery-history view is intentionally added later.

Use `auth.uid() is not null and auth.uid() = user_id` for user-owned rows.

Anonymous users do not receive policies for private user data. Service role operations stay server-side and bypass RLS only in trusted routes. Email delivery logs are written by server-side jobs and are not returned to browser clients.

## Auth UX

Create:

- `/login`
- `/signup`
- `/auth/callback`
- `/account`

Login/signup support email magic-link first. Password fields can be omitted initially or added only if Supabase project settings allow email/password auth. OAuth can be added later without changing the data model.

Header updates:

- Logged out: show a compact `Sign in` link.
- Logged in: show an `Account` link and sign-out action.
- Keep the current navigation layout uncluttered.

Account page:

- Server-protected page.
- Shows privacy-first copy:
  - "Privacy-first account system"
  - "Your saved articles and preferences are private to your account"
  - "You can clear reading history or unsubscribe anytime"
- Avoids claiming complete privacy.

## Saved Articles

Logged out:

- Preserve current behavior.

Logged in:

- `POST /api/gallery` inserts or upserts into `saved_articles` for the current user.
- `GET /api/gallery` returns only current user's saved articles through RLS.
- `DELETE /api/gallery` removes only the current user's row.
- The gallery page loads account-specific saved articles when authenticated and falls back to existing storage when logged out.

Optional migration:

- After login, a client-side prompt can offer to merge local saved articles into the account.
- Safe merge means unique by `article_id` and user-owned upsert.

## Personalization

Logged out:

- Continue localStorage-based For You recommendations.

Logged in:

- `POST /api/events` stores only minimal events when personalization is enabled:
  - `article_viewed`
  - `article_opened`
  - `article_saved`
  - `category_visited`
  - `gallery_saved`
- Store article id, URL, category, source, tags, and timestamp.
- Do not store raw scroll events, full browsing paths, device identifiers, or unrelated analytics.
- If personalization is disabled, the route performs no insert and returns a safe response.

For You:

- If logged in and personalization is enabled, use server-loaded `reading_events` plus `saved_articles`.
- If logged in and personalization is disabled, show a privacy-respecting empty state.
- If logged out, keep current localStorage behavior.
- Empty history never crashes the page.

## Account Settings

Add components:

- `components/AccountSettings.tsx`
- `components/EmailSubscriptionToggle.tsx`
- `components/DeleteDataPanel.tsx`
- `components/AuthButton.tsx`

Account actions:

- Update display name.
- Toggle email subscription.
- Toggle personalization.
- Clear reading history.
- Delete saved articles.
- Sign out.

API routes:

- `app/api/account/preferences/route.ts`
- `app/api/account/clear-history/route.ts`

Use Zod for request validation.

## Email Subscription

Double opt-in flow:

1. Authenticated user enables daily email updates.
2. API validates input and creates/updates `newsletter_subscriptions` with `subscribed=false`.
3. Generate a secure random confirmation token and unsubscribe token.
4. Store only SHA-256 hashes of those tokens.
5. Send confirmation email through Resend.
6. `/api/email/confirm` hashes the incoming token, finds the matching row, and sets `subscribed=true`, `confirmed_at=now()`.
7. Daily email cron sends only to `subscribed=true` rows with `confirmed_at is not null`.

Unsubscribe:

- Every email includes `/api/email/unsubscribe?token=...`.
- Route works without login.
- Route hashes the token, finds the subscription, sets `subscribed=false`, sets `unsubscribed_at=now()`, and returns a simple confirmation response.

Do not log raw tokens.

## Daily Email Cron

Create:

- `app/api/cron/send-daily-emails/route.ts`

Behavior:

1. Require `CRON_SECRET`.
2. Load the current daily newsletter snapshot from existing storage.
3. Query confirmed subscribers with admin client.
4. Generate concise email HTML/text via `lib/email/templates/dailyNewsletter.ts`.
5. Include top items by category, summaries, why-it-matters, source, and links.
6. Include a clear unsubscribe link.
7. Send through Resend.
8. Write success/failure to `email_delivery_logs`.

Idempotency:

- Before sending, check `email_delivery_logs` for a successful delivery to the same email for the current America/New_York day and the same subject.
- Skip duplicates and log/return counts.

## Security Controls

- Zod validation for all mutating API route bodies.
- Server-only Supabase admin client.
- No service role imports from client components.
- No custom password storage.
- No raw tokens in logs.
- Minimal event storage and user-controlled personalization disable.
- Account routes use server-side session checks.
- Public browsing remains separate from private data access.
- Sensitive cron/email endpoints require `CRON_SECRET` or secure token verification.

## Testing Strategy

Add unit/integration coverage for:

- RLS migration contains RLS enables and `auth.uid()` policies.
- Token generation returns raw token plus hash and never persists raw token in helper output intended for DB.
- Email template includes unsubscribe link and does not require private data beyond subscription email.
- `ForYouFeed` still renders logged-out empty/local state.
- Event recording does not touch `window` during SSR.
- Gallery API branches safely when unauthenticated and uses authenticated user id when available.
- No client component imports `lib/supabase/admin`.
- Account/privacy components render empty and disabled states safely.

Run:

- `npm test`
- `npm run build`

Manual verification with real Supabase/Resend requires project env vars, migrations applied, and Resend sender configuration.

## Rollout Order

1. Add dependencies and env example.
2. Add Supabase clients and auth helpers.
3. Add migrations and RLS policies.
4. Add auth pages and callback.
5. Add account page and privacy controls.
6. Update gallery API/UI for authenticated storage with logged-out fallback.
7. Add events API and logged-in personalization path.
8. Add email token/hash utilities, Resend client, templates, subscribe/confirm/unsubscribe routes.
9. Add daily email cron route and delivery logs.
10. Add tests, run build, and manually inspect core navigation.

## Open Assumptions

- The Supabase project and Resend domain/API key will be supplied through environment variables.
- The app can ship migrations without applying them automatically.
- Email/password auth is optional; magic-link auth is the first supported path.
- Service-role operations are acceptable in server route handlers only.
- The existing local JSON daily-news snapshot remains the source for daily email content.

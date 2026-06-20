# TechEveryday - AI News Updates

TechEveryday is a polished full-stack newsletter generator for daily technology discovery. It curates trusted tech news, official research and company blogs, arXiv papers, and optional trusted X posts into a daily 7:00 AM America/New_York briefing.

Repository name: `TechEveryday-AI-News-Updates`

## Features

- Next.js App Router, TypeScript, Tailwind CSS, and Framer Motion.
- Premium beige and white editorial UI with black outlines, hover motion, and scroll-triggered card reveals.
- Opening hero animation where `TechEveryday` starts full-screen, shrinks as you scroll, then hands off to a sticky centered navbar title.
- Seven curated newsletter categories with fresh, information-heavy cards where data exists.
- Live countdown to the next 7:00 AM America/New_York refresh.
- Save-to-gallery actions with local fallback storage for logged-out users and Supabase-backed account storage for signed-in users.
- Separate `/gallery` page with search, category filtering, source filtering, and remove actions.
- Supabase Auth account system with magic-link sign-in, private saved articles, and account privacy controls.
- Optional For You personalization using minimal reading events that users can disable or clear.
- Double opt-in daily email subscriptions through Resend with clear unsubscribe links.
- Refresh API at `/api/cron/refresh-news` with `/api/refresh-news` as a compatibility route, protected by `CRON_SECRET` outside local development.
- Optional official X API integration when `X_BEARER_TOKEN` is present. No X scraping.
- Public daily feed snapshots use Supabase in production and local JSON only for development fallback. Account data lives in Supabase Postgres with Row Level Security.

## Tech Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase-backed public daily snapshot storage with local JSON development fallback
- Supabase Auth, Supabase Postgres, and Row Level Security for account data
- Resend for confirmed daily email delivery
- Vitest for data-layer tests
- RSS and arXiv fetching

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=TechEveryday <updates@techeveryday.org>
APP_BASE_URL=https://tech-everyday-ai-news-updates.vercel.app
X_BEARER_TOKEN=
NEWS_API_KEY=
OPENAI_API_KEY=
CRON_SECRET=
```

`X_BEARER_TOKEN` enables trusted X post fetching through the official X API. Without it, X fetching is skipped gracefully and existing X items can be preserved by the refresh pipeline.

`OPENAI_API_KEY` is reserved for a future LLM summarizer. The first version uses deterministic source excerpts and does not hallucinate article details.

`CRON_SECRET` protects `/api/cron/refresh-news` and manual refresh calls. Local development is allowed without a secret when `NODE_ENV=development`.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe Supabase values. `SUPABASE_SERVICE_ROLE_KEY` is used only by server routes for email confirmation, unsubscribe, and cron delivery operations.

`RESEND_API_KEY` and `EMAIL_FROM` enable confirmation emails and daily newsletter delivery. Production uses `TechEveryday <updates@techeveryday.org>`.

`APP_BASE_URL` should be the deployed site origin, currently `https://tech-everyday-ai-news-updates.vercel.app`, so auth callbacks and email links are correct.

## Supabase Setup

1. Create a Supabase project.
2. Apply the SQL files in `supabase/migrations/`.
3. Enable email magic-link auth in Supabase Auth settings.
4. Set the Supabase Auth Site URL:

```text
https://tech-everyday-ai-news-updates.vercel.app
```

5. Add the deployed callback Redirect URL:

```text
https://tech-everyday-ai-news-updates.vercel.app/auth/callback
```

6. Add local callback Redirect URLs for development:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

The migrations create:

- `profiles`
- `user_preferences`
- `saved_articles`
- `reading_events`
- `newsletter_subscriptions`
- `email_delivery_logs`
- `newsletter_snapshots`
- `refresh_runs`

RLS is enabled on every account data table. Authenticated users can only access rows where `auth.uid() = user_id`. Anonymous users cannot read private account data. Service-role operations happen only in server route handlers.

Production login and refresh will not work until these Vercel Production env vars are present:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add APP_BASE_URL production
vercel env add CRON_SECRET production
```

Use `https://tech-everyday-ai-news-updates.vercel.app` for `APP_BASE_URL`. Redeploy after adding or changing env vars.

Verify auth after deployment:

1. Open `/login` and request a magic link.
2. Confirm the email link lands on `/auth/callback` and redirects to `/account`.
3. Confirm `/account` shows the signed-in email and sign-out controls.
4. Save an article while signed in and confirm it appears in `/gallery` from the same account.

Verify RLS by signing in as two separate users and confirming each user only sees their own saved articles, preferences, and reading history.

## Production Email Setup

Production email uses Resend and the official sender identity `TechEveryday <updates@techeveryday.org>`. Email delivery will not work until:

Real email delivery cannot be confirmed until these Vercel environment variables are added and `techeveryday.org` is verified in Resend DNS.

`updates@techeveryday.org` does not need to be a mailbox for sending through Resend, but the domain must be verified.

Required Vercel Production env vars:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=TechEveryday <updates@techeveryday.org>
APP_BASE_URL=https://tech-everyday-ai-news-updates.vercel.app
CRON_SECRET=
```

Manual Resend/DNS steps:

1. Add `techeveryday.org` as a sending domain in Resend.
2. Copy the DNS records Resend provides.
3. Add those records wherever `techeveryday.org` DNS is managed.
4. Wait until Resend marks the domain as verified.
5. Redeploy Vercel after env changes.
6. Test signup again.

Use `/api/email/debug-config` to check non-secret email setup. The endpoint is open outside production and requires `CRON_SECRET` in production.

## Account Privacy

TechEveryday uses privacy-first account copy and controls. It does not claim complete privacy.

The account system stores only:

- email for login and subscriptions
- saved articles
- preferences
- optional reading signals used for For You recommendations
- email delivery logs for operational debugging

Users can disable personalization, clear reading history, clear saved articles, unsubscribe from daily email, or sign out from `/account`.

## Daily Refresh

The refresh pipeline:

1. Fetches candidates from trusted RSS/API sources in `config/sources.ts`.
2. Fetches arXiv computer science papers.
3. Optionally fetches trusted X posts from `config/trusted-x-accounts.ts`.
4. Deduplicates by URL and title similarity.
5. Filters low-trust or incomplete items.
6. Sorts by trust, freshness, and category relevance.
7. Creates concise deterministic summaries from source excerpts.
8. Assigns each item to one category.
9. Selects up to five items per category.
10. Rejects stale content older than 72 hours instead of filling categories with old items.
11. Writes the current public daily snapshot and refresh status.

If a category has no high-signal new items in the last 72 hours, the UI shows a clean empty state instead of stale filler.

Run it locally:

```bash
npm run refresh:local
```

Or call the API:

```bash
curl -X POST "http://localhost:3000/api/refresh-news"
```

With a secret:

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-domain.com/api/cron/refresh-news?force=true"
```

The production refresh status endpoint is available at `/api/news/refresh-status`. It returns safe metadata such as started/completed timestamps, the New York refresh date, selected item counts, storage backend, and configured cron schedules.

## Vercel Cron

Vercel Cron calls configured paths with HTTP `GET`, and schedules are evaluated in UTC. `vercel.json` includes two UTC refresh entries so 7:00 AM America/New_York works across daylight saving time:

- `0 11 * * *`
- `0 12 * * *`

Both call `/api/cron/refresh-news`. The route checks the current time in `America/New_York`, runs only during the 7 AM hour, and skips if the New York calendar day has already refreshed.

`vercel.json` also includes two daily email entries:

- `15 11 * * *`
- `15 12 * * *`

The first two entries refresh the public daily feed. The `:15` entries send confirmed daily emails shortly after the refresh window. Duplicate email delivery is suppressed by checking `email_delivery_logs` for a successful send to the same email and subject on the current America/New_York day.

Set `CRON_SECRET` in Vercel. Manual refresh testing with `/api/cron/refresh-news?force=true` requires `Authorization: Bearer $CRON_SECRET`. Scheduled Vercel Cron calls are accepted by the cron route and remain idempotent.

## Email Subscriptions

Daily email updates use double opt-in:

1. A signed-in user enables daily email updates from `/account`.
2. TechEveryday creates a subscription with `subscribed=false`.
3. A confirmation token is generated and only its hash is stored.
4. Resend sends a confirmation email.
5. `/api/email/confirm` verifies the token hash and enables delivery.

Every daily email includes an unsubscribe link. The unsubscribe route works without login and stores only token hashes.

## GitHub Actions Fallback

`.github/workflows/daily-refresh.yml` triggers the same route at 11:00 UTC and 12:00 UTC. Configure these repository secrets:

- `APP_URL`
- `CRON_SECRET`

## Storage

The public newsletter snapshot uses Supabase in production and local JSON files only for development fallback. Apply the `newsletter_snapshots` and `refresh_runs` migrations and set `NEXT_PUBLIC_SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` before relying on production cron refreshes.

- `data/daily-news.json`
- `data/gallery.json`
- `data/last-refresh.json`

Daily newsletter snapshot reads are centralized in `lib/news/snapshotStorage.ts`. Local gallery fallback storage remains in `lib/storage.ts`. Account-owned data is stored in Supabase:

- `saved_articles`
- `reading_events`
- `user_preferences`
- `newsletter_subscriptions`
- `newsletter_snapshots`
- `refresh_runs`

## Tests

```bash
npm test
```

Current tests cover:

- 7:00 AM America/New_York refresh calculations.
- Deterministic summary trimming.
- Category classification, deduplication, and previous-content preservation.
- Gallery save/remove persistence.
- Supabase migration RLS coverage.
- Server-only service role import isolation.
- Email token hashing and daily email rendering.

## Future Improvements

- Add OpenGraph image extraction fallback for sources that omit RSS images.
- Add an optional LLM summarizer behind `OPENAI_API_KEY`.
- Add Hacker News as discovery only, always linking final cards to the original source.
- Add OAuth providers such as Google or GitHub if needed.

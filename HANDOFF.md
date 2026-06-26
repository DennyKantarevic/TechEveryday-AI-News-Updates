# TechEveryday Handoff Report

## 1. Current Project State

Important branch reality:

- Current checked-out branch: `main`
- Current local HEAD: `57ade04 docs: plan supabase backend implementation`
- `git status --short`: clean before this handoff file was added
- `origin/main`: `cec418c fix: stabilize personalization and feed quality`
- Production Vercel URL: `https://tech-everyday-ai-news-updates.vercel.app`
- Production appears to be deployed from `feat/supabase-auth-email`, not current `main`. Evidence: production has `/login`, `/signup`, `/account`, `/api/email/subscribe`, and `/api/news/refresh-status`; current `main` does not.
- `feat/supabase-auth-email` HEAD: `40c76a3 Fix cron skip ordering for production`

Current `main` stack:

- Next.js App Router, TypeScript, React 19, Tailwind CSS, Framer Motion.
- RSS/arXiv/news fetching through `rss-parser`, `fast-xml-parser`, and native `fetch`.
- Vitest test suite.
- Local JSON storage through `data/daily-news.json`, `data/gallery.json`, and `data/last-refresh.json`.

Production branch stack additions:

- Supabase Auth/Postgres/RLS via `@supabase/supabase-js` and `@supabase/ssr`.
- Resend email sending via `resend`.
- Request validation via `zod`.
- Server-only guard package.

Main routes/pages in current `main`:

- `/` newsletter homepage.
- `/learning` foundations and current-context learning page.
- `/for-you` local personalization page.
- `/gallery` saved reading gallery.
- `/api/gallery` local JSON gallery API.
- `/api/refresh-news` refresh API.

Additional routes present on `feat/supabase-auth-email` and production:

- `/login`, `/signup`, `/account`, `/auth/callback`.
- `/api/events`.
- `/api/account/preferences`, `/api/account/clear-history`.
- `/api/email/subscribe`, `/api/email/confirm`, `/api/email/unsubscribe`, `/api/email/debug-config`.
- `/api/cron/refresh-news`, `/api/cron/send-daily-emails`.
- `/api/news/refresh-status`.

Major components:

- Newsletter/home: `app/page.tsx`, `components/HeroTitle.tsx`, `components/StickyHeader.tsx`, `components/CategorySection.tsx`.
- Article cards: `components/NewsCard.tsx`.
- Learning: `components/LearningFoundations.tsx`, `components/LearningBridgeList.tsx`, `components/LearningCurrentContext.tsx`, `lib/learning.ts`.
- For You: `app/for-you/page.tsx`, `components/ForYouFeed.tsx`, `lib/interactions.ts`, `lib/recommendations.ts`.
- Gallery: `app/gallery/page.tsx`, `components/GalleryGrid.tsx`, `app/api/gallery/route.ts`.
- Transitions/animation: `components/PageTransition.tsx`, `components/AnimatedArticleGrid.tsx`, `components/AnimatedSectionHeader.tsx`, `app/globals.css`.

Data storage approach:

- Current `main`: local JSON file storage only.
- Production branch: public feed can use Supabase `daily_news_snapshots` through `lib/news/snapshotStorage.ts`, with local JSON fallback. Account data uses Supabase tables. Production `/api/news/refresh-status` currently reports `persistentStorageConfigured: false` and `storageBackend: "local-json"`, so persistent production refresh storage is not configured yet.

Verification performed:

- `npm test`: passed, 23 test files / 92 tests.
- `npm run build`: passed.
- Local production server on `http://localhost:3100`: `/`, `/learning`, `/for-you`, `/gallery`, `/api/gallery` returned 200; unauthenticated `/api/refresh-news?scheduled=1` returned 401.
- Local Playwright route checks at desktop and mobile sizes: primary pages rendered nonblank and no horizontal overflow.
- Production HTTP checks: primary pages returned 200; unauthenticated refresh returned 401; `/api/news/refresh-status` returned 200.
- Production Playwright mobile checks: primary pages rendered nonblank, no horizontal overflow, returning to Newsletter from Learning/For You/Gallery rendered nonblank.

## 2. Features Already Worked On

| Feature | Status | Notes |
| --- | --- | --- |
| Newsletter homepage | Done | Current `main` and production render the editorial homepage, hero wordmark, sticky header, countdown, and category sections. |
| Daily tech/research article feed | Partially done / currently stale | Pipeline exists, but checked-in `main` data was last refreshed `2026-06-12T20:44:59.398Z`; production status last completed `2026-06-13T14:25:13.877Z`. Current homepage filters everything out as stale. |
| 72-hour freshness rule | Done | `lib/news/freshness.ts` rejects items older than 72 hours. Current home/prod home show empty states instead of stale filler. |
| Source quality filtering | Done / needs tuning | `lib/news/classify.ts`, `config/sources.ts`, and `config/trusted-x-accounts.ts` implement trusted source lists, low-value filtering, category fit, dedupe, and scoring. |
| Article cards | Done | Cards show source, published date, freshness label, title, summary, why-it-matters, source type, tags, original link, and save/remove actions. |
| "Why it matters" | Done / deterministic | Generated in `lib/news/scoring.ts`; source-grounded only to the extent RSS/arXiv excerpts are good. No LLM summarizer is active. |
| Learning page | Done | Stable foundations, resource cards, current-news bridges, and current-context stories. |
| For You page | Partially done | Current `main` uses localStorage interaction events. Production branch adds Supabase-backed saved articles/reading events for logged-in users, with logged-out fallback. |
| Gallery/saved articles | Partially done | Current `main` saves to local JSON. Production branch uses Supabase `saved_articles` for logged-in users and local fallback for logged-out users. |
| Page transitions | Done | `PageTransition` clips overflow and resets scroll. Tests and Playwright checks show no horizontal overflow. |
| Scroll animations | Done / not fully observable with stale feed | Tests cover parent-controlled section/card animation. Current/prod homepage has zero article cards because feed is stale, so live article reveal cannot be visually verified right now. |
| TechEveryday wordmark styling | Done | `BrandWordmark` plus CSS distinct `Tech`/italic `Everyday`. |
| Relative time display | Broken on current `main`; done on production branch | Current `main` computes freshness once from `foundAt/publishedAt`. `feat/supabase-auth-email` adds `components/RelativeTime.tsx`, updating every 60 seconds. |
| Supabase/auth work | Not implemented on current `main`; partially done on production branch | Branch contains clients, auth pages, account page, RLS migrations, saved articles, reading events, and account controls. Production exposes login/signup/account redirect. |
| Email subscription work | Not implemented on current `main`; partially done but broken in production | Branch contains subscribe/confirm/unsubscribe/debug routes and Resend utilities. Production subscribe currently returns `Missing RESEND_API_KEY`. |
| Vercel cron refresh work | Partially done / broken | Current `main` has `/api/refresh-news?scheduled=1` in `vercel.json`. Production branch has `/api/cron/refresh-news` and `/api/cron/send-daily-emails`, but production reports no persistent storage configured. |
| `/api/news/refresh-status` | Not implemented on current `main`; done on production branch | Production endpoint exists and reports refresh/storage status. |

## 3. Known Current Problems

### Branch/deployment mismatch

- Current observed status: production is not represented by current checked-out `main`. Production has auth/email/status routes that only exist on `feat/supabase-auth-email`.
- Relevant files: `feat/supabase-auth-email:*`, especially `vercel.json`, `app/api/news/refresh-status/route.ts`, `app/api/email/subscribe/route.ts`, `supabase/migrations/*`.
- Likely cause: Vercel is deployed from `feat/supabase-auth-email` or from an unmerged branch/deployment state.
- Suggested fix: before implementing anything production-facing, sync intentionally. Inspect `git log --oneline --decorate --all -12`; decide whether to continue on `feat/supabase-auth-email`, merge it into `main`, or retarget Vercel.

### Vercel daily refresh cron is failing or not durable

- Current observed status: production `/api/news/refresh-status` reports `lastRefreshCompletedAt: 2026-06-13T14:25:13.877Z`, `nextRefreshAt: 2026-06-19T11:00:00.000Z`, `persistentStorageConfigured: false`, `storageBackend: "local-json"`. Homepage currently has zero article cards.
- Relevant files: `feat/supabase-auth-email:vercel.json`, `app/api/cron/refresh-news/route.ts`, `lib/news/refreshHandler.ts`, `lib/news/snapshotStorage.ts`, `supabase/migrations/202606130001_daily_news_snapshots.sql`.
- Likely cause: production lacks `NEXT_PUBLIC_SUPABASE_URL` and/or `SUPABASE_SERVICE_ROLE_KEY`, or the `daily_news_snapshots` migration is not applied. The production refresh handler refuses production refresh without persistent storage.
- Suggested fix: configure Supabase env vars in Vercel Production, apply migrations, confirm `/api/news/refresh-status` reports `persistentStorageConfigured: true`, then verify a forced refresh with the cron secret.

### Article "posted X ago" timestamps may not update live

- Current observed status: current `main` does not live-update; production branch has `RelativeTime` updating every minute.
- Relevant files: current `components/NewsCard.tsx`; production branch `components/RelativeTime.tsx`, `components/NewsCard.tsx`.
- Likely cause: current `main` computes `freshness` with `useMemo` from a fixed `referenceNow`.
- Suggested fix: use the production branch `RelativeTime` implementation when reconciling branches.

### Email signup is not delivering emails

- Current observed status: production POST `/api/email/subscribe` returned HTTP 500 with `{"error":"Missing RESEND_API_KEY. Add it to Vercel Production environment variables."}`.
- Relevant files: `feat/supabase-auth-email:app/api/email/subscribe/route.ts`, `lib/email/config.ts`, `lib/email/resend.ts`, `components/EmailSubscriptionToggle.tsx`.
- Likely cause: missing `RESEND_API_KEY` in Vercel Production.
- Suggested fix: add `RESEND_API_KEY`, verify `EMAIL_FROM`, verify Resend domain DNS, redeploy, then test with a real inbox.

### `updates@techeveryday.org` sender may not work yet

- Current observed status: no Resend dashboard/DNS access from this repo inspection. README on production branch documents this requirement.
- Relevant files: `feat/supabase-auth-email:.env.example`, `README.md`, `lib/email/config.ts`.
- Likely cause: `techeveryday.org` may not be added/verified in Resend DNS.
- Suggested fix: add `techeveryday.org` in Resend, publish required DNS records, wait for verification, set `EMAIL_FROM=TechEveryday <updates@techeveryday.org>`.

### Vercel production env vars may be missing or incorrect

- Current observed status: `RESEND_API_KEY` is missing based on production subscribe response. Persistent news storage is not configured based on `/api/news/refresh-status`. Unknown whether `CRON_SECRET`, Supabase anon URL/key, and `APP_BASE_URL` are correct.
- Relevant files: `feat/supabase-auth-email:.env.example`, `lib/email/config.ts`, `lib/news/snapshotStorage.ts`, `lib/supabase/admin.ts`.
- Likely cause: Vercel Production environment does not match `.env.example`.
- Suggested fix: audit Vercel Production env vars against section 4 below; redeploy after changes.

### For You page previously failed to load

- Current observed status: local and production `/for-you` return 200 and render nonblank onboarding content. Mobile Playwright found no horizontal overflow.
- Relevant files: current `app/for-you/page.tsx`, `components/ForYouFeed.tsx`; production branch versions also touch `lib/events/readingEvents.ts`, `lib/gallery/savedArticles.ts`.
- Likely cause if it regresses: Supabase env/client errors or malformed localStorage/event payloads.
- Suggested fix: keep the tested localStorage fallback path; ensure server Supabase errors cannot crash the logged-out page.

### Returning from Learning/For You/Gallery back to Newsletter previously caused blank content

- Current observed status: local and production Playwright navigation back to `/` from those pages rendered nonblank homepage content and no horizontal overflow.
- Relevant files: `components/PageTransition.tsx`, `components/StickyHeader.tsx`, `app/globals.css`.
- Likely cause appears fixed: page transition wrapper uses `overflow-x-clip`, body uses `overflow-x: hidden`, and header Newsletter link resets scroll.
- Suggested fix: keep existing transition logic; add end-to-end route navigation checks if changing it.

### Slide animations previously caused horizontal page scrolling

- Current observed status: local and production Playwright mobile checks show `scrollWidth === clientWidth`; tests cover this.
- Relevant files: `components/PageTransition.tsx`, `app/globals.css`, `tests/page-transition.test.tsx`, `tests/global-css.test.ts`.
- Likely cause appears fixed.
- Suggested fix: do not remove `overflow-x-clip`/`overflow-x: hidden`; test mobile after animation changes.

### Some article cards previously failed to appear after header animations

- Current observed status: tests cover parent-controlled grid/card animation. Live homepage has zero article cards because the feed is stale, so this cannot be visually verified with current production data.
- Relevant files: `components/CategorySection.tsx`, `components/AnimatedArticleGrid.tsx`, `components/AnimatedSectionHeader.tsx`, `components/NewsCard.tsx`, `tests/animations.test.tsx`, `tests/category-section-interactions.test.tsx`.
- Likely cause appears mitigated by parent-controlled animation state.
- Suggested fix: after refresh works and cards exist, run browser checks that scroll through all sections and count visible cards.

### Current feed should not show stale content older than 72 hours

- Current observed status: no stale filler is shown. Current checked-in feed has 34 stale items, but homepage filters all out and renders empty states. Production homepage also shows 7 empty states and 0 article cards.
- Relevant files: `lib/news/freshness.ts`, `app/page.tsx`, `components/CategorySection.tsx`.
- Likely cause of empty homepage: refresh has not produced persistent current data since June 13, 2026 in production and June 12, 2026 in current local data.
- Suggested fix: fix cron/persistent storage, then verify all rendered card `publishedAt` values are within 72 hours.

### Sections should attempt at least 3 current high-quality items, but should not use stale filler

- Current observed status: selector target is 3 for fallback discovery, but final selection can show up to 5 items per category. Underfilled categories are logged in refresh debug. Current/prod show empty sections rather than stale filler.
- Relevant files: `lib/news/refreshPipeline.ts`, `lib/news/classify.ts`.
- Likely cause of underfilled sections: refresh unavailable or insufficient fresh qualified source items.
- Suggested fix: keep "no stale filler"; improve source coverage/fallback observability after persistent refresh works.

## 4. Environment Variables Required

Current `main` runtime code uses:

- `CRON_SECRET`: protects `/api/refresh-news` outside local development.
- `NEWS_API_KEY`: optional NewsAPI candidate source.
- `X_BEARER_TOKEN`: optional official X API trusted-post source.

Current `main` docs/example also include:

- `OPENAI_API_KEY`: reserved for future summarizer; no active OpenAI call found.

Production branch requires or uses:

- `NEXT_PUBLIC_SUPABASE_URL`: browser/server Supabase URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser/server Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase admin operations and persistent daily snapshot storage.
- `RESEND_API_KEY`: Resend client for confirmation and daily emails.
- `EMAIL_FROM`: sender identity. Expected production value: `TechEveryday <updates@techeveryday.org>`.
- `APP_BASE_URL`: used for auth/email links. Expected production value: `https://tech-everyday-ai-news-updates.vercel.app`.
- `CRON_SECRET`: manual cron/auth secret for refresh and email cron routes.
- `X_BEARER_TOKEN`: optional X integration.
- `NEWS_API_KEY`: optional NewsAPI integration.
- `OPENAI_API_KEY`: documented future summarizer key.

Exact email note:

Real email delivery cannot be confirmed until the required Vercel environment variables are added and `techeveryday.org` is verified in Resend DNS. `updates@techeveryday.org` does not need to be a mailbox for sending through Resend, but the domain must be verified.

## 5. Deployment / Vercel Notes

Current `main`:

- `vercel.json` exists.
- Cron paths configured:
  - `/api/refresh-news?scheduled=1` at `0 11 * * *`
  - `/api/refresh-news?scheduled=1` at `0 12 * * *`
- The cron route exists and supports `GET` and `POST`.
- Auth expects `Authorization: Bearer ${CRON_SECRET}`, `x-cron-secret`, or `?secret=`.
- The app writes refresh results to local JSON files. This is unreliable on Vercel serverless.
- `app/page.tsx` is `force-dynamic`, so homepage rendering itself is not statically cached, but it reads stale local JSON if refresh persistence fails.
- `/api/news/refresh-status` does not exist on current `main`.

Production branch:

- `vercel.json` configures:
  - `/api/cron/refresh-news` at `0 11 * * *` and `0 12 * * *`
  - `/api/cron/send-daily-emails` at `15 11 * * *` and `15 12 * * *`
- Refresh cron route exists and uses `GET`.
- Scheduled Vercel cron is accepted by `user-agent: vercel-cron/1.0`; manual forced refresh still requires the bearer secret.
- `lib/news/snapshotStorage.ts` can persist snapshots in Supabase, but production currently reports persistent storage is not configured.
- Refresh handler revalidates `/`, `/learning`, and `/for-you` after successful refresh.

Check in Vercel dashboard:

- Which Git branch/project deployment is currently active.
- Whether Production env vars match `.env.example` from `feat/supabase-auth-email`.
- Whether cron job invocations are succeeding or returning 500 due to missing persistent storage.
- Whether `CRON_SECRET` is set if manual/debug endpoints should be protected.
- Whether Supabase migrations have been applied before enabling production refresh.

## 6. Email / Resend Notes

Current `main`:

- No Resend dependency.
- No email routes.
- No subscribe/confirm/unsubscribe flow.

Production branch:

- Email sending is implemented in:
  - `lib/email/resend.ts`
  - `lib/email/config.ts`
  - `app/api/email/subscribe/route.ts`
  - `app/api/cron/send-daily-emails/route.ts`
  - `lib/email/templates/dailyNewsletter.ts`
- All send calls observed use `process.env.EMAIL_FROM`.
- Search found no active hardcoded `onboarding@resend.dev` or `updates@dennykportfolio.com` in the inspected production branch path.
- Signup does not return fake success if Resend rejects email. It returns 502 for provider rejection, 500 for missing config, or 503 for unexpected send failure.
- Confirmation links use `APP_BASE_URL`.
- Unsubscribe links exist via `/api/email/unsubscribe?token=...` and hash token lookup.
- Debug config route exists at `/api/email/debug-config`; in production it requires `CRON_SECRET`.
- README on production branch explains Resend DNS verification. Current `main` README does not.
- Production subscribe check currently fails with missing `RESEND_API_KEY`, so delivery is not configured.

## 7. Database / Supabase Notes

Current `main`:

- Supabase is not installed in `package.json`.
- No `supabase/` directory exists on current branch.
- No auth pages exist.
- No account settings exist.
- Saved articles are local JSON only.
- For You events are localStorage only.

Production branch:

- Supabase dependencies are present.
- Migrations exist:
  - `supabase/migrations/202606120001_auth_user_data.sql`
  - `supabase/migrations/202606120002_saved_articles_payload.sql`
  - `supabase/migrations/202606120003_reading_events_payload.sql`
  - `supabase/migrations/202606130001_daily_news_snapshots.sql`
- Tables present/expected from migrations:
  - `profiles`
  - `user_preferences`
  - `saved_articles`
  - `reading_events`
  - `newsletter_subscriptions`
  - `email_delivery_logs`
  - `daily_news_snapshots`
- RLS is enabled on all listed tables. User-owned policies use `auth.uid() = user_id` for account data. `daily_news_snapshots` is service-role managed.
- Saved articles are tied to user accounts when logged in and fall back to local storage when logged out.
- Reading events are tied to user accounts when logged in and personalization is enabled; logged-out behavior remains localStorage.
- Auth pages exist on production branch: `/login`, `/signup`, `/auth/callback`.
- Account settings exist on production branch: `/account`, `AccountSettings`, `EmailSubscriptionToggle`, `DeleteDataPanel`.
- Production status indicates Supabase persistent public snapshot storage is not configured yet, despite code support.

## 8. Recommended Next Tasks for the New Agent

### Priority 1 - Production Stability

- Resolve branch/deployment mismatch first. Decide whether `feat/supabase-auth-email` should be merged to `main` or Vercel should retarget.
- Fix Vercel cron daily refresh failure.
- Make cron route reliable, observable, idempotent, and GET-compatible. Production branch is close; verify actual Vercel runs.
- Ensure refresh results are saved to persistent storage. Apply `daily_news_snapshots` migration and set Supabase env vars.
- Add/verify `/api/news/refresh-status`. It exists in production branch and production, but not current `main`.

### Priority 2 - Email Delivery

- Verify Vercel env vars.
- Verify Resend API key exists.
- Verify `EMAIL_FROM=TechEveryday <updates@techeveryday.org>`.
- Verify `techeveryday.org` is added and verified in Resend DNS.
- Make signup fail visibly if Resend rejects the email. Production branch already does this; keep it.
- Confirm subscription flow and unsubscribe flow with a real inbox after env/DNS fixes.

### Priority 3 - Navigation / UI Reliability

- Verify For You loads after branch reconciliation.
- Verify returning to Newsletter does not blank the page.
- Prevent horizontal scrolling from page animations.
- Make For You use the exact working Learning transition logic if it regresses.

### Priority 4 - Article Feed Quality

- Enforce no daily-feed item older than 72 hours.
- Keep sections at 3 items when possible, but never use stale filler.
- Filter out low-information entertainment/viral stories.
- Make "why it matters" unique and source-grounded.
- Normalize article titles with LaTeX/HTML cleanup.

### Priority 5 - Account / Personalization

- Finish or merge Supabase Auth work if `feat/supabase-auth-email` is the intended path.
- Persist saved articles for logged-in users.
- Persist For You reading events safely.
- Add privacy controls. Production branch already has first-pass controls; verify after merge.

## 9. Files the New Agent Should Inspect First

Current `main` files:

- `package.json`: framework, scripts, dependencies.
- `app/page.tsx`: newsletter homepage and freshness filtering.
- `app/api/refresh-news/route.ts`: current refresh API and auth behavior.
- `vercel.json`: current cron configuration on `main`.
- `.env.example`: current env list, incomplete for production branch.
- `lib/news/refreshPipeline.ts`: RSS/arXiv/NewsAPI/X aggregation and fallback discovery.
- `lib/news/classify.ts`: quality filtering, dedupe, scoring, stale rejection debug.
- `lib/news/freshness.ts`: 72-hour freshness gate.
- `lib/storage.ts`: local JSON storage implementation.
- `components/NewsCard.tsx`: article card display and current non-live timestamp logic.
- `components/PageTransition.tsx`: route animation and overflow clipping.
- `components/ForYouFeed.tsx`: local For You recommendation UI.
- `lib/interactions.ts`: localStorage interaction event tracking.
- `data/last-refresh.json`: checked-in refresh debug, currently stale.
- `docs/superpowers/plans/2026-06-12-supabase-auth-email-backend.md`: planned backend work from `main`.

Production branch files to inspect with `git show feat/supabase-auth-email:<path>` or by switching branches:

- `feat/supabase-auth-email:vercel.json`: production cron paths.
- `feat/supabase-auth-email:app/api/cron/refresh-news/route.ts`: GET-compatible Vercel cron entry.
- `feat/supabase-auth-email:lib/news/refreshHandler.ts`: refresh auth, skip, persistent-storage guard, revalidation.
- `feat/supabase-auth-email:lib/news/snapshotStorage.ts`: Supabase daily snapshot persistence.
- `feat/supabase-auth-email:app/api/news/refresh-status/route.ts`: safe refresh status endpoint.
- `feat/supabase-auth-email:app/api/email/subscribe/route.ts`: subscription and Resend confirmation.
- `feat/supabase-auth-email:app/api/cron/send-daily-emails/route.ts`: daily email delivery cron.
- `feat/supabase-auth-email:lib/email/config.ts`: email env validation and diagnostics.
- `feat/supabase-auth-email:supabase/migrations/`: database schema/RLS.
- `feat/supabase-auth-email:app/api/gallery/route.ts`: logged-in Supabase gallery plus local fallback.
- `feat/supabase-auth-email:app/for-you/page.tsx`: logged-in event/saved-article personalization.
- `feat/supabase-auth-email:components/RelativeTime.tsx`: live relative time labels.

## 10. Suggested First Command Sequence

```bash
git status
git branch --show-current
git log --oneline -8
npm install
npm run build
```

Project-specific commands discovered:

```bash
npm test
npm run refresh:local
curl -s https://tech-everyday-ai-news-updates.vercel.app/api/news/refresh-status
curl -i https://tech-everyday-ai-news-updates.vercel.app/api/refresh-news?scheduled=1
```

Branch/deployment commands to run before production work:

```bash
git log --oneline --decorate --graph --all -12
git show feat/supabase-auth-email:vercel.json
git show feat/supabase-auth-email:.env.example
```

Be careful: `npm run refresh:local` writes to `data/daily-news.json` and `data/last-refresh.json`.

For production branch manual refresh after env/storage is fixed:

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://tech-everyday-ai-news-updates.vercel.app/api/cron/refresh-news?force=true"
```

## 11. Final Summary

Stable:

- Core Next.js UI builds and tests pass.
- Learning, For You, Gallery, page transitions, wordmark styling, empty states, and no-horizontal-scroll behavior are stable in local and production checks.
- The 72-hour freshness gate is working and prevents stale filler.

Risky:

- The current checked-out `main` branch is not the same code as production.
- The feed is stale; homepage shows no article cards because refresh persistence is not working.
- Production reports persistent storage is not configured.
- Email subscription exists in production branch, but production is missing `RESEND_API_KEY`.
- Supabase/Auth/Email code is on `feat/supabase-auth-email`, not current `main`.

Must be fixed before public users rely on it:

- Reconcile branch/deployment state.
- Configure Supabase persistent snapshot storage and apply migrations.
- Verify Vercel cron refresh succeeds and updates `/api/news/refresh-status`.
- Configure Resend env vars and verify `techeveryday.org` DNS.
- Run a full production smoke test: refresh, homepage cards, signup confirmation email, unsubscribe, For You, Gallery, and navigation return paths.

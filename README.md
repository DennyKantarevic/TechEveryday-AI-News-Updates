# TechEveryday - AI News Updates

TechEveryday is a polished full-stack newsletter generator for daily technology discovery. It curates trusted tech news, official research and company blogs, arXiv papers, and optional trusted X posts into a daily 7:00 AM America/New_York briefing.

Repository name: `TechEveryday-AI-News-Updates`

## Features

- Next.js App Router, TypeScript, Tailwind CSS, and Framer Motion.
- Premium beige and white editorial UI with black outlines, hover motion, and scroll-triggered card reveals.
- Opening hero animation where `TechEveryday` starts full-screen, shrinks as you scroll, then hands off to a sticky centered navbar title.
- Eight curated newsletter categories with 3-5 cards where data exists.
- Live countdown to the next 7:00 AM America/New_York refresh.
- Save-to-gallery actions with persistent local JSON storage.
- Separate `/gallery` page with search, category filtering, source filtering, and remove actions.
- Refresh API at `/api/refresh-news`, protected by `CRON_SECRET` outside local development.
- Optional official X API integration when `X_BEARER_TOKEN` is present. No X scraping.
- Data layer isolated in `lib/storage.ts` so it can later be replaced by Supabase, Neon, Firebase, or another database.

## Tech Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Local JSON file storage
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
X_BEARER_TOKEN=
NEWS_API_KEY=
OPENAI_API_KEY=
CRON_SECRET=
```

`X_BEARER_TOKEN` enables trusted X post fetching through the official X API. Without it, X fetching is skipped gracefully and existing X items can be preserved by the refresh pipeline.

`OPENAI_API_KEY` is reserved for a future LLM summarizer. The first version uses deterministic source excerpts and does not hallucinate article details.

`CRON_SECRET` protects `/api/refresh-news` for external cron calls. Local development is allowed without a secret when `NODE_ENV=development`.

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
10. Preserves previous category content when no new trusted content exists for that category.
11. Writes `data/daily-news.json`, `data/gallery.json`, and `data/last-refresh.json`.

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
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-domain.com/api/refresh-news"
```

## Vercel Cron

`vercel.json` includes two UTC cron entries:

- `0 11 * * *`
- `0 12 * * *`

Those cover 7:00 AM America/New_York across daylight saving and standard time. The route receives `?scheduled=1` and only runs during the 7 AM New York hour if the day has not already refreshed, so the extra UTC call is skipped.

Set `CRON_SECRET` in Vercel. Vercel Cron can send the bearer secret when that environment variable is configured; the route also supports `x-cron-secret` or `?secret=` for other schedulers.

## GitHub Actions Fallback

`.github/workflows/daily-refresh.yml` triggers the same route at 11:00 UTC and 12:00 UTC. Configure these repository secrets:

- `APP_URL`
- `CRON_SECRET`

## Storage

The first version stores data in local JSON files:

- `data/daily-news.json`
- `data/gallery.json`
- `data/last-refresh.json`

The storage API is centralized in `lib/storage.ts`. Replace that module with Supabase, Neon, Firebase, or another persistent store without rewriting the UI or refresh pipeline.

## Tests

```bash
npm test
```

Current tests cover:

- 7:00 AM America/New_York refresh calculations.
- Deterministic summary trimming.
- Category classification, deduplication, and previous-content preservation.
- Gallery save/remove persistence.

## Future Improvements

- Add hosted database storage for production persistence.
- Add OpenGraph image extraction fallback for sources that omit RSS images.
- Add an optional LLM summarizer behind `OPENAI_API_KEY`.
- Add Hacker News as discovery only, always linking final cards to the original source.
- Add per-user authentication for private galleries.

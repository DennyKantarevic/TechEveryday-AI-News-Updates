# TechEveryday AI News Updates

A curated daily AI and technology news briefing built with Next.js.

## Overview

TechEveryday AI News Updates is a reader-focused web app for following trusted AI, software, research, infrastructure, and startup news. It refreshes around the 7:00 AM America/New_York reading window, groups stories into curated categories, and lets readers save articles into a persistent gallery.

The refresh pipeline pulls from configured RSS feeds, arXiv, NewsAPI when configured, and optional official X API posts. It deduplicates candidates, scores freshness and source quality, creates concise deterministic summaries, and preserves previous category content when a refresh has no stronger replacement.

## Features

- Daily technology briefing organized by curated categories.
- Freshness-aware cards with source metadata, summaries, images, and external links.
- Save-to-gallery workflow backed by local JSON storage.
- `/gallery` page with search, category filtering, source filtering, and remove actions.
- `/for-you` page shaped by local reading and saved-article signals.
- Countdown for the next 7:00 AM America/New_York refresh window.
- Protected `/api/refresh-news` route for manual or scheduled refreshes.
- Optional official X API and NewsAPI integrations through environment variables.
- Scheduled refresh support through Vercel Cron and a GitHub Actions fallback workflow.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React icons
- Local JSON file storage
- rss-parser and fast-xml-parser for RSS and arXiv ingestion
- Vitest, Testing Library, jsdom, and ESLint
- Vercel configuration for scheduled deployment refreshes

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Supported environment variables:

```bash
X_BEARER_TOKEN=
NEWS_API_KEY=
OPENAI_API_KEY=
CRON_SECRET=
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Run tests:

```bash
npm test
```

Run the refresh pipeline locally:

```bash
npm run refresh:local
```

Build for production:

```bash
npm run build
```

## Project Structure

```text
app/                 Next.js pages, layouts, and API routes
components/          Reusable UI components for the briefing, gallery, and navigation
config/              Category, source, and trusted X account configuration
data/                Local JSON storage for daily news, gallery items, and refresh state
lib/                 Storage, recommendation, time, interaction, learning, and news logic
scripts/             Local refresh script
tests/               Vitest coverage for UI behavior, storage, time, and news pipeline logic
types/               Shared TypeScript types
.github/workflows/   Scheduled GitHub Actions refresh fallback
```

## Deployment

The repository includes `vercel.json` with two cron schedules that call `/api/refresh-news?scheduled=1` at 11:00 UTC and 12:00 UTC. The route accepts both times so the app can cover 7:00 AM in America/New_York across daylight saving and standard time, then skips duplicate or out-of-window scheduled calls.

For production deployments, configure the relevant environment variables in the hosting provider. `CRON_SECRET` protects the refresh route outside local development. Optional integrations are skipped gracefully when their variables are missing.

The GitHub Actions workflow in `.github/workflows/daily-refresh.yml` can also trigger the refresh route using repository secrets for `APP_URL` and `CRON_SECRET`.

## Future Improvements

- Move production persistence from local JSON files to hosted database storage.
- Add OpenGraph image extraction fallback for sources that omit RSS images.
- Add an optional LLM summarizer behind `OPENAI_API_KEY`.
- Add Hacker News as a discovery source while linking final cards to original sources.
- Add user authentication for private saved galleries and personalized email delivery.

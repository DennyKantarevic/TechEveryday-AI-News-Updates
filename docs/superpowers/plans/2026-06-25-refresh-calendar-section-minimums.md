# Refresh Calendar and Section Minimums Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce four or more high-quality educational items for each required technical section on normal refreshes and let users browse immutable daily refresh snapshots through a Calendar page.

**Architecture:** Keep the existing quality gates and five-item display cap, but define six quota-bearing sections and run targeted RSS, arXiv, and GitHub fallback discovery when any of them has fewer than four selected items. Extend the existing `newsletter_snapshots` text-key table with `YYYY-MM-DD` rows alongside `current`, expose server-only archive storage methods and a calendar API, and render archived snapshots without applying the current-feed 72-hour display filter.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase, local JSON fallback storage, Vitest, Testing Library, Playwright.

---

## File Structure

- Modify `config/categories.ts` to define the six quota-bearing section IDs and the shared minimum.
- Modify `types/news.ts` to add quota diagnostics and archive summary/snapshot types.
- Modify `lib/news/fetchArxiv.ts` to route research into topical sections and support category-targeted deeper queries.
- Modify `lib/news/fetchGithubRepos.ts` to support safe category-targeted fallback discovery.
- Modify `lib/news/refreshPipeline.ts` to enforce the four-item target, combine targeted fallback pools, write one current-and-dated successful snapshot, and report archive diagnostics.
- Modify `lib/storage.ts` to persist dated snapshots in local development and tests.
- Modify `lib/news/snapshotStorage.ts` to read, list, and upsert dated Supabase snapshots while preserving `current`.
- Create `lib/news/calendar.ts` for date validation, counts, archive metadata, and API response shaping.
- Create `app/api/news/calendar/route.ts` for archive listing and date lookup.
- Modify `app/api/news/refresh-status/route.ts` to include quota and archive metadata.
- Create `components/CalendarArchive.tsx` for the archive date list, counts, empty states, and grouped cards.
- Create `app/calendar/page.tsx` for server-side archive loading.
- Modify `components/StickyHeader.tsx` to add the Calendar tab.
- Add and update focused tests under `tests/news`, `tests/calendar`, and `tests/navigation.test.tsx`.

### Task 1: Define the required-section quota contract

**Files:**

- Modify: `config/categories.ts`
- Modify: `types/news.ts`
- Test: `tests/categories.test.ts`
- Test: `tests/news/refreshPipeline.test.ts`

- [ ] **Step 1: Write failing category contract tests**

Add assertions that the required list contains exactly the six requested IDs, excludes `research-papers`, and exports a minimum of four:

```ts
expect(REQUIRED_SECTION_IDS).toEqual([
  "ai-ml",
  "automation-agentic-systems",
  "embedded-systems",
  "computer-systems",
  "developer-tools-open-source",
  "cloud-infrastructure"
]);
expect(REQUIRED_SECTION_IDS).not.toContain("research-papers");
expect(MIN_ITEMS_PER_SECTION).toBe(4);
```

- [ ] **Step 2: Run the category test and verify RED**

Run:

```bash
npx vitest run tests/categories.test.ts
```

Expected: FAIL because the quota exports do not exist.

- [ ] **Step 3: Add the quota exports and diagnostic types**

In `config/categories.ts`, add:

```ts
export const REQUIRED_SECTION_IDS = [
  "ai-ml",
  "automation-agentic-systems",
  "embedded-systems",
  "computer-systems",
  "developer-tools-open-source",
  "cloud-infrastructure"
] as const satisfies readonly CategoryId[];

export type RequiredSectionId = (typeof REQUIRED_SECTION_IDS)[number];
export const MIN_ITEMS_PER_SECTION = 4;
```

In `types/news.ts`, add:

```ts
export type UnderfilledCategoryDiagnostic = {
  attemptedFallback: boolean;
  selectedCount: number;
  targetCount: number;
  reason:
    | "insufficient_fresh_candidates"
    | "quality_filters_rejected_candidates"
    | "fallback_source_failure";
  message: string;
};

export type ArchiveSnapshotSummary = {
  date: string;
  itemCount: number;
  sectionCounts: Record<CategoryId, number>;
  updatedAt: string;
};

export type ArchiveSnapshot = ArchiveSnapshotSummary & {
  dailyNews: DailyNews;
  lastRefresh: LastRefresh;
};
```

Extend `RefreshDebug` with:

```ts
minimumMetByCategory: Record<RequiredSectionId, boolean>;
archiveSnapshotDate?: string;
availableArchiveDatesCount?: number;
latestSnapshotDate?: string | null;
latestHistoricalSnapshotDate?: string | null;
```

- [ ] **Step 4: Run the category test and verify GREEN**

Run:

```bash
npx vitest run tests/categories.test.ts
```

Expected: PASS.

### Task 2: Enforce four-item selection diagnostics without weakening filters

**Files:**

- Modify: `lib/news/refreshPipeline.ts`
- Modify: `types/news.ts`
- Test: `tests/news/refreshPipeline.test.ts`
- Test: `tests/news/classify.test.ts`

- [ ] **Step 1: Write failing quota and anti-filler tests**

Update the existing fallback test to provide three initial cloud items and one fallback item, then expect four selected. Add a test where the fourth candidate is a shopping/deal article and assert the section remains at three with a quality-based underfilled diagnostic:

```ts
expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(4);
expect(result.debug.minimumMetByCategory["cloud-infrastructure"]).toBe(true);

expect(underfilled.dailyNews.categories["cloud-infrastructure"]).toHaveLength(3);
expect(underfilled.debug.rejectedBySalesPromotion).toBeGreaterThan(0);
expect(underfilled.debug.minimumMetByCategory["cloud-infrastructure"]).toBe(false);
expect(underfilled.debug.underfilledCategories?.["cloud-infrastructure"]).toMatchObject({
  targetCount: 4,
  reason: "quality_filters_rejected_candidates"
});
```

Also assert Research Papers does not trigger fallback discovery.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx vitest run tests/news/refreshPipeline.test.ts tests/news/classify.test.ts
```

Expected: FAIL because the target is three and minimum flags/reasons are absent.

- [ ] **Step 3: Implement quota helpers and concrete underfill reasons**

Replace the local target with `MIN_ITEMS_PER_SECTION` and restrict underfill checks to `REQUIRED_SECTION_IDS`.

Add:

```ts
function minimumMetByCategory(categories: DailyNews["categories"]) {
  return Object.fromEntries(
    REQUIRED_SECTION_IDS.map((categoryId) => [
      categoryId,
      (categories[categoryId]?.length ?? 0) >= MIN_ITEMS_PER_SECTION
    ])
  ) as Record<RequiredSectionId, boolean>;
}
```

Determine the underfill reason from rejected candidates for that category and fallback failures:

```ts
const reason = fallbackFailed
  ? "fallback_source_failure"
  : rejectedForQuality > 0
    ? "quality_filters_rejected_candidates"
    : "insufficient_fresh_candidates";
```

Add the category ID to rejected-candidate diagnostics so per-section rejection counts can be computed. Keep all existing commercial and technical-depth gates unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run tests/news/refreshPipeline.test.ts tests/news/classify.test.ts
```

Expected: PASS.

### Task 3: Add targeted arXiv and repository fallback discovery

**Files:**

- Modify: `lib/news/fetchArxiv.ts`
- Modify: `lib/news/fetchGithubRepos.ts`
- Modify: `lib/news/refreshPipeline.ts`
- Test: `tests/news/fetchArxiv.test.ts`
- Test: `tests/news/fetchGithubRepos.test.ts`
- Test: `tests/news/refreshPipeline.test.ts`

- [ ] **Step 1: Write failing topical arXiv tests**

Add tests that:

- `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, and `stat.ML` papers route to AI/ML unless agent terms route them to Automation.
- `cs.RO`, `cs.SY`, and `eess.SY` route to Embedded Systems.
- systems categories route to Computer Systems.
- `fetchArxivCategoryCandidates({ categoryId })` constructs a deeper targeted request and returns only that category.

Example:

```ts
expect(items.find((item) => item.url.endsWith("00004"))?.category).toBe("ai-ml");
expect(arxivCategoryRequestUrl("ai-ml")).toContain("cat%3Acs.AI");
```

- [ ] **Step 2: Write failing targeted GitHub tests**

Add a test that `fetchGithubRepositories({ categoryIds: ["embedded-systems"] })` issues only the embedded query, preserves README checks, and returns normalized repository metadata including owner/name, language, stars, updated date, URL, category, and README-grounded `whyItMatters`.

- [ ] **Step 3: Run source tests and verify RED**

Run:

```bash
npx vitest run tests/news/fetchArxiv.test.ts tests/news/fetchGithubRepos.test.ts
```

Expected: FAIL because topical AI routing and targeted APIs do not exist.

- [ ] **Step 4: Implement topical arXiv routing and targeted query helpers**

Export:

```ts
export function arxivCategoryRequestUrl(categoryId: RequiredSectionId) { ... }
export async function fetchArxivCategoryCandidates({
  categoryId,
  now = new Date()
}: {
  categoryId: RequiredSectionId;
  now?: Date;
}) { ... }
```

Use category query maps with `max_results=60`. Route agent keywords before generic AI tags, then route embedded, systems, developer tooling, and AI/ML categories. Preserve `research-papers` for papers that do not match a topical main section.

- [ ] **Step 5: Implement category-targeted GitHub discovery**

Extend `fetchGithubRepositories` options:

```ts
categoryIds?: readonly RequiredSectionId[];
```

Filter `REPO_DISCOVERY_QUERIES` before searching. Keep the existing requirements for recent activity, useful descriptions, adoption, README length, technical signals, and spam exclusions.

- [ ] **Step 6: Combine all high-quality fallback pools**

For every underfilled required section, fetch in parallel:

```ts
const [rss, arxiv, repos] = await Promise.all([
  fetchCategoryFallbackCandidates({ categoryId, now }),
  fetchArxivCategoryCandidates({ categoryId, now }),
  fetchGithubRepositories({
    now,
    categoryIds: [categoryId],
    perCategoryLimit: 12,
    maxReadmes: 12
  })
]);
```

Filter all results to the requested category and run the combined candidates through `selectDailyItemsWithDebug`; do not bypass any selector gate.

- [ ] **Step 7: Run source and pipeline tests and verify GREEN**

Run:

```bash
npx vitest run tests/news/fetchArxiv.test.ts tests/news/fetchGithubRepos.test.ts tests/news/refreshPipeline.test.ts
```

Expected: PASS.

### Task 4: Add dated archive persistence

**Files:**

- Modify: `lib/storage.ts`
- Modify: `lib/news/snapshotStorage.ts`
- Modify: `types/news.ts`
- Create: `lib/news/calendar.ts`
- Test: `tests/storage.test.ts`
- Test: `tests/news/snapshotStorage.test.ts`
- Create: `tests/news/calendar.test.ts`

- [ ] **Step 1: Write failing local archive tests**

Test that a successful snapshot written for `2026-06-25`:

- remains readable as current
- creates a dated archive
- appears once in descending archive summaries
- is intentionally replaced when the same date is written again
- does not mutate another date

Use:

```ts
await storage.writeArchiveSnapshot("2026-06-25", dailyNews, lastRefresh);
expect((await storage.readArchiveSnapshot("2026-06-25"))?.dailyNews).toEqual(dailyNews);
expect(await storage.listArchiveSnapshots()).toEqual([
  expect.objectContaining({ date: "2026-06-25" })
]);
```

- [ ] **Step 2: Write failing Supabase archive tests**

Mock the Supabase query chain and assert:

```ts
expect(upsert).toHaveBeenCalledWith(
  expect.arrayContaining([
    expect.objectContaining({ id: "current" }),
    expect.objectContaining({ id: "2026-06-25" })
  ])
);
```

Also test listing, exact date lookup, and current-row fallback when the dated row has not yet been backfilled.

- [ ] **Step 3: Run storage tests and verify RED**

Run:

```bash
npx vitest run tests/storage.test.ts tests/news/snapshotStorage.test.ts tests/news/calendar.test.ts
```

Expected: FAIL because archive methods and helpers do not exist.

- [ ] **Step 4: Implement pure calendar helpers**

In `lib/news/calendar.ts`, add:

```ts
export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export function isCalendarDate(value: string): boolean { ... }
export function sectionCounts(dailyNews: DailyNews): Record<CategoryId, number> { ... }
export function totalItems(dailyNews: DailyNews): number { ... }
export function archiveMetadata(
  summaries: ArchiveSnapshotSummary[],
  nextDate?: string
) { ... }
```

Date validation must reject impossible dates such as `2026-02-30`, not only malformed strings.

- [ ] **Step 5: Implement local archive files**

Store local archives under `data/newsletter-archive/<date>.json` with:

```ts
{
  dailyNews,
  lastRefresh,
  updatedAt
}
```

Add `readArchiveSnapshot`, `writeArchiveSnapshot`, and `listArchiveSnapshots` methods to `createFileStorage`.

- [ ] **Step 6: Implement atomic current-and-dated snapshot storage**

Extend `NewsSnapshotStorage`:

```ts
listArchiveSnapshots(): Promise<ArchiveSnapshotSummary[]>;
readArchiveSnapshot(date: string): Promise<ArchiveSnapshot | null>;
writeSuccessfulSnapshot(input: {
  date: string;
  dailyNews: DailyNews;
  lastRefresh: LastRefresh;
}): Promise<void>;
```

For Supabase, upsert `current` and the date row in one `.upsert([currentRow, datedRow])` call. Running/error `writeLastRefresh` updates only `current`. Successful rows share the same `daily_news` and `last_refresh` object values. List rows by date ID descending and exclude `current`.

- [ ] **Step 7: Run storage tests and verify GREEN**

Run:

```bash
npx vitest run tests/storage.test.ts tests/news/snapshotStorage.test.ts tests/news/calendar.test.ts
```

Expected: PASS.

### Task 5: Persist archive diagnostics from the refresh pipeline

**Files:**

- Modify: `lib/news/refreshPipeline.ts`
- Modify: `lib/news/refreshHandler.ts`
- Test: `tests/news/refreshPipeline.test.ts`
- Test: `tests/news/refreshHandler.test.ts`

- [ ] **Step 1: Write failing successful-snapshot tests**

Replace test storage mocks with the expanded interface. Assert successful refreshes call:

```ts
expect(storage.writeSuccessfulSnapshot).toHaveBeenCalledWith({
  date: "2026-06-12",
  dailyNews: result.dailyNews,
  lastRefresh: expect.objectContaining({
    debug: expect.objectContaining({
      archiveSnapshotDate: "2026-06-12",
      latestSnapshotDate: "2026-06-12",
      latestHistoricalSnapshotDate: "2026-06-12"
    })
  })
});
```

Assert `writeDailyNews` and `writeLastRefresh` are not used for the successful final write, while running/error status writes still update only current.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx vitest run tests/news/refreshPipeline.test.ts tests/news/refreshHandler.test.ts
```

Expected: FAIL because successful refreshes still perform separate writes.

- [ ] **Step 3: Compute archive metadata before persistence**

Read existing archive summaries, merge the canonical New York date into metadata, add the archive fields to `debug`, then call `writeSuccessfulSnapshot`.

If `lastRefreshDateAmericaNewYork` was not provided, derive it with `getAmericaNewYorkDateKey(now)`.

- [ ] **Step 4: Revalidate the calendar route after refresh**

Add:

```ts
options.revalidate("/calendar");
```

to the successful refresh handler.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run tests/news/refreshPipeline.test.ts tests/news/refreshHandler.test.ts
```

Expected: PASS.

### Task 6: Add Calendar API and refresh-status archive metadata

**Files:**

- Create: `app/api/news/calendar/route.ts`
- Modify: `app/api/news/refresh-status/route.ts`
- Create: `tests/news/calendar-route.test.ts`
- Modify: `tests/news/refresh-cron-source.test.ts`

- [ ] **Step 1: Write failing API tests**

Test:

- `GET /api/news/calendar` returns descending summaries and archive metadata.
- `GET /api/news/calendar?date=2026-06-25` returns the exact snapshot.
- a valid missing date returns HTTP 200 with `snapshot: null`.
- an invalid/impossible date returns HTTP 400.
- refresh status returns section counts, minimum flags, available archive count, latest snapshot date, and latest historical date.

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
npx vitest run tests/news/calendar-route.test.ts tests/news/refresh-cron-source.test.ts
```

Expected: FAIL because the route and fields do not exist.

- [ ] **Step 3: Implement the calendar route**

Use:

```ts
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (date && !isCalendarDate(date)) {
    return NextResponse.json({ error: "Invalid calendar date." }, { status: 400 });
  }

  if (date) {
    const snapshot = await newsSnapshotStorage.readArchiveSnapshot(date);
    return NextResponse.json({ date, snapshot });
  }

  const dates = await newsSnapshotStorage.listArchiveSnapshots();
  return NextResponse.json({ dates, ...archiveMetadata(dates) });
}
```

- [ ] **Step 4: Extend refresh status**

Return:

```ts
categoryCounts: lastRefresh.categoryCounts,
minimumMetByCategory: lastRefresh.debug?.minimumMetByCategory ?? {},
availableArchiveDatesCount: metadata.availableArchiveDatesCount,
latestSnapshotDate: metadata.latestSnapshotDate,
latestHistoricalSnapshotDate: metadata.latestHistoricalSnapshotDate,
rejectedBySalesPromotion: lastRefresh.debug?.rejectedBySalesPromotion ?? 0,
rejectedByLowQuality: lastRefresh.debug?.rejectedByLowQuality ?? 0
```

- [ ] **Step 5: Run API tests and verify GREEN**

Run:

```bash
npx vitest run tests/news/calendar-route.test.ts tests/news/refresh-cron-source.test.ts
```

Expected: PASS.

### Task 7: Add Calendar navigation and archive page

**Files:**

- Modify: `components/StickyHeader.tsx`
- Create: `components/CalendarArchive.tsx`
- Create: `app/calendar/page.tsx`
- Modify: `tests/navigation.test.tsx`
- Create: `tests/calendar/calendar-archive.test.tsx`
- Create: `tests/calendar/calendar-page-source.test.ts`

- [ ] **Step 1: Write failing navigation and component tests**

Assert a Calendar link exists:

```ts
expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
  "href",
  "/calendar"
);
```

Render `CalendarArchive` with two dates and an old archived article. Assert:

- both dates are visible
- selected date is identified
- section counts are visible
- archived article title and stored `whyItMatters` render
- no 72-hour freshness filtering removes the item
- missing snapshot renders a clean no-refresh state

- [ ] **Step 2: Run UI tests and verify RED**

Run:

```bash
npx vitest run tests/navigation.test.tsx tests/calendar/calendar-archive.test.tsx tests/calendar/calendar-page-source.test.ts
```

Expected: FAIL because Calendar UI does not exist.

- [ ] **Step 3: Add the Calendar navigation tab**

Import `CalendarDays` from `lucide-react` and add a link using the same existing button classes. Keep Auth and Gallery behavior unchanged.

- [ ] **Step 4: Implement `CalendarArchive`**

Render:

- responsive date links using `/calendar?date=YYYY-MM-DD`
- selected-date heading and total item count
- a compact section-count grid
- each category with stored items rendered through `NewsCard`
- archive-specific empty copy

Do not call `filterFreshNewsItems`.

- [ ] **Step 5: Implement the server page**

In `app/calendar/page.tsx`:

```ts
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
```

Load archive summaries, choose the requested valid date or latest date, read the selected snapshot, and pass data to `CalendarArchive`. Keep the existing editorial page shell and `StickyHeader alwaysVisible`.

- [ ] **Step 6: Run UI tests and verify GREEN**

Run:

```bash
npx vitest run tests/navigation.test.tsx tests/calendar/calendar-archive.test.tsx tests/calendar/calendar-page-source.test.ts
```

Expected: PASS.

### Task 8: Verify newsletter snapshot consistency

**Files:**

- Modify if needed: `app/api/cron/send-daily-emails/route.ts`
- Modify: `tests/email/send-daily-emails-source.test.ts`

- [ ] **Step 1: Add a snapshot-source regression assertion**

Assert the daily email route still reads:

```ts
newsSnapshotStorage.readDailyNews()
```

and does not read an archive date independently.

- [ ] **Step 2: Run the email source test**

Run:

```bash
npx vitest run tests/email/send-daily-emails-source.test.ts
```

Expected: PASS without production changes. If it fails, minimally restore the current-snapshot read.

### Task 9: Full verification and manual refresh

**Files:**

- No intended code changes.

- [ ] **Step 1: Run all focused tests**

Run:

```bash
npx vitest run tests/categories.test.ts tests/news/classify.test.ts tests/news/fetchArxiv.test.ts tests/news/fetchGithubRepos.test.ts tests/news/refreshPipeline.test.ts tests/storage.test.ts tests/news/snapshotStorage.test.ts tests/news/calendar.test.ts tests/news/calendar-route.test.ts tests/news/refreshHandler.test.ts tests/navigation.test.tsx tests/calendar/calendar-archive.test.tsx tests/calendar/calendar-page-source.test.ts tests/email/send-daily-emails-source.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run the complete test suite**

Run:

```bash
npm test
```

Expected: exit 0 with zero failing tests.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: exit 0 and routes include `/calendar` and `/api/news/calendar`.

- [ ] **Step 4: Attempt a local protected refresh**

Run:

```bash
npm run refresh:local
```

Capture:

- total candidate count
- selected count
- each required section count and minimum flag
- rejected sales/filler and low-quality counts
- archive date written
- source failures and underfilled reasons

If required environment variables or external services prevent a safe refresh, report the exact blocker without changing credentials.

- [ ] **Step 5: Run browser verification**

Start the production server and verify with the in-app browser:

- `/calendar` renders
- archive dates are visible
- clicking a date changes the grouped snapshot
- an unavailable valid date shows the empty state
- desktop and mobile have no horizontal overflow
- existing Newsletter, Learning, For You, Gallery, Calendar, and Account navigation still works

### Task 10: Review, commit, push, and deploy

**Files:**

- All changed implementation, test, and documentation files.

- [ ] **Step 1: Review the diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors and only in-scope files changed.

- [ ] **Step 2: Request code review**

Review the implementation against the approved design and acceptance criteria. Fix all critical and important findings, then rerun affected tests.

- [ ] **Step 3: Re-run final verification**

Run:

```bash
npm test
npm run build
```

Expected: both exit 0.

- [ ] **Step 4: Commit with the requested message**

Run:

```bash
git add .
git commit -m "Add refresh calendar and section minimums"
```

- [ ] **Step 5: Push the production branch**

Run:

```bash
git push origin feat/supabase-auth-email
```

- [ ] **Step 6: Confirm production deployment**

Check whether the push triggered Vercel production deployment. If it did not and the Vercel CLI/project linkage is available, deploy the committed branch to production without changing environment variables.

- [ ] **Step 7: Report**

Provide:

- section-minimum logic status
- source expansion status
- repository support status
- Calendar UI status
- archive storage approach
- API routes
- tests and build results
- refresh counts and underfill reasons
- archive date
- commit hash
- deployment URL

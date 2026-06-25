# Refresh Calendar and Section Minimums Design

## Scope

TechEveryday will attempt to select at least four current, educational items for each of these six main sections:

- Artificial Intelligence / Machine Learning
- Automation / Agentic Systems
- Embedded Systems
- Computer Systems
- Developer Tools / Open Source
- Cloud / Infrastructure

The existing Research Papers section remains available, but it is not part of the required six-section minimum. Selection quality remains a hard constraint: sales, promotions, deals, shopping content, buying guides, entertainment, culture filler, weak general technology news, and low-depth material remain rejected even when a section is below four.

The feature will be implemented on `feat/supabase-auth-email`, which contains the production Supabase snapshot storage, refresh status routes, email delivery, authentication, and the latest anti-filler pipeline changes.

## Selection and Source Expansion

Define `MIN_ITEMS_PER_SECTION = 4` for the six main sections. The initial candidate pass continues to combine trusted RSS sources, arXiv, GitHub repositories, optional NewsAPI results, and trusted X posts. Selection continues to apply the existing freshness, commercial-content, technical-depth, trust, category-fit, deduplication, and source-diversity checks.

After the first selection, only required sections below four enter targeted fallback discovery. Fallback discovery will:

1. Fetch deeper result windows from trusted sources explicitly configured for the underfilled category.
2. Fetch category-specific arXiv queries:
   - AI/ML: `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, `stat.ML`
   - Automation: agent/tool-use/task-planning terms across AI, ML, robotics, and software engineering categories
   - Embedded: `cs.RO`, `cs.SY`, `eess.SY`, and relevant architecture/hardware categories
   - Computer Systems: distributed systems, operating systems, architecture, performance, databases, networking, and software engineering categories
3. Run category-targeted GitHub repository discovery with the existing README quality checks and spam exclusions.

Fallback candidates pass through the same quality and freshness gates as initial candidates. The system will never lower quality thresholds to satisfy the count.

The final per-category display limit remains five, allowing sections to contain four or five items. Previous snapshot items may top up a section only when they are still within the existing 72-hour freshness window and still pass current trust and quality checks.

## Repository Items

The existing GitHub discovery implementation will be extended rather than replaced. Repository candidates must have a useful description and README, recent activity, meaningful adoption, and technical learning signals. Existing exclusions for wrappers, clones, templates, crypto hype, prompt packs, marketing, and starter spam remain in force.

Repository card data stays in the existing `NewsItem` shape:

- `title`: owner and repository name
- `sourceName`: GitHub
- `summary`: description, language, stars, forks, last-updated date, and README-derived technical summary
- `url`: repository link
- `category`: selected technical section
- `whyItMatters`: source-grounded learning value derived from the repository description and README

No unrelated card redesign is required.

## Diagnostics

Refresh diagnostics will include:

- selected count for every category
- `minimumMetByCategory` for the six required sections
- underfilled section details with attempted fallback, selected count, target count, and a concrete reason
- rejected sales/promotion count
- rejected consumer/filler count
- rejected low-technical-depth count
- rejected low-quality count
- fallback candidate counts by source type where available
- archive date written
- available archive date count
- latest snapshot date
- latest historical snapshot date

Underfilled reasons distinguish between insufficient fresh candidates, candidates rejected for quality, and fallback source failures. Diagnostics must not imply that filler was accepted.

The refresh status API will expose the same section counts and archive metadata.

## Snapshot Storage

Use the existing `newsletter_snapshots` table without a schema migration. Its text primary key and existing metadata columns support:

- `current`: latest homepage and newsletter snapshot
- `YYYY-MM-DD`: historical snapshot keyed by `last_refresh_date_america_new_york`

A successful refresh writes the same immutable-in-memory `DailyNews` and `LastRefresh` values to both `current` and the canonical date row. This keeps the homepage, archive, and daily email grounded in one selection result.

A forced refresh for an existing date intentionally upserts that date row and updates `updated_at`. Other historical rows are never mutated. Running/error status updates affect only `current`; a historical row is created or replaced only after successful selection.

The storage interface will add explicit operations to:

- write a successful current-and-dated snapshot
- list archive summaries
- read a snapshot by date
- read archive metadata

Local development and tests will use a file-backed archive directory so the same behavior can be verified without Supabase. Production continues to require Supabase persistence.

Historical reads sanitize commercial content defensively but do not rescore, rewrite, re-summarize, apply the 72-hour display filter, or mutate `whyItMatters`.

## Calendar API

Add `GET /api/news/calendar`.

Without a date parameter it returns:

- available refresh dates in descending order
- total item count per date
- section counts per date
- `updatedAt`
- latest snapshot date
- latest historical snapshot date

With `?date=YYYY-MM-DD` it validates the date and returns that exact dated snapshot plus counts. A valid date with no snapshot returns a successful empty result so the UI can render a clean no-refresh state. An invalid date returns HTTP 400.

The route uses server-only snapshot storage and does not expose Supabase credentials.

## Calendar UI

Add a top-level `Calendar` navigation tab and `/calendar` page using the existing beige, white, black, bordered editorial system.

The page reads the optional `date` query parameter. It shows:

- available archive dates as a responsive date list
- the selected date and total count
- counts for each section
- archived articles grouped by section
- a clean empty state for dates without a refresh

Current-day navigation resolves to the current refresh date when present. Archived cards render the stored snapshot exactly as selected on that day and do not apply current freshness filtering. Existing card behavior, transitions, responsive grids, and save controls are reused.

The header layout will add the Calendar control without changing authentication, account behavior, or unrelated navigation styling.

## Newsletter Consistency

Daily email generation continues to read the `current` snapshot. Because successful persistence writes `current` and the dated row from the same selected object, the email uses the same quality-filtered snapshot as the homepage and calendar.

No Resend, DNS, subscription, or authentication configuration changes are in scope.

## Failure Handling

- If fallback discovery fails for one source, record the source failure and continue with other source pools.
- If a section remains below four, publish the best qualifying items and record the reason.
- If successful snapshot persistence fails, the refresh fails rather than reporting a successful archive write.
- A failed refresh never creates or overwrites a dated historical snapshot.
- Missing archive dates return an empty state, not an application error.

## Testing and Verification

Tests will cover:

- four-item quota behavior for the six main sections
- Research Papers not being required for the quota
- targeted fallback execution for underfilled sections
- underfilled diagnostics and minimum-met flags
- sales, filler, and low-depth candidates remaining excluded
- repository normalization and spam rejection
- successful current and dated snapshot creation
- forced same-date upsert semantics
- latest snapshot behavior remaining intact
- archive date listing and date lookup
- missing and invalid date behavior
- Calendar navigation and grouped rendering
- historical rendering without the 72-hour filter
- refresh status archive metadata

Verification will run the focused tests during development, then the full test suite and `npm run build`. A local refresh will be attempted with available credentials and network access. Browser verification will cover `/calendar`, responsive layout, archive date selection, grouped sections, empty state, and existing navigation transitions.

After verification, changes will be committed as `Add refresh calendar and section minimums`, pushed to the production branch, and deployed through the existing Vercel workflow when automatic deployment is not confirmed.

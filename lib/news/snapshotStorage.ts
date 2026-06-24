import { createCategoryRecord } from "@/config/categories";
import { filterCommercialNewsItems } from "@/lib/news/commercialContent";
import { fileStorage } from "@/lib/storage";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";
import type { DailyNews, LastRefresh } from "@/types/news";

const SNAPSHOT_ID = "current";
const SNAPSHOT_TABLE = "newsletter_snapshots";
const LEGACY_SNAPSHOT_TABLE = "daily_news_snapshots";

export type NewsSnapshotStorage = {
  readDailyNews(): Promise<DailyNews>;
  writeDailyNews(dailyNews: DailyNews): Promise<void>;
  readLastRefresh(): Promise<LastRefresh>;
  writeLastRefresh(lastRefresh: LastRefresh): Promise<void>;
};

type SnapshotRow = {
  id: string;
  daily_news: DailyNews | null;
  last_refresh: LastRefresh | null;
};

type SnapshotMetadata = {
  latestSnapshotExists: boolean;
  latestSnapshotUpdatedAt: string | null;
  requiredTables: Record<string, boolean | null>;
  schemaReady: boolean | null;
  schemaError: string | null;
};

function productionWithoutPersistentStorage() {
  return process.env.NODE_ENV === "production" && !hasSupabaseSnapshotEnv();
}

function emptyDailyNews(): DailyNews {
  return {
    refreshedAt: new Date(0).toISOString(),
    timezone: REFRESH_TIME_ZONE,
    categories: createCategoryRecord(() => [])
  };
}

function filterDailyNews(dailyNews: DailyNews): DailyNews {
  return {
    ...dailyNews,
    categories: createCategoryRecord((categoryId) =>
      filterCommercialNewsItems(dailyNews.categories?.[categoryId] ?? [])
    )
  };
}

function emptyLastRefresh(
  message = "Persistent news storage is not configured. Add Supabase env vars and apply refresh migrations."
): LastRefresh {
  return {
    refreshedAt: null,
    nextRefreshAt: getNextRefreshAt().toISOString(),
    lastRefreshStartedAt: null,
    lastRefreshCompletedAt: null,
    lastRefreshDateAmericaNewYork: null,
    itemsFound: 0,
    itemsSelected: 0,
    errors: [message],
    failedSources: [],
    candidateCount: 0,
    categoryCounts: createCategoryRecord(() => 0),
    status: "error",
    message
  };
}

function hasSupabaseSnapshotEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function missingSupabaseSnapshotEnvVars() {
  return ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (name) => !process.env[name]?.trim()
  );
}

function requirePersistentStorageForProduction() {
  if (process.env.NODE_ENV === "production" && !hasSupabaseSnapshotEnv()) {
    throw new Error(
      "Persistent news storage is not configured. Add Supabase env vars and apply the newsletter_snapshots and refresh_runs migrations before running production refresh."
    );
  }
}

async function readSnapshotRow() {
  if (!hasSupabaseSnapshotEnv()) {
    return null;
  }

  try {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const modern = await admin
      .from(SNAPSHOT_TABLE)
      .select("id,daily_news,last_refresh")
      .eq("id", SNAPSHOT_ID)
      .maybeSingle();

    if (!modern.error) {
      return modern.data as SnapshotRow | null;
    }

    console.error("[news:snapshot] read_failed", { message: modern.error.message });

    const { data, error } = await admin
      .from(LEGACY_SNAPSHOT_TABLE)
      .select("id,daily_news,last_refresh")
      .eq("id", SNAPSHOT_ID)
      .maybeSingle();

    if (error) {
      console.error("[news:snapshot] read_failed", { message: error.message });
      return null;
    }

    return data as SnapshotRow | null;
  } catch (error) {
    console.error("[news:snapshot] read_failed", {
      message: error instanceof Error ? error.message : "Unknown snapshot read error."
    });
    return null;
  }
}

async function readSnapshotMetadata(): Promise<SnapshotMetadata> {
  if (!hasSupabaseSnapshotEnv()) {
    return {
      latestSnapshotExists: false,
      latestSnapshotUpdatedAt: null,
      requiredTables: {
        newsletter_snapshots: null,
        refresh_runs: null
      },
      schemaReady: false,
      schemaError: `Missing Supabase env vars: ${missingSupabaseSnapshotEnvVars().join(", ")}`
    };
  }

  try {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const snapshotCheck = await admin
      .from(SNAPSHOT_TABLE)
      .select("updated_at")
      .eq("id", SNAPSHOT_ID)
      .maybeSingle();
    const refreshRunsCheck = await admin.from("refresh_runs").select("id").limit(1);

    const requiredTables = {
      newsletter_snapshots: !snapshotCheck.error,
      refresh_runs: !refreshRunsCheck.error
    };
    const schemaReady = Object.values(requiredTables).every(Boolean);

    if (!schemaReady) {
      console.error("[news:snapshot] metadata_failed", {
        message: "Required Supabase refresh tables are missing or inaccessible."
      });
      return {
        latestSnapshotExists: false,
        latestSnapshotUpdatedAt: null,
        requiredTables,
        schemaReady: false,
        schemaError: "Required Supabase refresh tables are missing or inaccessible."
      };
    }

    return {
      latestSnapshotExists: Boolean(snapshotCheck.data),
      latestSnapshotUpdatedAt:
        snapshotCheck.data &&
        typeof snapshotCheck.data === "object" &&
        "updated_at" in snapshotCheck.data
          ? String(snapshotCheck.data.updated_at)
          : null,
      requiredTables,
      schemaReady,
      schemaError: null
    };
  } catch (error) {
    console.error("[news:snapshot] metadata_failed", {
      message: error instanceof Error ? error.message : "Unknown snapshot metadata error."
    });
    return {
      latestSnapshotExists: false,
      latestSnapshotUpdatedAt: null,
      requiredTables: {
        newsletter_snapshots: false,
        refresh_runs: false
      },
      schemaReady: false,
      schemaError: "Could not verify Supabase refresh tables."
    };
  }
}

async function recordRefreshRun(lastRefresh: LastRefresh) {
  if (!hasSupabaseSnapshotEnv()) {
    return;
  }

  try {
    const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("refresh_runs").insert({
      started_at: lastRefresh.lastRefreshStartedAt ?? null,
      completed_at: lastRefresh.lastRefreshCompletedAt ?? lastRefresh.refreshedAt ?? null,
      status: lastRefresh.status,
      trigger: lastRefresh.trigger ?? null,
      last_refresh_date_america_new_york:
        lastRefresh.lastRefreshDateAmericaNewYork ?? null,
      candidates_found: lastRefresh.itemsFound ?? lastRefresh.candidateCount ?? 0,
      items_selected:
        lastRefresh.itemsSelected ??
        Object.values(lastRefresh.categoryCounts ?? {}).reduce((sum, count) => sum + count, 0),
      failed_sources: lastRefresh.failedSources ?? [],
      safe_error_message: lastRefresh.errors?.at(-1) ?? null,
      category_counts: lastRefresh.categoryCounts ?? {},
      debug: lastRefresh.debug ?? {}
    });

    if (error) {
      console.error("[news:snapshot] refresh_run_write_failed", { message: error.message });
    }
  } catch (error) {
    console.error("[news:snapshot] refresh_run_write_failed", {
      message: error instanceof Error ? error.message : "Unknown refresh run write error."
    });
  }
}

async function upsertSnapshot(values: {
  dailyNews?: DailyNews;
  lastRefresh?: LastRefresh;
}) {
  requirePersistentStorageForProduction();

  if (!hasSupabaseSnapshotEnv()) {
    if (values.dailyNews) {
      await fileStorage.writeDailyNews(values.dailyNews);
    }

    if (values.lastRefresh) {
      await fileStorage.writeLastRefresh(values.lastRefresh);
    }

    return;
  }

  const existing = await readSnapshotRow();
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  const dailyNews =
    values.dailyNews ??
    existing?.daily_news ??
    (process.env.NODE_ENV === "production" ? emptyDailyNews() : await fileStorage.readDailyNews());
  const lastRefresh =
    values.lastRefresh ??
    existing?.last_refresh ??
    (process.env.NODE_ENV === "production"
      ? emptyLastRefresh("No Supabase newsletter snapshot exists. Run a protected refresh after applying refresh migrations.")
      : await fileStorage.readLastRefresh());
  const { error } = await admin.from(SNAPSHOT_TABLE).upsert({
    id: SNAPSHOT_ID,
    daily_news: dailyNews,
    last_refresh: lastRefresh,
    refreshed_at: dailyNews.refreshedAt,
    last_refresh_date_america_new_york:
      lastRefresh.lastRefreshDateAmericaNewYork ?? null,
    candidates_found: lastRefresh.itemsFound ?? lastRefresh.candidateCount ?? 0,
    items_selected:
      lastRefresh.itemsSelected ??
      Object.values(lastRefresh.categoryCounts ?? {}).reduce((sum, count) => sum + count, 0),
    failed_sources: lastRefresh.failedSources ?? [],
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Could not persist news snapshot: ${error.message}`);
  }

  if (values.lastRefresh) {
    await recordRefreshRun(values.lastRefresh);
  }
}

export const newsSnapshotStorage: NewsSnapshotStorage = {
  async readDailyNews() {
    if (productionWithoutPersistentStorage()) {
      return emptyDailyNews();
    }

    const snapshot = await readSnapshotRow();
    if (snapshot?.daily_news) {
      return filterDailyNews(snapshot.daily_news);
    }

    return process.env.NODE_ENV === "production" ? emptyDailyNews() : fileStorage.readDailyNews();
  },

  async writeDailyNews(dailyNews) {
    await upsertSnapshot({ dailyNews: filterDailyNews(dailyNews) });
  },

  async readLastRefresh() {
    if (productionWithoutPersistentStorage()) {
      return emptyLastRefresh();
    }

    const snapshot = await readSnapshotRow();
    if (snapshot?.last_refresh) {
      return snapshot.last_refresh;
    }

    return process.env.NODE_ENV === "production"
      ? emptyLastRefresh(
          "No Supabase newsletter snapshot exists. Run a protected refresh after applying refresh migrations."
        )
      : fileStorage.readLastRefresh();
  },

  async writeLastRefresh(lastRefresh) {
    await upsertSnapshot({ lastRefresh });
  }
};

export function snapshotStorageStatus() {
  const configured = hasSupabaseSnapshotEnv();

  return {
    persistentStorageConfigured: configured,
    storageBackend:
      configured ? "supabase" : process.env.NODE_ENV === "production" ? "unconfigured" : "local-json",
    missingEnvVars: missingSupabaseSnapshotEnvVars()
  };
}

export async function snapshotStorageMetadata() {
  return readSnapshotMetadata();
}

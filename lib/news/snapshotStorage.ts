import { fileStorage } from "@/lib/storage";
import type { DailyNews, LastRefresh } from "@/types/news";

const SNAPSHOT_ID = "current";

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

function hasSupabaseSnapshotEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function requirePersistentStorageForProduction() {
  if (process.env.NODE_ENV === "production" && !hasSupabaseSnapshotEnv()) {
    throw new Error(
      "Persistent news storage is not configured. Add Supabase env vars and apply the daily_news_snapshots migration before running production refresh."
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
    const { data, error } = await admin
      .from("daily_news_snapshots")
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
  const { error } = await admin.from("daily_news_snapshots").upsert({
    id: SNAPSHOT_ID,
    daily_news: values.dailyNews ?? existing?.daily_news ?? (await fileStorage.readDailyNews()),
    last_refresh:
      values.lastRefresh ?? existing?.last_refresh ?? (await fileStorage.readLastRefresh()),
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Could not persist news snapshot: ${error.message}`);
  }
}

export const newsSnapshotStorage: NewsSnapshotStorage = {
  async readDailyNews() {
    const snapshot = await readSnapshotRow();
    return snapshot?.daily_news ?? fileStorage.readDailyNews();
  },

  async writeDailyNews(dailyNews) {
    await upsertSnapshot({ dailyNews });
  },

  async readLastRefresh() {
    const snapshot = await readSnapshotRow();
    return snapshot?.last_refresh ?? fileStorage.readLastRefresh();
  },

  async writeLastRefresh(lastRefresh) {
    await upsertSnapshot({ lastRefresh });
  }
};

export function snapshotStorageStatus() {
  return {
    persistentStorageConfigured: hasSupabaseSnapshotEnv(),
    storageBackend: hasSupabaseSnapshotEnv() ? "supabase" : "local-json"
  };
}

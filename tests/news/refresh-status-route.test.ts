import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";

const readLastRefresh = vi.hoisted(() => vi.fn());
const listArchiveSnapshots = vi.hoisted(() => vi.fn());

vi.mock("@/lib/news/snapshotStorage", () => ({
  newsSnapshotStorage: {
    readLastRefresh,
    listArchiveSnapshots
  },
  snapshotStorageMetadata: vi.fn(async () => ({
    latestSnapshotExists: true,
    latestSnapshotUpdatedAt: "2026-06-25T11:00:00.000Z",
    requiredTables: {
      newsletter_snapshots: true,
      refresh_runs: true
    },
    schemaReady: true,
    schemaError: null
  })),
  snapshotStorageStatus: vi.fn(() => ({
    persistentStorageConfigured: true,
    storageBackend: "supabase",
    missingEnvVars: []
  }))
}));

import { GET } from "@/app/api/news/refresh-status/route";

describe("refresh status archive diagnostics", () => {
  beforeEach(() => {
    readLastRefresh.mockResolvedValue({
      refreshedAt: "2026-06-25T11:00:00.000Z",
      lastRefreshDateAmericaNewYork: "2026-06-25",
      nextRefreshAt: "2026-06-26T11:00:00.000Z",
      candidateCount: 30,
      categoryCounts: {
        ...createCategoryRecord(() => 0),
        "ai-ml": 4,
        "cloud-infrastructure": 3
      },
      status: "success",
      debug: {
        minimumMetByCategory: {
          "ai-ml": true,
          "automation-agentic-systems": false,
          "embedded-systems": false,
          "computer-systems": false,
          "developer-tools-open-source": false,
          "cloud-infrastructure": false
        },
        rejectedBySalesPromotion: 5,
        rejectedByLowQuality: 7,
        rejectedByLowTechnicalDepth: 4
      }
    });
    listArchiveSnapshots.mockResolvedValue([
      {
        date: "2026-06-25",
        itemCount: 20,
        sectionCounts: createCategoryRecord(() => 0),
        updatedAt: "2026-06-25T11:00:00.000Z"
      }
    ]);
  });

  it("returns section minimums, rejection counts, and archive dates", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      categoryCounts: expect.objectContaining({
        "ai-ml": 4,
        "cloud-infrastructure": 3
      }),
      minimumMetByCategory: expect.objectContaining({
        "ai-ml": true,
        "cloud-infrastructure": false
      }),
      rejectedBySalesPromotion: 5,
      rejectedByLowQuality: 7,
      rejectedByLowTechnicalDepth: 4,
      availableArchiveDatesCount: 1,
      latestSnapshotDate: "2026-06-25",
      latestHistoricalSnapshotDate: "2026-06-25"
    });
  });
});

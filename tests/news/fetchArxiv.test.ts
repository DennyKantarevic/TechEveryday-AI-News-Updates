import { afterEach, describe, expect, it, vi } from "vitest";
import { REQUIRED_SECTION_IDS } from "@/config/categories";
import {
  arxivCategoryRequestUrl,
  fetchArxivCategoryCandidates,
  fetchArxivPapers
} from "@/lib/news/fetchArxiv";
import type { CategoryId } from "@/config/categories";

type FeedEntry = {
  id: string;
  title: string;
  summary: string;
  categories: string[];
};

function entryXml(entry: FeedEntry) {
  return `<entry>
    <id>https://arxiv.org/abs/${entry.id}</id>
    <title>${entry.title}</title>
    <summary>${entry.summary}</summary>
    <published>2026-06-12T08:00:00Z</published>
    <author><name>Technical Researcher</name></author>
    <link href="https://arxiv.org/abs/${entry.id}" rel="alternate" type="text/html" />
    ${entry.categories.map((category) => `<category term="${category}" />`).join("\n")}
  </entry>`;
}

function arxivFeed(entries: FeedEntry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      ${entries.map(entryXml).join("\n")}
    </feed>`;
}

const routingCases: Array<{
  name: string;
  entry: FeedEntry;
  expected: CategoryId;
}> = [
  {
    name: "routes agentic AI papers before generic AI",
    entry: {
      id: "2606.00001",
      title: "Reliable tool-use planning for language model agents",
      summary:
        "An agentic evaluation with autonomous tool use, workflow benchmarks, and implementation details.",
      categories: ["cs.AI", "cs.CL"]
    },
    expected: "automation-agentic-systems"
  },
  ...["cs.AI", "cs.LG", "cs.CL", "cs.CV", "stat.ML"].map((category, index) => ({
    name: `routes non-agentic ${category} papers to AI and ML`,
    entry: {
      id: `2606.001${index}`,
      title: `Model evaluation benchmark ${index}`,
      summary:
        "A machine learning study with model training, inference evaluation, datasets, and benchmark results.",
      categories: [category]
    },
    expected: "ai-ml" as const
  })),
  ...["cs.RO", "cs.SY", "eess.SY"].map((category, index) => ({
    name: `routes ${category} papers to embedded systems`,
    entry: {
      id: `2606.002${index}`,
      title: `Embedded control benchmark ${index}`,
      summary:
        "A firmware and sensor control study with hardware constraints, timing analysis, and implementation details.",
      categories: [category]
    },
    expected: "embedded-systems" as const
  })),
  ...["cs.DC", "cs.OS", "cs.AR", "cs.PF"].map((category, index) => ({
    name: `routes ${category} papers to computer systems`,
    entry: {
      id: `2606.003${index}`,
      title: `Systems architecture benchmark ${index}`,
      summary:
        "A distributed runtime study with storage architecture, scheduler performance, and implementation details.",
      categories: [category]
    },
    expected: "computer-systems" as const
  })),
  {
    name: "routes relevant systems terms without a systems tag",
    entry: {
      id: "2606.00040",
      title: "Kernel scheduler design for distributed storage runtimes",
      summary:
        "The paper evaluates operating system memory, database storage, scheduler latency, and runtime architecture.",
      categories: ["cs.HC"]
    },
    expected: "computer-systems"
  },
  {
    name: "keeps cs.SE developer tooling in developer tools",
    entry: {
      id: "2606.00041",
      title: "A compiler debugging toolkit for reproducible software testing",
      summary:
        "The open source developer tool provides a CLI, SDK, benchmark suite, and implementation guide.",
      categories: ["cs.SE"]
    },
    expected: "developer-tools-open-source"
  },
  {
    name: "leaves unmatched research in research papers",
    entry: {
      id: "2606.00042",
      title: "A longitudinal study of collaborative interface preferences",
      summary:
        "A controlled research study reports participant methodology and statistically evaluated findings.",
      categories: ["cs.HC"]
    },
    expected: "research-papers"
  }
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchArxivPapers category routing", () => {
  it.each(routingCases)("$name", async ({ entry, expected }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(arxivFeed([entry]), { status: 200 }))
    );

    const items = await fetchArxivPapers({
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(items).toHaveLength(1);
    expect(items[0].category).toBe(expected);
  });
});

describe("targeted arXiv discovery", () => {
  it("builds distinct valid category-specific requests capped near sixty results", () => {
    const urls = REQUIRED_SECTION_IDS.map((categoryId) => {
      const url = new URL(arxivCategoryRequestUrl(categoryId));

      expect(url.origin).toBe("https://export.arxiv.org");
      expect(url.pathname).toBe("/api/query");
      expect(url.searchParams.get("search_query")).toBeTruthy();
      expect(url.searchParams.get("start")).toBe("0");
      expect(Number(url.searchParams.get("max_results"))).toBeGreaterThanOrEqual(50);
      expect(Number(url.searchParams.get("max_results"))).toBeLessThanOrEqual(60);
      expect(url.searchParams.get("sortBy")).toBe("submittedDate");
      expect(url.searchParams.get("sortOrder")).toBe("descending");

      return url;
    });

    expect(new Set(urls.map((url) => url.searchParams.get("search_query"))).size).toBe(
      REQUIRED_SECTION_IDS.length
    );
    expect(urls[0].searchParams.get("search_query")).toMatch(/cat:cs\.AI/);
    expect(urls[0].searchParams.get("search_query")).toMatch(/cat:stat\.ML/);
    expect(urls[0].searchParams.get("search_query")).not.toMatch(/cat:cs\.RO/);
    expect(
      urls
        .find((url) => url.searchParams.get("search_query")?.includes("cloud computing"))
        ?.searchParams.get("search_query")
    ).toMatch(/cloud computing|serverless|kubernetes/);
  });

  it("returns only candidates routed to the requested required section", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          arxivFeed([
            {
              id: "2606.01001",
              title: "Efficient vision model evaluation with calibrated uncertainty",
              summary:
                "A computer vision model evaluation with training datasets, inference benchmarks, and implementation details.",
              categories: ["cs.CV"]
            },
            {
              id: "2606.01002",
              title: "Tool-use memory for autonomous language model agents",
              summary:
                "An agentic workflow study with autonomous tool use, evaluation benchmarks, and implementation details.",
              categories: ["cs.AI"]
            },
            {
              id: "2606.01003",
              title: "Kernel scheduling for storage clusters",
              summary:
                "A systems paper about kernel scheduling, distributed storage architecture, and benchmark results.",
              categories: ["cs.OS"]
            }
          ]),
          { status: 200 }
        )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchArxivCategoryCandidates({
      categoryId: "ai-ml",
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(fetchMock).toHaveBeenCalledWith(
      arxivCategoryRequestUrl("ai-ml"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("TechEveryday")
        })
      })
    );
    expect(result.failure).toBeUndefined();
    expect(result.items.map((item) => item.url)).toEqual(["https://arxiv.org/abs/2606.01001"]);
    expect(result.items.every((item) => item.category === "ai-ml")).toBe(true);
  });

  it("reports non-OK targeted responses without treating them as a successful empty feed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("Service unavailable", {
            status: 503,
            statusText: "Service Unavailable"
          })
      )
    );

    const result = await fetchArxivCategoryCandidates({
      categoryId: "computer-systems",
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(result.items).toEqual([]);
    expect(result.failure).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/503.*service unavailable/i)
      })
    );
  });

  it("reports thrown fetch and invalid XML failures for targeted requests", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("arXiv socket reset"))
      .mockResolvedValueOnce(new Response("<feed><entry>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const fetchFailure = await fetchArxivCategoryCandidates({
      categoryId: "computer-systems",
      now: new Date("2026-06-12T12:00:00.000Z")
    });
    const parseFailure = await fetchArxivCategoryCandidates({
      categoryId: "computer-systems",
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(fetchFailure.items).toEqual([]);
    expect(fetchFailure.failure).toEqual(
      expect.objectContaining({ message: "arXiv socket reset" })
    );
    expect(parseFailure.items).toEqual([]);
    expect(parseFailure.failure).toEqual(
      expect.objectContaining({ message: expect.stringMatching(/invalid xml/i) })
    );
  });

  it("treats a valid empty targeted feed as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(arxivFeed([]), { status: 200 }))
    );

    const result = await fetchArxivCategoryCandidates({
      categoryId: "computer-systems",
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(result).toEqual({ items: [] });
  });
});

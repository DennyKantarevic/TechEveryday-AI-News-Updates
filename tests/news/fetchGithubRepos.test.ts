import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGithubRepositories } from "@/lib/news/fetchGithubRepos";

function githubResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchGithubRepositories", () => {
  it("returns only recent educational repositories with meaningful README context", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/search/repositories")) {
        return githubResponse({
          items: [
            {
              id: 1,
              name: "runtime-tracer",
              full_name: "systems-lab/runtime-tracer",
              owner: { login: "systems-lab" },
              html_url: "https://github.com/systems-lab/runtime-tracer",
              description:
                "Open source Rust runtime tracing with scheduler instrumentation and p99 latency examples",
              language: "Rust",
              stargazers_count: 2840,
              forks_count: 210,
              updated_at: "2026-06-12T10:00:00.000Z",
              pushed_at: "2026-06-12T10:00:00.000Z",
              topics: ["rust", "runtime", "tracing", "observability"]
            },
            {
              id: 2,
              name: "chatgpt-wrapper-template",
              full_name: "growth-lab/chatgpt-wrapper-template",
              owner: { login: "growth-lab" },
              html_url: "https://github.com/growth-lab/chatgpt-wrapper-template",
              description: "A template for launching your AI wrapper startup fast",
              language: "TypeScript",
              stargazers_count: 55,
              forks_count: 2,
              updated_at: "2026-06-12T10:00:00.000Z",
              pushed_at: "2026-06-12T10:00:00.000Z",
              topics: ["template", "startup", "chatgpt-wrapper"]
            }
          ]
        });
      }

      if (url.includes("/repos/systems-lab/runtime-tracer/readme")) {
        return githubResponse({
          content: Buffer.from(
            "Runtime Tracer explains scheduler instrumentation, distributed tracing, benchmark setup, p99 latency analysis, architecture diagrams, and production debugging workflows."
          ).toString("base64"),
          encoding: "base64"
        });
      }

      if (url.includes("/repos/growth-lab/chatgpt-wrapper-template/readme")) {
        return githubResponse({
          content: Buffer.from("Clone this template to launch an AI wrapper business.").toString(
            "base64"
          ),
          encoding: "base64"
        });
      }

      return githubResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchGithubRepositories({
      now: new Date("2026-06-12T13:00:00.000Z"),
      perCategoryLimit: 2,
      maxReadmes: 4
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "systems-lab/runtime-tracer",
      sourceName: "GitHub",
      sourceType: "repo",
      category: "developer-tools-open-source"
    });
    expect(items[0].summary).toContain("Language: Rust");
    expect(items[0].summary).toContain("Stars: 2840");
    expect(items[0].whyItMatters).toMatch(/scheduler instrumentation|p99 latency/i);
    expect(items[0].tags).toEqual(
      expect.arrayContaining(["github", "repository", "rust", "runtime"])
    );
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes("/search/repositories"))
    ).toHaveLength(6);
  });

  it("runs only requested discovery queries while preserving repository quality gates", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/search/repositories")) {
        return githubResponse({
          items: [
            {
              id: 10,
              name: "storage-kernel",
              full_name: "systems-lab/storage-kernel",
              owner: { login: "systems-lab" },
              html_url: "https://github.com/systems-lab/storage-kernel",
              description:
                "Distributed storage kernel with scheduler benchmarks and database architecture notes",
              language: "Rust",
              stargazers_count: 1840,
              forks_count: 190,
              updated_at: "2026-06-12T10:30:00.000Z",
              pushed_at: "2026-06-12T10:30:00.000Z",
              topics: ["kernel", "storage", "distributed-systems"]
            },
            {
              id: 11,
              name: "old-kernel",
              full_name: "systems-lab/old-kernel",
              owner: { login: "systems-lab" },
              html_url: "https://github.com/systems-lab/old-kernel",
              description: "Storage kernel architecture and performance benchmarks",
              language: "C",
              stargazers_count: 4200,
              forks_count: 320,
              updated_at: "2026-06-01T10:30:00.000Z",
              pushed_at: "2026-06-01T10:30:00.000Z",
              topics: ["kernel", "storage"]
            },
            {
              id: 12,
              name: "undocumented-kernel",
              full_name: "systems-lab/undocumented-kernel",
              owner: { login: "systems-lab" },
              html_url: "https://github.com/systems-lab/undocumented-kernel",
              description: null,
              language: "C",
              stargazers_count: 950,
              forks_count: 75,
              updated_at: "2026-06-12T10:30:00.000Z",
              pushed_at: "2026-06-12T10:30:00.000Z",
              topics: ["kernel"]
            },
            {
              id: 13,
              name: "tiny-kernel",
              full_name: "systems-lab/tiny-kernel",
              owner: { login: "systems-lab" },
              html_url: "https://github.com/systems-lab/tiny-kernel",
              description: "Storage kernel architecture and performance benchmarks",
              language: "C",
              stargazers_count: 18,
              forks_count: 3,
              updated_at: "2026-06-12T10:30:00.000Z",
              pushed_at: "2026-06-12T10:30:00.000Z",
              topics: ["kernel", "storage"]
            },
            {
              id: 14,
              name: "kernel-template",
              full_name: "growth-lab/kernel-template",
              owner: { login: "growth-lab" },
              html_url: "https://github.com/growth-lab/kernel-template",
              description: "A starter template for cloning a storage project",
              language: "C",
              stargazers_count: 2800,
              forks_count: 440,
              updated_at: "2026-06-12T10:30:00.000Z",
              pushed_at: "2026-06-12T10:30:00.000Z",
              topics: ["template", "starter"]
            },
            {
              id: 15,
              name: "thin-docs-kernel",
              full_name: "systems-lab/thin-docs-kernel",
              owner: { login: "systems-lab" },
              html_url: "https://github.com/systems-lab/thin-docs-kernel",
              description: "A storage kernel with architecture notes",
              language: "C",
              stargazers_count: 780,
              forks_count: 82,
              updated_at: "2026-06-12T10:30:00.000Z",
              pushed_at: "2026-06-12T10:30:00.000Z",
              topics: ["kernel", "storage"]
            }
          ]
        });
      }

      if (url.includes("/repos/systems-lab/storage-kernel/readme")) {
        return githubResponse({
          content: Buffer.from(
            "Storage Kernel documents its distributed architecture, database protocol, scheduler benchmark methodology, latency and performance results, production storage tradeoffs, and testing strategy."
          ).toString("base64"),
          encoding: "base64"
        });
      }

      if (url.includes("/repos/systems-lab/thin-docs-kernel/readme")) {
        return githubResponse({
          content: Buffer.from("Small storage project.").toString("base64"),
          encoding: "base64"
        });
      }

      return githubResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGithubRepositories({
      now: new Date("2026-06-12T13:00:00.000Z"),
      categoryIds: ["computer-systems", "computer-systems"],
      perCategoryLimit: 10,
      maxReadmes: 10
    });

    const searchCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("/search/repositories"));
    expect(searchCalls).toHaveLength(1);
    const searchUrl = new URL(searchCalls[0]);
    expect(searchUrl.searchParams.get("q")).toMatch(
      /operating system kernel database compiler runtime distributed systems storage scheduler/
    );
    expect(searchUrl.searchParams.get("q")).not.toMatch(/kubernetes|agent workflow|machine learning/);

    expect(result.failure).toBeUndefined();
    const items = result.items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "systems-lab/storage-kernel",
      url: "https://github.com/systems-lab/storage-kernel",
      category: "computer-systems",
      sourceName: "GitHub",
      sourceType: "repo"
    });
    expect(items[0].summary).toContain(
      "Description: Distributed storage kernel with scheduler benchmarks and database architecture notes"
    );
    expect(items[0].summary).toContain("Language: Rust");
    expect(items[0].summary).toContain("Stars: 1840");
    expect(items[0].summary).toContain("Last updated: 2026-06-12");
    expect(items[0].whyItMatters).toMatch(
      /distributed architecture|scheduler benchmark methodology|production storage tradeoffs/i
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/repos/systems-lab/old-kernel/readme")
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/repos/growth-lab/kernel-template/readme")
    );
  });

  it("reports non-OK targeted search responses without treating them as zero matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("Rate limited", {
            status: 403,
            statusText: "Forbidden"
          })
      )
    );

    const result = await fetchGithubRepositories({
      now: new Date("2026-06-12T13:00:00.000Z"),
      categoryIds: ["computer-systems"]
    });

    expect(result.items).toEqual([]);
    expect(result.failure).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/403.*forbidden/i)
      })
    );
  });

  it("reports thrown fetch and JSON parse failures for targeted searches", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("GitHub socket reset"))
      .mockResolvedValueOnce(new Response("{", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const fetchFailure = await fetchGithubRepositories({
      now: new Date("2026-06-12T13:00:00.000Z"),
      categoryIds: ["computer-systems"]
    });
    const parseFailure = await fetchGithubRepositories({
      now: new Date("2026-06-12T13:00:00.000Z"),
      categoryIds: ["computer-systems"]
    });

    expect(fetchFailure.items).toEqual([]);
    expect(fetchFailure.failure).toEqual(
      expect.objectContaining({ message: "GitHub socket reset" })
    );
    expect(parseFailure.items).toEqual([]);
    expect(parseFailure.failure).toBeInstanceOf(Error);
  });

  it("treats a successful targeted search with no matches as success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => githubResponse({ items: [] })));

    const result = await fetchGithubRepositories({
      now: new Date("2026-06-12T13:00:00.000Z"),
      categoryIds: ["computer-systems"]
    });

    expect(result).toEqual({ items: [] });
  });
});

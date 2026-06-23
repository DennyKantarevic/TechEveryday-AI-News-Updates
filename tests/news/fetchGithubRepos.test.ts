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
  });
});

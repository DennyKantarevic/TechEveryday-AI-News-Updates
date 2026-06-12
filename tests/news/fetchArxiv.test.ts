import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArxivPapers } from "@/lib/news/fetchArxiv";

const arxivFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>https://arxiv.org/abs/2606.00001</id>
    <title>Distributed runtime scheduling for storage clusters</title>
    <summary>A technical paper with distributed systems architecture, storage benchmarks, runtime scheduling, and implementation details.</summary>
    <published>2026-06-12T08:00:00Z</published>
    <author><name>Systems Researcher</name></author>
    <link href="https://arxiv.org/abs/2606.00001" rel="alternate" type="text/html" />
    <category term="cs.DC" />
  </entry>
  <entry>
    <id>https://arxiv.org/abs/2606.00002</id>
    <title>Robot firmware policy learning under power constraints</title>
    <summary>A robotics paper covering embedded control, firmware constraints, sensor timing, power use, and benchmark evaluation.</summary>
    <published>2026-06-12T08:00:00Z</published>
    <author><name>Robotics Researcher</name></author>
    <link href="https://arxiv.org/abs/2606.00002" rel="alternate" type="text/html" />
    <category term="cs.RO" />
  </entry>
  <entry>
    <id>https://arxiv.org/abs/2606.00003</id>
    <title>Memory Evolution for Robust LLM Agents in Dynamic Environments</title>
    <summary>A technical agentic systems paper about autonomous LLM agents, tool use, memory workflows, benchmarks, and dynamic task environments.</summary>
    <published>2026-06-12T08:00:00Z</published>
    <author><name>Agent Researcher</name></author>
    <link href="https://arxiv.org/abs/2606.00003" rel="alternate" type="text/html" />
    <category term="cs.CL" />
  </entry>
</feed>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchArxivPapers", () => {
  it("routes systems and robotics papers into matching technical sections", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(arxivFeed, { status: 200 })));

    const items = await fetchArxivPapers({
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(items.find((item) => item.url === "https://arxiv.org/abs/2606.00001")?.category).toBe(
      "computer-systems"
    );
    expect(items.find((item) => item.url === "https://arxiv.org/abs/2606.00002")?.category).toBe(
      "embedded-systems"
    );
    expect(items.find((item) => item.url === "https://arxiv.org/abs/2606.00003")?.category).toBe(
      "automation-agentic-systems"
    );
  });
});

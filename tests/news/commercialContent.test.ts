import { describe, expect, it } from "vitest";
import { classifyCommercialContent } from "@/lib/news/commercialContent";
import type { NewsItem } from "@/types/news";

function makeItem(title: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    canonicalUrl: `https://example.com/${encodeURIComponent(title)}`,
    sourceName: "Technical Source",
    sourceType: "blog",
    summary: "A detailed technical explanation with implementation notes and measured results.",
    publishedAt: "2026-06-24T12:00:00.000Z",
    foundAt: "2026-06-24T12:00:00.000Z",
    category: "computer-systems",
    trustScore: 0.9,
    freshnessScore: 4,
    technicalDepthScore: 3,
    educationalScore: 3,
    practicalUsefulnessScore: 3,
    noveltyScore: 1,
    finalScore: 4,
    saved: false,
    tags: ["systems", "engineering"],
    keyClaims: ["The source explains a concrete technical result."],
    whyItMatters:
      "The implementation details explain a concrete systems tradeoff and how engineers can reproduce the result.",
    ...overrides
  };
}

describe("classifyCommercialContent", () => {
  it.each([
    ["Best Prime Day laptop deals under $500", "shopping_or_deal"],
    ["Amazon Prime Day deal: save 40% on smart home gadgets", "shopping_or_deal"],
    ["The best phones to buy right now", "consumer_buying_guide"],
    ["Limited-time offer on AI coding tools", "sales_or_promotion"],
    ["Black Friday monitor deals", "shopping_or_deal"],
    ["Cyber Monday robot vacuum sale", "shopping_or_deal"],
    ["Best Buy drops prices on gaming laptops", "shopping_or_deal"],
    ["Our favorite gadgets are on sale", "shopping_or_deal"],
    ["Best budget headphones under $100", "consumer_buying_guide"],
    ["Where to preorder the new GPU", "consumer_buying_guide"],
    ["Summer sale on developer tools", "shopping_or_deal"],
    ["Best gadgets for developers", "consumer_buying_guide"],
    ["Sponsored technical tooling roundup", "sales_or_promotion"],
    ["Shopping for the best laptop this summer", "consumer_buying_guide"]
  ])("rejects %s", (title, reasonCode) => {
    expect(classifyCommercialContent(makeItem(title))).toMatchObject({
      rejected: true,
      reasonCode
    });
  });

  it.each([
    ["https://example.com/deals/gpu", "shopping_or_deal"],
    ["https://example.com/coupons/cloud", "shopping_or_deal"],
    ["https://example.com/shopping/laptops", "shopping_or_deal"],
    ["https://example.com/gift-guide/developers", "consumer_buying_guide"],
    ["https://example.com/buying-guide/monitors", "consumer_buying_guide"],
    ["https://example.com/reviews/new-phone", "consumer_buying_guide"],
    ["https://example.com/best-laptops", "consumer_buying_guide"],
    ["https://example.com/article?utm_affiliate=partner", "sales_or_promotion"]
  ])("rejects commercial URL %s", (url, reasonCode) => {
    expect(
      classifyCommercialContent(makeItem("Technical article", { url, canonicalUrl: url }))
    ).toMatchObject({
      rejected: true,
      reasonCode
    });
  });

  it.each([
    "A technical deep dive into GPU memory scheduling",
    "New arXiv paper improves robot manipulation planning",
    "Cloudflare explains how it mitigated a routing incident",
    "GitHub repository for a new open-source observability engine",
    "NVIDIA technical blog on CUDA kernel optimization",
    "Research paper on efficient transformer inference",
    "Kubernetes SIG releases technical notes on scheduler changes"
  ])("accepts educational item %s", (title) => {
    expect(classifyCommercialContent(makeItem(title))).toEqual({
      rejected: false
    });
  });

  it("does not block ambiguous technical uses without commercial context", () => {
    const technicalItems = [
      makeItem("The protocol offers lower latency under packet loss"),
      makeItem("SALE: Scalable Approximate Linear Estimation for GPU kernels", {
        sourceName: "arXiv",
        sourceType: "paper",
        url: "https://arxiv.org/abs/2606.12345",
        canonicalUrl: "https://arxiv.org/abs/2606.12345"
      }),
      makeItem("A CommonMark-compatible Markdown parser for embedded devices")
    ];

    for (const item of technicalItems) {
      expect(classifyCommercialContent(item)).toEqual({ rejected: false });
    }
  });

  it("preserves technical work that studies commercial domains without selling anything", () => {
    const technicalItems = [
      makeItem("Toward More Controllable AI Video Editing", {
        sourceName: "Netflix Tech Blog",
        sourceType: "blog",
        summary:
          "The research system generates promotional assets such as trailers, with architecture and evaluation details."
      }),
      makeItem("Paying to Know: Markets for Verified Product Information", {
        sourceName: "arXiv",
        sourceType: "paper",
        summary:
          "The paper studies a shopping chatbot and how an autonomous agent can verify information before a sale."
      })
    ];

    for (const item of technicalItems) {
      expect(classifyCommercialContent(item)).toEqual({ rejected: false });
    }
  });

  it("rejects exact commercial feed tags even when the title is neutral", () => {
    expect(
      classifyCommercialContent(
        makeItem("New developer tool release", {
          tags: ["developer-tools-open-source", "deal"]
        })
      )
    ).toMatchObject({
      rejected: true,
      reasonCode: "shopping_or_deal"
    });
  });
});

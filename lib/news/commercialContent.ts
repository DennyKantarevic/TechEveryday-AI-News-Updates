import type { NewsItem } from "@/types/news";

export type CommercialRejectionCode =
  | "sales_or_promotion"
  | "shopping_or_deal"
  | "consumer_buying_guide";

export type CommercialContentResult =
  | { rejected: false }
  | {
      rejected: true;
      reasonCode: CommercialRejectionCode;
      reason: string;
      matchedSignal: string;
    };

type CommercialContentInput = Pick<
  NewsItem,
  "title" | "summary" | "sourceName" | "tags" | "url" | "canonicalUrl"
> & {
  excerpt?: string;
  sourceMetadata?: string;
};

type CommercialRule = {
  code: CommercialRejectionCode;
  label: string;
  pattern: RegExp;
};

type CommercialTagRule = Omit<CommercialRule, "pattern"> & {
  tags: Set<string>;
};

const URL_RULES: CommercialRule[] = [
  {
    code: "shopping_or_deal",
    label: "deal, coupon, or shopping URL path",
    pattern: /\/(?:deals?|coupons?|shopping)(?:\/|$)/
  },
  {
    code: "consumer_buying_guide",
    label: "gift guide, buying guide, review, or best-product URL path",
    pattern: /\/(?:gift-guide|buying-guide|reviews|best-)(?:\/|[^/?#]*)/
  },
  {
    code: "sales_or_promotion",
    label: "affiliate URL marker",
    pattern: /(?:affiliate|utm_affiliate)/
  }
];

const BUYING_GUIDE_RULES: CommercialRule[] = [
  {
    code: "consumer_buying_guide",
    label: "buying or buyer's guide",
    pattern: /\b(?:buying guide|buyer['’]s guide|buyers guide|buying advice)\b/
  },
  {
    code: "consumer_buying_guide",
    label: "gift guide",
    pattern: /\b(?:gift guide|holiday gift)\b/
  },
  {
    code: "consumer_buying_guide",
    label: "consumer product recommendation",
    pattern:
      /\b(?:shopping for|shopping guide|best gadgets|best (?:laptops?|phones?|gadgets?|headphones?|monitors?|tablets?|smartwatches?) (?:to buy|right now)|best budget (?:laptops?|phones?|gadgets?|headphones?|monitors?|tablets?)|budget pick|product roundups?|where to buy|where to preorder)\b/
  },
  {
    code: "consumer_buying_guide",
    label: "preorder purchasing advice",
    pattern: /\b(?:pre-?order|buy now)\b/
  },
  {
    code: "consumer_buying_guide",
    label: "price-tier purchasing advice",
    pattern: /\bunder\s+\$\s*(?:50|100|500)\b/
  }
];

const DEAL_RULES: CommercialRule[] = [
  {
    code: "shopping_or_deal",
    label: "retail sales event",
    pattern:
      /\b(?:amazon )?prime day\b|\bblack friday\b|\bcyber monday\b|\b(?:memorial|labor) day sale\b|\bback-to-school sale\b|\b(?:summer|holiday|seasonal|flash|sitewide) sale\b/
  },
  {
    code: "shopping_or_deal",
    label: "deal or discount",
    pattern:
      /\b(?:deals|discount|discounted|coupon|bargain|clearance|retail event|retail outlet|lightning deal|bundle deal|refurbished deal|sponsored deal)\b/
  },
  {
    code: "shopping_or_deal",
    label: "price reduction",
    pattern:
      /\b(?:price drop|price cut|best price|lowest price|cheapest|drops? prices?|cuts? prices?|price match|save on|sale on|on sale|for sale)\b/
  },
  {
    code: "shopping_or_deal",
    label: "percentage or dollar savings",
    pattern:
      /(?:\b\d{1,3}\s*%\s*off\b|\b\d+(?:\.\d{1,2})?\s+dollars?\s+off\b|\bsave\s+\$\s*\d+\b|\bsave\s+\d{1,3}\s*percent\b)/
  },
  {
    code: "shopping_or_deal",
    label: "commercial deal context",
    pattern:
      /\b(?:a|exclusive|great|hot|special|the|this) deal\b|\bdeal\s*[:!]|\b(?:deal|sale|sales)\b.{0,35}\b(?:amazon|best buy|buy|coupon|discount|gadget|headphones?|laptops?|monitors?|phones?|price|retail|save|shopping|vacuum)\b|\b(?:amazon|best buy|buy|coupon|discount|gadget|headphones?|laptops?|monitors?|phones?|price|retail|save|shopping|vacuum)\b.{0,35}\b(?:deal|sale|sales)\b/
  },
  {
    code: "shopping_or_deal",
    label: "retailer purchasing context",
    pattern:
      /\b(?:walmart|best buy|target|costco|ebay|etsy|temu|aliexpress|newegg|home depot|lowe['’]s)\b.{0,45}\b(?:buy|deal|discount|offer|sale|save|shop)\b|\b(?:buy|deal|discount|offer|sale|save|shop)\b.{0,45}\b(?:walmart|best buy|target|costco|ebay|etsy|temu|aliexpress|newegg|home depot|lowe['’]s)\b|\bb&h\b.{0,45}\b(?:buy|deal|discount|offer|price|sale|save|shop)\b/
  }
];

const PROMOTION_RULES: CommercialRule[] = [
  {
    code: "sales_or_promotion",
    label: "promotion or affiliate disclosure",
    pattern:
      /\b(?:affiliate|sponsored|paid placement|coupon code|promo code)\b|\b(?:promo|promotion|promotional)\b.{0,30}\b(?:code|deal|discount|offer|sale|shopping)\b/
  },
  {
    code: "sales_or_promotion",
    label: "time-limited commercial offer",
    pattern:
      /\b(?:limited-time offer|today only|early access sale|available now|commercial offer)\b/
  },
  {
    code: "sales_or_promotion",
    label: "shopping call to action",
    pattern: /\b(?:shop now|shop the)\b/
  },
  {
    code: "sales_or_promotion",
    label: "offer with purchasing context",
    pattern:
      /\b(?:offer|offers)\b.{0,30}\b(?:buy|coupon|discount|limited|price|sale|save|shopping)\b|\b(?:buy|coupon|discount|limited|price|sale|save|shopping)\b.{0,30}\b(?:offer|offers)\b/
  },
  {
    code: "sales_or_promotion",
    label: "retail markdown",
    pattern: /\b(?:price|retail)\s+markdown\b|\bmarkdown (?:deal|price|sale)\b/
  }
];

const TAG_RULES: CommercialTagRule[] = [
  {
    code: "shopping_or_deal",
    label: "commercial feed tag",
    tags: new Set([
      "deal",
      "deals",
      "sale",
      "sales",
      "discount",
      "discounted",
      "coupon",
      "coupons",
      "shopping",
      "shop",
      "clearance",
      "outlet",
      "bargain"
    ])
  },
  {
    code: "consumer_buying_guide",
    label: "consumer recommendation feed tag",
    tags: new Set([
      "buying guide",
      "buyers guide",
      "buyer's guide",
      "gift guide",
      "product roundup"
    ])
  },
  {
    code: "sales_or_promotion",
    label: "promotional feed tag",
    tags: new Set([
      "promo",
      "promotion",
      "promotional",
      "affiliate",
      "sponsored",
      "sponsored deal",
      "paid placement"
    ])
  }
];

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function rejected(rule: CommercialRule): CommercialContentResult {
  const labels: Record<CommercialRejectionCode, string> = {
    sales_or_promotion: "low-value sales or promotional",
    shopping_or_deal: "low-value shopping or deal",
    consumer_buying_guide: "low-value consumer buying-guide"
  };

  return {
    rejected: true,
    reasonCode: rule.code,
    reason: `Rejected as ${labels[rule.code]} content (${rule.label}).`,
    matchedSignal: rule.label
  };
}

export function classifyCommercialContent(
  item: CommercialContentInput
): CommercialContentResult {
  const url = normalizeText([item.url, item.canonicalUrl].filter(Boolean).join(" "));
  for (const rule of URL_RULES) {
    if (rule.pattern.test(url)) {
      return rejected(rule);
    }
  }

  const normalizedTags = new Set((item.tags ?? []).map(normalizeText));
  const taggedRule = TAG_RULES.find((rule) =>
    [...normalizedTags].some((tag) => rule.tags.has(tag))
  );

  if (taggedRule) {
    return rejected({ ...taggedRule, pattern: /$^/ });
  }

  const content = normalizeText(
    [
      item.title,
      item.summary,
      item.excerpt,
      item.sourceName,
      item.sourceMetadata,
      ...(item.tags ?? [])
    ]
      .filter(Boolean)
      .join(" ")
  );

  for (const rule of [...DEAL_RULES, ...BUYING_GUIDE_RULES, ...PROMOTION_RULES]) {
    if (rule.pattern.test(content)) {
      return rejected(rule);
    }
  }

  return { rejected: false };
}

import { TRUSTED_X_ACCOUNTS } from "@/config/trusted-x-accounts";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { classifyCategory } from "@/lib/news/classify";
import { createNewsId } from "@/lib/news/ids";
import { summarizeCandidate } from "@/lib/news/summarize";
import type { NewsItem } from "@/types/news";

type XTweet = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
};

type XUser = {
  id: string;
  name: string;
  username: string;
};

type XResponse = {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
};

export async function fetchTrustedXPosts({ now = new Date() }: { now?: Date } = {}) {
  const token = process.env.X_BEARER_TOKEN;

  if (!token) {
    return [];
  }

  const query = `${TRUSTED_X_ACCOUNTS.map((account) => `from:${account.handle}`).join(" OR ")} -is:retweet`;
  const url = new URL("https://api.twitter.com/2/tweets/search/recent");
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "50");
  url.searchParams.set("tweet.fields", "created_at,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as XResponse;
    const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
    const items = await Promise.all(
      (payload.data ?? []).map(async (tweet) => {
        const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
        const account = TRUSTED_X_ACCOUNTS.find(
          (trusted) => trusted.handle.toLowerCase() === user?.username.toLowerCase()
        );

        if (!user || !account) {
          return null;
        }

        const title = tweet.text.split(/\n|(?<=[.!?])\s/)[0]?.slice(0, 120).trim();
        if (!title) {
          return null;
        }

        const sourceUrl = `https://x.com/${user.username}/status/${tweet.id}`;
        const summary = await summarizeCandidate(tweet.text);
        const category = classifyCategory({
          title,
          summary,
          sourceName: account.displayName,
          sourceType: "x",
          hints: account.categoryHints
        });

        return {
          id: createNewsId(sourceUrl, title),
          title,
          summary,
          url: sourceUrl,
          sourceName: `${account.displayName} on X`,
          sourceType: "x",
          category,
          publishedAt: tweet.created_at ?? now.toISOString(),
          foundAt: now.toISOString(),
          imageUrl: placeholderImageForCategory(category, title),
          trustScore: account.trustScore,
          saved: false,
          tags: ["x-post", user.username, category]
        } satisfies NewsItem;
      })
    );

    return items.filter(Boolean) as NewsItem[];
  } catch {
    return [];
  }
}

export type DailyNewsletterEmailItem = {
  title: string;
  url: string;
  sourceName: string;
  summary: string;
  whyItMatters: string;
  category: string;
};

export type DailyNewsletterEmailInput = {
  baseUrl: string;
  unsubscribeUrl: string;
  items: DailyNewsletterEmailItem[];
};

const SUBJECT = "TechEveryday: Today's AI, Systems, and Infrastructure Brief";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemHtml(item: DailyNewsletterEmailItem) {
  return `
    <article style="border:2px solid #111111;background:#fffdf8;margin:0 0 16px;padding:18px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:800;color:#8a5d3b;">${escapeHtml(item.category)} · ${escapeHtml(item.sourceName)}</p>
      <h2 style="margin:0 0 10px;font-family:Georgia,serif;font-size:24px;line-height:1.05;color:#111111;">${escapeHtml(item.title)}</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#2f2a23;">${escapeHtml(item.summary)}</p>
      <div style="border-left:2px solid #111111;background:#f3eadb;padding:10px 12px;margin:0 0 14px;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:800;color:#8a5d3b;">Why it matters</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#2f2a23;">${escapeHtml(item.whyItMatters)}</p>
      </div>
      <a href="${escapeHtml(item.url)}" style="display:inline-block;border:2px solid #111111;background:#111111;color:#ffffff;text-decoration:none;padding:10px 14px;font-size:13px;font-weight:800;">Read original</a>
    </article>
  `;
}

function itemText(item: DailyNewsletterEmailItem) {
  return [
    `${item.category} - ${item.sourceName}`,
    item.title,
    item.summary,
    `Why it matters: ${item.whyItMatters}`,
    item.url
  ].join("\n");
}

export function renderDailyNewsletterEmail(input: DailyNewsletterEmailInput) {
  const items = input.items.slice(0, 12);
  const htmlItems = items.map(itemHtml).join("");
  const textItems = items.map(itemText).join("\n\n");
  const siteUrl = input.baseUrl.replace(/\/$/, "");

  return {
    subject: SUBJECT,
    html: `
      <div style="margin:0;background:#f3eadb;padding:28px 16px;font-family:Arial,sans-serif;color:#111111;">
        <main style="max-width:680px;margin:0 auto;">
          <header style="border:2px solid #111111;background:#fffdf8;padding:22px;margin-bottom:18px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#8a5d3b;">Daily research brief</p>
            <h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1;color:#111111;">TechEveryday</h1>
            <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#2f2a23;">Current, information-heavy technology updates selected from trusted sources.</p>
          </header>
          ${htmlItems}
          <footer style="border:2px solid #111111;background:#fffdf8;padding:16px;font-size:12px;line-height:1.6;color:#2f2a23;">
            <p style="margin:0 0 8px;">You are receiving this because you confirmed TechEveryday daily email updates.</p>
            <p style="margin:0;"><a href="${escapeHtml(siteUrl)}" style="color:#111111;font-weight:800;">Open TechEveryday</a> · <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#111111;font-weight:800;">Unsubscribe</a></p>
          </footer>
        </main>
      </div>
    `,
    text: [
      "TechEveryday Daily Research Brief",
      "Current, information-heavy technology updates selected from trusted sources.",
      "",
      textItems,
      "",
      `Open TechEveryday: ${siteUrl}`,
      `Unsubscribe: ${input.unsubscribeUrl}`
    ].join("\n")
  };
}

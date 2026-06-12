import { CATEGORY_BY_ID } from "@/config/categories";
import type { CategoryId } from "@/config/categories";

const ACCENTS: Record<CategoryId, string> = {
  "ai-ml": "#b98237",
  "automation-agentic-systems": "#60715f",
  "research-papers": "#111111",
  "embedded-systems": "#b35b43",
  "computer-systems": "#6f5d45",
  "developer-tools-open-source": "#356b73",
  cybersecurity: "#8f3f38",
  "cloud-infrastructure": "#4f6380"
};

export function placeholderImageForCategory(categoryId: CategoryId, title = "TechEveryday") {
  const category = CATEGORY_BY_ID[categoryId];
  const accent = ACCENTS[categoryId];
  const label = category?.title ?? "TechEveryday";
  const safeTitle = title.replace(/[<>&"]/g, "").slice(0, 72);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <rect width="1200" height="720" fill="#f3eadb"/>
      <rect x="38" y="38" width="1124" height="644" rx="34" fill="#fffaf0" stroke="#111111" stroke-width="7"/>
      <path d="M90 146h1020M90 574h1020" stroke="#111111" stroke-width="4" stroke-linecap="round"/>
      <circle cx="156" cy="224" r="52" fill="${accent}" stroke="#111111" stroke-width="6"/>
      <circle cx="1044" cy="496" r="70" fill="none" stroke="${accent}" stroke-width="16"/>
      <path d="M242 224h486M242 286h672M242 348h554" stroke="#111111" stroke-width="18" stroke-linecap="round"/>
      <path d="M160 484c92-94 180-94 262 0s168 94 258 0 184-94 280 0" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      <text x="90" y="652" fill="#111111" font-family="Georgia,serif" font-size="36">${label}</text>
      <text x="90" y="118" fill="#111111" font-family="Arial,sans-serif" font-size="24" font-weight="700">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

import { CATEGORY_BY_ID } from "@/config/categories";
import type { CategoryId } from "@/config/categories";

const MOTIFS: Record<CategoryId, string> = {
  "ai-ml": `
    <circle cx="266" cy="300" r="42" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <circle cx="430" cy="224" r="34" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <circle cx="592" cy="322" r="40" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <path d="M304 282l92-42M462 244l96 58M306 318l246 6" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
  `,
  "automation-agentic-systems": `
    <rect x="238" y="224" width="172" height="72" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <rect x="486" y="224" width="172" height="72" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <rect x="362" y="358" width="172" height="72" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <path d="M410 260h76M572 296v62M448 358v-62" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
  `,
  "research-papers": `
    <rect x="258" y="190" width="278" height="358" rx="6" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
    <path d="M310 260h174M310 312h154M310 364h174M310 416h122" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
    <path d="M612 260h130M612 312h90M612 364h130" stroke="#6f6a61" stroke-width="8" stroke-linecap="round"/>
    <circle cx="610" cy="468" r="24" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
    <circle cx="690" cy="468" r="24" fill="#fffdf8" stroke="#111111" stroke-width="6"/>
  `,
  "embedded-systems": `
    <rect x="274" y="214" width="300" height="248" rx="10" fill="#fffdf8" stroke="#111111" stroke-width="8"/>
    <path d="M330 214v-54M394 214v-54M458 214v-54M522 214v-54M330 516v-54M394 516v-54M458 516v-54M522 516v-54" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
    <path d="M574 268h54M574 332h54M574 396h54M220 268h54M220 332h54M220 396h54" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
    <rect x="354" y="292" width="140" height="94" rx="6" fill="#eee5d6" stroke="#111111" stroke-width="6"/>
  `,
  "computer-systems": `
    <rect x="244" y="216" width="416" height="270" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
    <path d="M244 286h416M320 216v270M458 216v270" stroke="#111111" stroke-width="5"/>
    <path d="M284 338h74M284 392h74M498 338h98M498 392h76" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
  `,
  "developer-tools-open-source": `
    <rect x="250" y="216" width="450" height="276" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
    <path d="M250 282h450" stroke="#111111" stroke-width="6"/>
    <circle cx="292" cy="249" r="12" fill="#111111"/>
    <circle cx="334" cy="249" r="12" fill="#6f6a61"/>
    <circle cx="376" cy="249" r="12" fill="#d8ccba"/>
    <path d="M326 352l-52 44 52 44M624 352l52 44-52 44M430 454l82-122" fill="none" stroke="#111111" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  cybersecurity: `
    <path d="M462 188l178 72v118c0 98-68 154-178 194-110-40-178-96-178-194V260l178-72z" fill="#fffdf8" stroke="#111111" stroke-width="8" stroke-linejoin="round"/>
    <rect x="396" y="328" width="132" height="102" rx="8" fill="#eee5d6" stroke="#111111" stroke-width="7"/>
    <path d="M422 328v-42c0-58 80-58 80 0v42" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
  `,
  "cloud-infrastructure": `
    <rect x="250" y="244" width="150" height="104" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
    <rect x="506" y="244" width="150" height="104" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
    <rect x="378" y="398" width="150" height="104" rx="8" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
    <path d="M400 296h106M581 348v50M453 398v-50" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
  `
};

export function placeholderImageForCategory(categoryId: CategoryId, title = "TechEveryday") {
  const category = CATEGORY_BY_ID[categoryId];
  const label = category?.title ?? "TechEveryday";
  const safeTitle = title.replace(/[<>&"]/g, "").slice(0, 72);
  const motif = MOTIFS[categoryId];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <rect width="1200" height="720" fill="#f7f1e8"/>
      <rect x="42" y="42" width="1116" height="636" rx="18" fill="#fffdf8" stroke="#111111" stroke-width="7"/>
      <path d="M96 156h1008M96 570h1008" stroke="#111111" stroke-width="4" stroke-linecap="round"/>
      <path d="M128 214h944M128 270h944M128 326h944M128 382h944M128 438h944M128 494h944" stroke="#eee5d6" stroke-width="4"/>
      <rect x="144" y="188" width="680" height="382" rx="10" fill="#f7f1e8" stroke="#111111" stroke-width="6"/>
      <path d="M874 226h190M874 288h148M874 350h190M874 412h112" stroke="#111111" stroke-width="14" stroke-linecap="round"/>
      <path d="M874 488h154" stroke="#6f6a61" stroke-width="10" stroke-linecap="round"/>
      ${motif}
      <text x="96" y="650" fill="#111111" font-family="Georgia,serif" font-size="36">${label}</text>
      <text x="96" y="118" fill="#111111" font-family="Arial,sans-serif" font-size="24" font-weight="700">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

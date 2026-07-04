import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, "..", "src", "content", "articles");

function listSlugs(locale: "ja" | "en"): Set<string> {
  const dir = join(ARTICLES_DIR, locale);
  return new Set(
    readdirSync(dir)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""))
  );
}

const jaSlugs = listSlugs("ja");
const enSlugs = listSlugs("en");
const allSlugs = new Set([...jaSlugs, ...enSlugs]);

let warned = false;
for (const slug of allSlugs) {
  const hasJa = jaSlugs.has(slug);
  const hasEn = enSlugs.has(slug);
  if (hasJa !== hasEn) {
    const onlyIn = hasJa ? "ja" : "en";
    console.warn(`[check-articles] "${slug}" は ${onlyIn} にしか存在しません。`);
    warned = true;
  }
}

if (!warned) {
  console.log("[check-articles] 日英ペアリングの不整合はありません。");
}

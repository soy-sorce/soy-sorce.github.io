import { getCollection } from "astro:content";
import type { Locale } from "./i18n";
import { getArticleHref, getArticlesByLocale } from "./articles";

export type LocalizedNewsItem = {
  id: string;
  date: string;
  url?: string;
  text: string;
};

type Source = "manual" | "paper" | "article" | "award";

const SOURCE_ORDER: Record<Source, number> = {
  manual: 0,
  paper: 1,
  article: 2,
  award: 3,
};

export function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getNewsItems(locale: Locale, limit = 5): Promise<LocalizedNewsItem[]> {
  const items: (LocalizedNewsItem & { source: Source })[] = [];

  const manualNews = await getCollection("manualNews");
  for (const entry of manualNews) {
    items.push({
      id: `manual-${entry.id}`,
      date: toIsoDateString(entry.data.date),
      url: entry.data.url?.[locale],
      text: entry.data.title[locale],
      source: "manual",
    });
  }

  const papers = await getCollection("papers");
  for (const entry of papers.filter((p) => p.data.showInNews)) {
    const fallback =
      locale === "ja"
        ? `論文『${entry.data.title.ja}』を追加しました。`
        : `Added paper: ${entry.data.title.en}.`;
    items.push({
      id: `paper-${entry.id}`,
      date: toIsoDateString(entry.data.date),
      text: entry.data.newsSummary?.[locale] || fallback,
      source: "paper",
    });
  }

  const awards = await getCollection("awards");
  for (const entry of awards.filter((a) => a.data.showInNews)) {
    const fallback =
      locale === "ja"
        ? `受賞歴『${entry.data.title.ja}』を追加しました。`
        : `Added award: ${entry.data.title.en}.`;
    items.push({
      id: `award-${entry.id}`,
      date: toIsoDateString(entry.data.date),
      text: entry.data.newsSummary?.[locale] || fallback,
      source: "award",
    });
  }

  const articles = await getArticlesByLocale(locale);
  for (const entry of articles.filter((a) => a.data.showInNews)) {
    const fallback =
      locale === "ja"
        ? `記事『${entry.data.title}』を公開しました。`
        : `Published article: ${entry.data.title}.`;
    items.push({
      id: `article-${entry.id}`,
      date: toIsoDateString(entry.data.date),
      url: getArticleHref(entry, locale),
      text: entry.data.newsSummary || fallback,
      source: "article",
    });
  }

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
  });

  return items.slice(0, limit).map(({ source: _source, ...rest }) => rest);
}

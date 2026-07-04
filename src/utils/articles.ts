import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";

export function getLocaleFromId(id: string): Locale {
  return id.startsWith("en/") ? "en" : "ja";
}

export function getSlugFromId(id: string): string {
  return id.split("/").slice(1).join("/");
}

export async function getArticlesByLocale(locale: Locale) {
  const all = await getCollection("articles");
  return all.filter((entry) => getLocaleFromId(entry.id) === locale);
}

/**
 * url指定がある記事は外部の「リンク投稿」として扱い、サイト内の記事詳細ページは持たない。
 */
export function isExternalArticle(entry: CollectionEntry<"articles">): boolean {
  return Boolean(entry.data.url);
}

export function getArticleHref(entry: CollectionEntry<"articles">, locale: Locale): string {
  if (entry.data.url) return entry.data.url;
  return `/${locale}/articles/${getSlugFromId(entry.id)}/`;
}

export async function getArticleCounterpart(locale: Locale, slug: string) {
  const otherLocale: Locale = locale === "ja" ? "en" : "ja";
  const all = await getCollection("articles");
  return all.find(
    (entry) =>
      getLocaleFromId(entry.id) === otherLocale && getSlugFromId(entry.id) === slug
  );
}

import { getCollection } from "astro:content";
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

export async function getArticleCounterpart(locale: Locale, slug: string) {
  const otherLocale: Locale = locale === "ja" ? "en" : "ja";
  const all = await getCollection("articles");
  return all.find(
    (entry) =>
      getLocaleFromId(entry.id) === otherLocale && getSlugFromId(entry.id) === slug
  );
}

export type Locale = "ja" | "en";

export const locales: Locale[] = ["ja", "en"];

export const defaultLocale: Locale = "ja";

export function getOtherLocale(locale: Locale): Locale {
  return locale === "ja" ? "en" : "ja";
}

export function getAlternatePath(pathname: string, targetLocale: Locale): string {
  return pathname.replace(/^\/(ja|en)/, `/${targetLocale}`);
}

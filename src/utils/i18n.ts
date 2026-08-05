export type Locale = "ja" | "en";

export const locales: Locale[] = ["ja", "en"];

export const defaultLocale: Locale = "en";

export function getOtherLocale(locale: Locale): Locale {
  return locale === "ja" ? "en" : "ja";
}

/**
 * defaultLocale（en）はプレフィックス無し、それ以外（ja）は `/ja` を付ける。
 */
export function getLocalizedPath(locale: Locale, path: string): string {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

export function getAlternatePath(pathname: string, targetLocale: Locale): string {
  const stripped = pathname.replace(/^\/(ja|en)(?=\/|$)/, "") || "/";
  return getLocalizedPath(targetLocale, stripped);
}

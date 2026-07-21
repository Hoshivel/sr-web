/*
  碎界 sr-web —— i18n helper。
  路由策略：預設語言（zh-Hant）掛根 `/`，其餘掛 `/zh-cn`、`/en`。
  以顯式 locale prop 傳遞，SSR 乾淨、無需 client context。
*/

import {
  ui,
  LOCALES,
  LOCALE_PATH,
  DEFAULT_LOCALE,
  type Locale,
  type UIKey,
} from "./ui";

export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_PATH,
  HTML_LANG,
  OG_LOCALE,
  LOCALE_LABEL,
  LOCALE_SHORT,
  type Locale,
  type UIKey,
} from "./ui";

/** 由 URL pathname 推導目前 locale（找不到前綴 → 預設語言）。 */
export function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  for (const locale of LOCALES) {
    const prefix = LOCALE_PATH[locale];
    if (prefix && prefix === seg) return locale;
  }
  return DEFAULT_LOCALE;
}

/** 取得某語言的翻譯函式：`t("nav.play")`；缺鍵回退預設語言。 */
export function useTranslations(locale: Locale): (key: UIKey) => string {
  return (key) => ui[locale][key] ?? ui[DEFAULT_LOCALE][key];
}

/**
 * 產生某語言下的頁面路徑。
 * @example localizedPath("zh-CN", "/")      → "/zh-cn/"
 * @example localizedPath("en", "/about")     → "/en/about"
 * @example localizedPath("zh-Hant", "/")     → "/"
 */
export function localizedPath(locale: Locale, path = "/"): string {
  const prefix = LOCALE_PATH[locale];
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!prefix) return clean;
  return clean === "/" ? `/${prefix}/` : `/${prefix}${clean}`;
}

/**
 * 去掉 pathname 上的 locale 前綴，得到「邏輯路徑」。
 * 供 Layout 產生 hreflang 交替連結（把同一頁的各語言版本串起來）。
 * @example stripLocalePrefix("/en/about") → "/about"
 * @example stripLocalePrefix("/zh-cn/")    → "/"
 */
export function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0]?.toLowerCase();
  for (const locale of LOCALES) {
    const prefix = LOCALE_PATH[locale];
    if (prefix && prefix === first) {
      const rest = parts.slice(1).join("/");
      return rest ? `/${rest}` : "/";
    }
  }
  const rest = parts.join("/");
  return rest ? `/${rest}` : "/";
}

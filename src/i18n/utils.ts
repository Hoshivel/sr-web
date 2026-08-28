/*
  碎界 sr-web —— i18n helper。
  路由策略：預設語言（zh-Hant）掛根 `/`，其餘掛 `/zh-cn`、`/en`、`/ja`。
  以顯式 locale prop 傳遞，SSR 乾淨、無需 client context。
*/

// 帶副檔名（`allowImportingTsExtensions`，見 astro/tsconfigs/base.json）：
// `test/routing.test.mjs` 用 Node 的型別剝除直接載入這支檔案，而那條路徑
// 不做無副檔名解析。少了它，釘住路由形狀的那幾條測試根本跑不起來。
import {
  ui,
  LOCALES,
  LOCALE_PATH,
  DEFAULT_LOCALE,
  type Locale,
  type UIKey,
} from "./ui.ts";

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
} from "./ui.ts";

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
 * 把邏輯路徑正規化成**主機真正提供的形狀**。
 *
 * 產物是 `<路徑>/index.html`，所以頁面的網址帶尾斜線——`canonical` 一直是這樣
 * （它取自 `Astro.url.pathname`），而 `stripLocalePrefix()` 用
 * `split("/").filter(Boolean)` 重組，尾斜線一律掉。本站今天只有各語系首頁，
 * 兩種寫法在 `/` 上剛好相等，所以看不出差別——**姊妹站 hoshivel-web 加了內頁
 * 之後就無限轉圈了**：偏好轉址把同一頁判成另一頁，主機 307 轉回來，
 * 腳本再跑一次。正規化收在這一層，內頁進來的那天就不必再發現一次。
 *
 * 有副檔名的是檔案（`/rss.xml`），不加；查詢字串與錨點留在尾斜線之後。
 *
 * @example pagePath("/about")            → "/about/"
 * @example pagePath("/works#sr")         → "/works/#sr"
 */
export function pagePath(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const cut = clean.search(/[?#]/);
  const base = cut === -1 ? clean : clean.slice(0, cut);
  const suffix = cut === -1 ? "" : clean.slice(cut);
  if (base.endsWith("/")) return base + suffix;
  const last = base.slice(base.lastIndexOf("/") + 1);
  return last.includes(".") ? base + suffix : `${base}/${suffix}`;
}

/**
 * 產生某語言下的頁面路徑（已是主機提供的形狀，見 `pagePath`）。
 * @example localizedPath("zh-CN", "/")      → "/zh-cn/"
 * @example localizedPath("en", "/about")     → "/en/about/"
 * @example localizedPath("zh-Hant", "/")     → "/"
 */
export function localizedPath(locale: Locale, path = "/"): string {
  const prefix = LOCALE_PATH[locale];
  const clean = pagePath(path);
  return prefix ? `/${prefix}${clean}` : clean;
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

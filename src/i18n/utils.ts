/*
  Shattered Realms sr-web -- i18n helpers.
  Routing strategy: the default locale (zh-Hant) sits at the root `/`; the others
  at `/zh-cn`, `/en`, `/ja`.
  The locale is passed down as an explicit prop, which keeps SSR clean and needs
  no client-side context.
*/

// Keep the file extension (`allowImportingTsExtensions`, see
// astro/tsconfigs/base.json): `test/routing.test.mjs` loads this file directly
// through Node's type stripping, and that path does no extensionless
// resolution. Without it, the tests that pin the route shape cannot even start.
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

/** Derive the current locale from a URL pathname (no prefix means the default locale). */
export function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  for (const locale of LOCALES) {
    const prefix = LOCALE_PATH[locale];
    if (prefix && prefix === seg) return locale;
  }
  return DEFAULT_LOCALE;
}

/** Build a translation function for a locale: `t("nav.play")`; a missing key falls back to the default locale. */
export function useTranslations(locale: Locale): (key: UIKey) => string {
  return (key) => ui[locale][key] ?? ui[DEFAULT_LOCALE][key];
}

/**
 * Normalize a logical path into **the shape the host actually serves**.
 *
 * The build emits `<path>/index.html`, so a page URL carries a trailing slash --
 * `canonical` always had one (it comes from `Astro.url.pathname`), while
 * `stripLocalePrefix()` rebuilds the path with `split("/").filter(Boolean)`,
 * which always drops it. This site currently has only the per-locale home pages,
 * where the two spellings happen to coincide on `/`, so the difference is
 * invisible here -- **but the sibling site hoshivel-web ended up in a redirect
 * loop once it gained subpages**: the preference redirect read one page as
 * another, the host 307'd back, and the script ran again. Normalizing at this
 * layer means the day subpages arrive, nobody has to discover it a second time.
 *
 * Anything with a file extension is a file (`/rss.xml`) and gets no slash; query
 * strings and fragments stay after the trailing slash.
 *
 * @example pagePath("/about")            -> "/about/"
 * @example pagePath("/works#sr")         -> "/works/#sr"
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
 * Build a page path for a locale (already in the shape the host serves, see `pagePath`).
 * @example localizedPath("zh-CN", "/")      -> "/zh-cn/"
 * @example localizedPath("en", "/about")     -> "/en/about/"
 * @example localizedPath("zh-Hant", "/")     -> "/"
 */
export function localizedPath(locale: Locale, path = "/"): string {
  const prefix = LOCALE_PATH[locale];
  const clean = pagePath(path);
  return prefix ? `/${prefix}${clean}` : clean;
}

/**
 * Strip the locale prefix from a pathname, leaving the logical path.
 * Layout uses it to emit hreflang alternates (linking every language version of
 * the same page).
 * @example stripLocalePrefix("/en/about") -> "/about"
 * @example stripLocalePrefix("/zh-cn/")    -> "/"
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

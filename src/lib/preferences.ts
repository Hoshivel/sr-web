export const LANGUAGE_COOKIE = "hoshi_lang";
export const THEME_COOKIE = "hoshi_theme";
export const CONSENT_COOKIE = "hoshi_cookie_consent";

export const CONSENT_ESSENTIAL = "essential-v1";
export const CONSENT_PREFERENCES = "preferences-v1";

export type CookieConsent =
  | typeof CONSENT_ESSENTIAL
  | typeof CONSENT_PREFERENCES;
export type GlobalLanguage = "zh-TW" | "zh-CN" | "ja" | "en";

const COOKIE_TTL = 365 * 24 * 60 * 60;

const GLOBAL_LANGUAGE: Record<string, GlobalLanguage> = {
  "zh-Hant": "zh-TW",
  "zh-TW": "zh-TW",
  "zh-CN": "zh-CN",
  "zh-Hans": "zh-CN",
  ja: "ja",
  en: "en",
};

export function globalLanguageForLocale(locale: string): GlobalLanguage {
  return GLOBAL_LANGUAGE[locale] ?? "zh-TW";
}

export function normalizeGlobalLanguage(value: string | null): GlobalLanguage | null {
  if (!value) return null;
  return GLOBAL_LANGUAGE[value] ?? null;
}

export function parseCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return null;
    }
  }
  return null;
}

export function preferenceCookieDomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "hoshivel.com" || host.endsWith(".hoshivel.com")
    ? "hoshivel.com"
    : null;
}

function cookieSuffix(maxAge: number, domain: string | null): string {
  const secure = typeof location !== "undefined" && location.protocol === "https:"
    ? "; Secure"
    : "";
  return `; Path=/; Max-Age=${maxAge}; SameSite=Lax${domain ? `; Domain=${domain}` : ""}${secure}`;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined" || typeof location === "undefined") return;
  const domain = preferenceCookieDomain(location.hostname);
  if (domain) {
    // Clear the previous host-only shape before writing the shared cookie.
    document.cookie = `${name}=${cookieSuffix(0, null)}`;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieSuffix(COOKIE_TTL, domain)}`;
}

function removeCookie(name: string): void {
  if (typeof document === "undefined" || typeof location === "undefined") return;
  document.cookie = `${name}=${cookieSuffix(0, null)}`;
  const domain = preferenceCookieDomain(location.hostname);
  if (domain) document.cookie = `${name}=${cookieSuffix(0, domain)}`;
}

export function readConsent(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const value = parseCookie(document.cookie, CONSENT_COOKIE);
  return value === CONSENT_ESSENTIAL || value === CONSENT_PREFERENCES
    ? value
    : null;
}

export function acceptPreferences(language: GlobalLanguage): void {
  writeCookie(CONSENT_COOKIE, CONSENT_PREFERENCES);
  writeCookie(LANGUAGE_COOKIE, language);
}

export function rememberLanguage(language: GlobalLanguage): void {
  acceptPreferences(language);
}

export function useEssentialCookies(): void {
  removeCookie(LANGUAGE_COOKIE);
  removeCookie(THEME_COOKIE);
  writeCookie(CONSENT_COOKIE, CONSENT_ESSENTIAL);
}

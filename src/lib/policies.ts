import { localizedPath, type Locale } from "@/i18n/utils";

type PolicyPage = "usage-policy" | "privacy-policy";

export function policyHref(locale: Locale, policy: PolicyPage): string {
  return new URL(localizedPath(locale, `/${policy}/`), "https://hoshivel.com").href;
}

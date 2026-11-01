/*
  Structured data for the subpages.

  The home page carries its own graph (WebSite / VideoGame / Organization, see
  Layout.astro). A subpage adds what only it can say: where it sits in the site
  (BreadcrumbList) and, for the FAQ, its questions and answers (FAQPage). Both
  are built here so Layout and the visible breadcrumb trail read one list.
*/
import { localizedPath, type Locale } from "../i18n/utils.ts";
import type { FaqEntry } from "../i18n/pages.ts";

/** One step of a breadcrumb trail; `path` is logical (locale-free). */
export interface Crumb {
  name: string;
  path: string;
}

const absolute = (siteRoot: string, locale: Locale, path: string) =>
  new URL(localizedPath(locale, path), siteRoot).href;

export function breadcrumbList(siteRoot: string, locale: Locale, crumbs: readonly Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(siteRoot, locale, crumb.path),
    })),
  };
}

export function faqPage(entries: readonly FaqEntry[]) {
  return {
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a.join("\n") },
    })),
  };
}

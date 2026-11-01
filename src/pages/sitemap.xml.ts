/*
  /sitemap.xml -- hand-rolled sitemap (zero dependencies) listing every page in
  every locale, each with hreflang alternates to its other language versions.
  Only indexable content pages are included. The static site prerenders this to a
  file; robots.txt points here.

  `test/built/seo.test.mjs` compares this list with the pages that are actually
  built, so a subpage added without an entry here (or an entry without a page)
  fails the build.
*/
import type { APIRoute } from "astro";
import { LOCALES, localizedPath, HTML_LANG, DEFAULT_LOCALE } from "@/i18n/utils";
import { PAGE_PATH, CHARACTER_IDS, characterPath } from "@/i18n/pages";

export const prerender = true;

// Logical pages (locale-independent); add a new subpage here.
const LOGICAL_PAGES = [
  "/",
  PAGE_PATH.world,
  PAGE_PATH.gameplay,
  PAGE_PATH.characters,
  ...CHARACTER_IDS.map(characterPath),
  PAGE_PATH.faq,
];

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.href ?? "https://sr.hoshivel.com/").replace(/\/$/, "");
  const abs = (p: string) => `${origin}${p}`;

  const urls = LOGICAL_PAGES.flatMap((logical) =>
    LOCALES.map((l) => {
      const alts = LOCALES.map(
        (a) => `    <xhtml:link rel="alternate" hreflang="${HTML_LANG[a]}" href="${abs(localizedPath(a, logical))}"/>`,
      ).join("\n");
      const xdefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(localizedPath(DEFAULT_LOCALE, logical))}"/>`;
      return `  <url>\n    <loc>${abs(localizedPath(l, logical))}</loc>\n${alts}\n${xdefault}\n  </url>`;
    }),
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

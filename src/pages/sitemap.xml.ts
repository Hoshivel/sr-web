/*
  /sitemap.xml —— 手捲 sitemap（零依賴），列出各語系首頁並互標 hreflang。
  只收可索引的內容頁；`/play/session/`（noindex iframe 頁）與 `/api/*` 不列。
  靜態站預渲染為靜態檔；robots.txt 指向此處。
*/
import type { APIRoute } from "astro";
import { LOCALES, localizedPath, HTML_LANG, DEFAULT_LOCALE } from "@/i18n/utils";

export const prerender = true;

// 邏輯頁（與語系無關）；日後新增子頁在此追加即可。
const LOGICAL_PAGES = ["/"];

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

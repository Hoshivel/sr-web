/*
  The shape of route strings -- the same invariant as the sibling site hoshivel-web.

  That site hit a redirect loop on 2026-08-28: the host serves `/news/x/` (the
  build emits `<path>/index.html`) while logical paths carry no trailing slash, so
  the preference redirect compared the latter against `location.pathname`, read it
  as "another page" and redirected; the host 307'd back and the script ran again.

  This site currently has only the per-locale home pages, where the two spellings
  of `/` happen to coincide, so the difference is invisible -- what these cases
  pin is that it **still holds once subpages arrive**:

      For any page in any locale, the target derived from its own pathname is
      that same page.
*/
import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCALES,
  DEFAULT_LOCALE,
  localizedPath,
  pagePath,
  stripLocalePrefix,
} from "../src/i18n/utils.ts";

// The first entry is what exists today; the rest are the shapes subpages will take.
const SERVED = ["/", "/about/", "/world/factions/"];

test("偏好轉址的目標永遠不是讀者已經在的那一頁", () => {
  for (const locale of LOCALES) {
    for (const served of SERVED) {
      const pathname = localizedPath(locale, served);
      const target = localizedPath(locale, stripLocalePrefix(pathname));
      assert.equal(target, pathname, `${locale} ${pathname} 會轉去 ${target}`);
    }
  }
});

test("頁面路徑帶尾斜線，檔案不帶", () => {
  assert.equal(pagePath("/"), "/");
  assert.equal(pagePath("/about"), "/about/");
  assert.equal(pagePath("/about/"), "/about/");
  assert.equal(pagePath("/sitemap.xml"), "/sitemap.xml");
  assert.equal(pagePath("/world#factions"), "/world/#factions");
});

test("語系前綴接在正規化之後的路徑上", () => {
  assert.equal(localizedPath(DEFAULT_LOCALE, "/"), "/");
  assert.equal(localizedPath("zh-CN", "/"), "/zh-cn/");
  assert.equal(localizedPath("en", "/about"), "/en/about/");
});

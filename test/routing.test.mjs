/*
  路由字串的形狀 —— 與姊妹站 hoshivel-web 同一份不變式。

  那邊 2026-08-28 出過一次無限轉址：主機提供的是 `/news/x/`（產物是
  `<路徑>/index.html`），而邏輯路徑不帶尾斜線，偏好轉址拿後者去比
  `location.pathname`，判成「另一頁」就轉，主機 307 轉回來，腳本再跑一次。

  本站今天只有各語系首頁，`/` 兩種寫法剛好相等，所以看不出差別——這幾條
  釘的是**加了內頁之後也還成立**：

      對任一語系的任何一頁，由它自己的 pathname 推回來的目標＝它自己。
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

// 第一項是今天真的有的；其餘是內頁進來之後的形狀。
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

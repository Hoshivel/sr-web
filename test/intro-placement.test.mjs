import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { META_DESCRIPTION } from "../src/i18n/ui.ts";

const home = readFileSync(new URL("../src/components/Home.astro", import.meta.url), "utf8");
const play = readFileSync(new URL("../src/components/sections/Play.astro", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");

test("the introduction follows the playable area without changing the hero tagline", () => {
  assert.ok(!home.includes('t("site.summary")'), "the hero must not render the introduction");
  assert.ok(home.includes('t("site.tagline")'), "the hero keeps its approved tagline");
  const launcher = play.indexOf("<PlayLauncher ");
  const introduction = play.indexOf('t("site.summary")');
  const end = play.indexOf("</section>");
  assert.ok(launcher >= 0 && introduction > launcher && introduction < end,
    "the static introduction must follow the launcher and its controls");
  assert.equal(play.split('t("site.summary")').length - 1, 1);
});

test("SEO metadata continues to use the same introduction", () => {
  assert.ok(layout.includes('${t("site.tagline")} — ${t("site.summary")}'));
  assert.ok(layout.includes('description: t("site.summary")'));
  assert.ok(layout.includes('<meta name="description" content={pageDescription}'));
});

test("only English shortens the home description, and it keeps all three names", () => {
  // The composed English line runs to about 250 characters and search results
  // cut it mid-sentence; the Chinese and Japanese lines fit and stay the same
  // introduction as the page (2026-11-01).
  assert.ok(layout.includes("META_DESCRIPTION[locale] ??"), "Layout must try the override before composing");
  assert.deepEqual(Object.keys(META_DESCRIPTION), ["en"]);
  const english = META_DESCRIPTION.en;
  assert.ok(english.length <= 155, `${english.length} characters is too long for a result`);
  for (const name of ["Shattered Realms", "碎界", "Hoshivel"]) {
    assert.ok(english.includes(name), `the English description must name ${name}`);
  }
});

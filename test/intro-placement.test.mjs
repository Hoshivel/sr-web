import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

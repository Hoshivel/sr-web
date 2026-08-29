import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ui as dictionaries } from "../src/i18n/ui.ts";

// 碎界樹 is the OFFICIAL name of the chapter tree — it belongs to 碎界, it is not
// the world tree out of general mythology, and the game client calls it exactly
// that. This site had drifted to 碎界之樹 / "World Tree", so these assertions
// exist to stop the name drifting again on the next copy pass.
//
// ONE exception, decided by the user: the section's title line
// 「沿著碎界之樹，看見旅途交會」 keeps its wording. It is a piece of prose, not a
// label, and 碎界之樹 is what scans there. It lives in chapters.titleA and is the
// only key allowed to carry the variant.
//
// chapters.status.root 「世界之根」 is deliberately NOT policed here either — the
// user ruled it a descriptive label rather than a name, so it stays. It is not in
// BANNED, so nothing below touches it; this note exists so the next reader does
// not "notice the gap" and close it.
const NAMES = {
  "zh-Hant": "碎界樹",
  "zh-CN": "碎界树",
  en: "Shattered Realms Tree",
  // ja localizes the brand itself (碎界 → 砕界, see the ja dictionary's own note),
  // so the tree follows the same spelling here.
  ja: "砕界樹",
};

const BANNED = ["碎界之樹", "碎界之树", "World Tree", "world tree", "砕界の樹"];
const EXEMPT_KEYS = new Set(["chapters.titleA"]);

test("the chapter tree is named 碎界樹 in every locale", () => {
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    assert.equal(
      dictionary["nav.chapters"],
      NAMES[locale],
      `${locale} must call the tree ${NAMES[locale]}`,
    );
  }
});

test("only the approved title line may still say 碎界之樹", () => {
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    for (const [key, value] of Object.entries(dictionary)) {
      if (EXEMPT_KEYS.has(key)) continue;
      for (const banned of BANNED) {
        assert.ok(
          !value.includes(banned),
          `${locale}/${key} says "${banned}" — the tree is ${NAMES[locale]}`,
        );
      }
    }
  }
});

test("the section component carries the name too", () => {
  for (const file of [
    "../src/components/sections/ShatteredTree.tsx",
    "../src/components/sections/ShatteredTree.css",
    "../src/components/sections/Chapters.astro",
  ]) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const banned of ["World Tree", "WorldTree"]) {
      assert.ok(!text.includes(banned), `${file} still says "${banned}"`);
    }
  }
});

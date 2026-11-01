/*
  The subpage copy (src/i18n/pages.ts) has to line up across the four locales.

  The `PagesCopy` type makes every locale carry every field, but it cannot see
  array lengths or ids: a locale with one FAQ answer fewer, a section id typed
  differently (which breaks every link into it) or a skill in another order all
  compile. These checks compare each locale's shape with zh-Hant, the source.
*/
import assert from "node:assert/strict";
import test from "node:test";

import { pages, CHARACTER_IDS } from "../src/i18n/pages.ts";
import { ui } from "../src/i18n/ui.ts";
import { CHARACTERS } from "../src/config/characters.ts";

const source = pages["zh-Hant"];

// Fields whose value must be identical in every locale: they are anchors, link
// targets and unlock levels, not prose.
const STRUCTURAL = new Set(["id", "link", "level"]);

/** The copy with every translatable string blanked, keeping structure and ids. */
const shape = (value, key = "") => {
  if (Array.isArray(value)) return value.map((item) => shape(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, shape(value[k], k)]));
  }
  if (STRUCTURAL.has(key)) return value;
  return typeof value;
};

/** Every string in the copy, with the path it sits at. */
const strings = (value, path = "") =>
  typeof value === "string"
    ? [[path, value]]
    : Object.entries(value ?? {}).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));

for (const [locale, copy] of Object.entries(pages)) {
  test(`${locale}: same pages, sections, questions and skills as zh-Hant`, () => {
    assert.deepEqual(shape(copy), shape(source));
  });

  test(`${locale}: every string is filled in`, () => {
    for (const [path, value] of strings(copy)) {
      assert.ok(value.trim(), `${locale}: ${path} is empty`);
    }
  });

  test(`${locale}: skill and combat-style text carries no numbers`, () => {
    // Damage, ranges and turn counts change with balance, and nobody re-reads a
    // marketing page when they do. The game shows the current values.
    for (const [id, character] of Object.entries(copy.character)) {
      const texts = [...character.style, ...[...character.passives, ...character.core, ...character.cards].map((s) => s.text)];
      for (const text of texts) {
        assert.doesNotMatch(text, /[0-9０-９]/, `${locale}/${id}: "${text}" quotes a number`);
      }
    }
  });
}

test("the Japanese copy spells the brand 砕界, as the Japanese dictionary does", () => {
  // ja localizes the brand itself (see the note on its `nav.world` in ui.ts);
  // 碎 is the Chinese form and reads as a typo to a Japanese reader.
  for (const [path, value] of strings(pages.ja)) {
    assert.ok(!value.includes("碎"), `ja: ${path} uses the Chinese 碎`);
  }
});

test("the character list, the copy and the dictionary name the same characters", () => {
  assert.deepEqual(CHARACTERS.map((c) => c.id), [...CHARACTER_IDS], "src/config/characters.ts order");
  for (const [locale, copy] of Object.entries(pages)) {
    assert.deepEqual(Object.keys(copy.character), [...CHARACTER_IDS], `${locale}: character order`);
    for (const id of CHARACTER_IDS) {
      for (const field of ["name", "role", "epithet", "seeking", "element"]) {
        assert.ok(ui[locale][`char.${id}.${field}`], `${locale}: char.${id}.${field} is missing from ui.ts`);
      }
    }
  }
});

test("core skills unlock in level order and end with one ultimate", () => {
  for (const [id, character] of Object.entries(source.character)) {
    const levels = character.core.map((s) => s.level);
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b), `${id}: core skills out of level order`);
    assert.equal(levels.filter((l) => l === 5).length, 1, `${id}: exactly one Lv.5 ultimate`);
    assert.equal(levels.at(-1), 5, `${id}: the ultimate comes last`);
  }
});

test("section and question ids are unique within their page", () => {
  for (const [page, items] of [
    ["world", source.world.sections],
    ["gameplay", source.gameplay.sections],
    ["faq", source.faq.entries],
  ]) {
    const ids = items.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, `${page}: duplicate fragment ids`);
    // The world page's chapter list owns #chapters (home links point at it).
    if (page === "world") assert.ok(!ids.includes("chapters"), "world: #chapters is the chapter list");
  }
});

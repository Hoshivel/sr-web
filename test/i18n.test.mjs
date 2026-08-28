import assert from "node:assert/strict";
import test from "node:test";
import { ui as dictionaries } from "../src/i18n/ui.ts";

const source = dictionaries["zh-Hant"];
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

for (const [locale, dictionary] of Object.entries(dictionaries)) {
  test(`${locale}: every message is present and nonempty`, () => {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(source).sort());
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, "string", `${key} must be text`);
      assert.ok(value.trim(), `${key} must not be empty`);
    }
  });

  test(`${locale}: translations preserve interpolation arguments`, () => {
    for (const [key, value] of Object.entries(source)) {
      assert.deepEqual(
        placeholders(dictionary[key]),
        placeholders(value),
        `${locale}/${key} changes the message arguments`,
      );
    }
  });
}

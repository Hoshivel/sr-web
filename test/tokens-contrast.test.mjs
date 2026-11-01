/*
  The text tokens have to stay readable on the backgrounds they are painted on:
  WCAG 2.2 AA asks 4.5:1 for normal-size text. Lighthouse cannot check this on
  the site, because most sections sit on gradients and canvases, so it scored
  100 while --sr-text-dim was 3.6-4.2:1 on the page (2026-11). These checks read
  the colours straight from tokens.css.
*/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

/** The #rrggbb value of a custom property in tokens.css. */
const color = (name) => {
  const match = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  assert.ok(match, `--${name} is not a #rrggbb colour in tokens.css`);
  return match[1];
};

/** WCAG relative luminance of a #rrggbb colour. */
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

const PAGE = ["sr-void", "sr-bg", "sr-bg-raise", "sr-bg-deep", "sr-surface-1", "sr-surface-2"];
const RAISED = ["sr-surface-3", "sr-surface-4"];

const check = (texts, grounds) => {
  for (const text of texts) {
    for (const ground of grounds) {
      const ratio = contrast(color(text), color(ground));
      assert.ok(ratio >= 4.5, `--${text} on --${ground} is ${ratio.toFixed(2)}:1, below 4.5:1`);
    }
  }
};

test("every text tone reads at 4.5:1 on the page and the first two surfaces", () => {
  check(["sr-text", "sr-text-bright", "sr-text-muted", "sr-text-dim"], PAGE);
});

test("text on the raised surfaces is muted or brighter, and reads at 4.5:1 there", () => {
  check(["sr-text", "sr-text-bright", "sr-text-muted"], RAISED);
});

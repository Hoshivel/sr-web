import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const launcher = readFileSync(
  new URL("../src/components/sections/PlayLauncher.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/sections/PlayLauncher.css", import.meta.url),
  "utf8",
);

test("the game iframe stays covered until its document has loaded and painted", () => {
  assert.match(launcher, /onLoad=\{onFrameLoad\}/);
  assert.match(launcher, /frameLoading && \(/);
  assert.match(launcher, /t\("play\.loading"\)/);
  assert.match(launcher, /requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame/s);
  assert.match(styles, /\.play-frame--game\s*\{[^}]*opacity:\s*0;/s);
  assert.match(styles, /\.play-frame--game\.is-ready\s*\{[^}]*opacity:\s*1;/s);
  assert.match(styles, /\.play-view__loading\s*\{/);
});

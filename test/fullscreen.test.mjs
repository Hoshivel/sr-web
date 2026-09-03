import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const launcher = read("../src/components/sections/PlayLauncher.tsx");
const styles = read("../src/components/sections/PlayLauncher.css");
const probe = read("../src/pages/debug/fullscreen.astro");
const robots = read("../public/robots.txt");

test("the native fullscreen request is sent from the gesture handler, not from an effect", () => {
  // WebKit — every browser engine on iPadOS — grants fullscreen only while it is
  // processing the user gesture. A React passive effect runs in a later task, so
  // a request sent from one is always too late. Guard the call site, because the
  // symptom of regressing it is invisible: the site's own layout still fills the
  // viewport and only the browser chrome stays behind.
  const chooseSize = launcher.match(/const chooseSize = \(mode: SizeMode\) => \{[\s\S]*?\n  \};/);
  assert.ok(chooseSize, "chooseSize not found");
  assert.match(chooseSize[0], /requestFullscreen\(target\)/);

  for (const effect of launcher.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/g)) {
    assert.doesNotMatch(effect[0], /requestFullscreen\(/, "a useEffect requests fullscreen");
  }
});

test("fullscreen is requested on <html>, which the portal switch cannot remount", () => {
  // Entering fullscreen moves the view into a portal, and element → portal is a
  // different fiber type: React drops that DOM node and builds a new one. A
  // request aimed at the old node dies with it.
  assert.match(launcher, /const NATIVE_FULLSCREEN_TARGET = \(\) => document\.documentElement;/);
  assert.match(launcher, /fullscreenElement\(\) === NATIVE_FULLSCREEN_TARGET\(\)/);
  // The layout never depended on the browser agreeing, and still must not.
  assert.match(styles, /\.play-view\.is-fullscreen\s*\{[^}]*position:\s*fixed;/s);
  assert.doesNotMatch(styles, /\.play-view:fullscreen\s*\{/);
});

test("the launcher and the probe share one fullscreen implementation", () => {
  // A probe that exercises different code than production answers a different
  // question than the one being asked.
  assert.match(launcher, /from "@\/lib\/fullscreen"/);
  assert.match(probe, /from "@\/lib\/fullscreen"/);
});

test("the probe sends its request synchronously and covers the whole matrix", () => {
  const probeFn = probe.match(/function probe\(name: string, target: Element\): void \{[\s\S]*?\n      \}/);
  assert.ok(probeFn, "probe() not found");
  assert.doesNotMatch(probeFn[0], /await/, "probe() awaits before requesting");
  assert.match(probeFn[0], /const \{ spelling: used, done \} = requestFullscreen\(target, spelling\(\)\);/);

  // documentElement / body / plain element / canvas answer "does this browser
  // refuse one element or all of them"; the transformed ancestor separates a
  // refusal from sr-web#51's containing-block bug; the two <video> rows are the
  // control that firefox-ios#33992 predicts will succeed where the others fail.
  for (const name of ["html", "body", "div", "div+transform", "canvas", "video", "video-native"]) {
    assert.ok(probe.includes(`name: "${name}"`), `missing probe target ${name}`);
  }
  assert.match(probe, /webkitEnterFullscreen/);

  // Fullscreen is released on its own: a bare <canvas> has no room for an exit
  // button, and iPads have no Esc key.
  assert.match(probe, /await exitFullscreen\(\)/);
});

test("the probe stays out of the site: no layout, no index, no crawler", () => {
  // Not Layout.astro on purpose — no header, no reveal animation, no transformed
  // ancestor. The probe has to answer for the browser alone.
  assert.doesNotMatch(probe, /layouts\/Layout\.astro/);
  assert.match(probe, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(robots, /^Disallow: \/debug\/$/m);
});

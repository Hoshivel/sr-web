/*
  What crawlers and link previews receive, read from the built site.

  The head is assembled from Layout.astro, the dictionaries and `Astro.site`.
  Each piece reads correctly on its own, yet the 2026-10-31 baseline found three
  faults that only show in the output: share images as root-relative paths (link
  previews came without a picture), an og:locale no Open Graph reader accepts, and
  a 404 page that named a canonical URL and hreflang alternates that do not exist.

  These checks run on `dist/` after `astro build` (`npm run build`), so they see
  the bytes that ship. They do not decide wording: titles and descriptions only
  have to be there.
*/
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { LOCALES, HTML_LANG, DEFAULT_LOCALE, localizedPath } from "../../src/i18n/utils.ts";

const root = new URL("../../", import.meta.url);
const dist = fileURLToPath(new URL("dist/", root));
const ORIGIN = /\bsite:\s*"([^"]+)"/.exec(readFileSync(new URL("astro.config.mjs", root), "utf8"))?.[1];
assert.ok(ORIGIN?.startsWith("https://"), "astro.config.mjs must declare an https `site`");
assert.ok(existsSync(join(dist, "index.html")), "dist/ is missing; run `astro build` first");

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const headOf = (html) => html.slice(0, html.indexOf("</head>"));
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
const attr = (tag, key) => {
  const value = new RegExp(`\\s${key}="([^"]*)"`, "i").exec(tag)?.[1];
  return value === undefined ? undefined : decode(value);
};
const metas = (html, key, value) =>
  tags(headOf(html), "meta").filter((m) => attr(m, key) === value).map((m) => attr(m, "content"));
const links = (html, rel) => tags(headOf(html), "link").filter((l) => attr(l, "rel") === rel);
const noindexed = (html) => metas(html, "name", "robots").some((c) => /\bnoindex\b/i.test(c ?? ""));

/** The built file a same-site absolute URL is served from. */
const fileFor = (url) => {
  assert.ok(url.startsWith(`${ORIGIN}/`), `${url} must be an absolute URL on ${ORIGIN}`);
  const path = decodeURIComponent(new URL(url).pathname);
  return join(dist, path.endsWith("/") ? `${path}index.html` : path);
};
/**
 * The document without its comments. Layout's notes ship (one mentions
 * "<title>") and parsers skip them. Plain string search: a regex replace here
 * reads to CodeQL as an incomplete sanitizer.
 */
const withoutComments = (html) => {
  let out = "";
  let at = 0;
  for (let open = html.indexOf("<!--"); open !== -1; open = html.indexOf("<!--", at)) {
    out += html.slice(at, open);
    const close = html.indexOf("-->", open + 4);
    if (close === -1) return out; // an unterminated comment runs to the end
    at = close + 3;
  }
  return out + html.slice(at);
};
const read = (file) => withoutComments(readFileSync(file, "utf8"));

/** Every JSON-LD block in a page, found by plain string search like the comments above. */
const jsonLd = (html) => {
  const open = '<script type="application/ld+json"';
  const blocks = [];
  for (let at = html.indexOf(open); at !== -1; at = html.indexOf(open, at + open.length)) {
    const start = html.indexOf(">", at) + 1;
    const end = html.indexOf("</script>", start);
    assert.ok(start > 0 && end !== -1, "unterminated JSON-LD block");
    blocks.push(JSON.parse(html.slice(start, end)));
  }
  return blocks;
};

const homes = LOCALES.map((locale) => {
  const url = `${ORIGIN}${localizedPath(locale, "/")}`;
  return { locale, url, html: read(fileFor(url)) };
});
const notFound = read(join(dist, "404.html"));

test("each locale's page names itself as canonical and lists every locale", () => {
  for (const { locale, url, html } of homes) {
    const canonical = links(html, "canonical").map((l) => attr(l, "href"));
    assert.deepEqual(canonical, [url], `${locale}: exactly one canonical, pointing at itself`);
    assert.equal(attr(tags(html, "html")[0], "lang"), HTML_LANG[locale], `${locale}: <html lang>`);
    assert.ok(!noindexed(html), `${locale}: must be indexable`);
    assert.deepEqual(metas(html, "property", "og:url"), [url], `${locale}: og:url follows the canonical`);

    const alternates = Object.fromEntries(
      links(html, "alternate")
        .filter((l) => attr(l, "hreflang"))
        .map((l) => [attr(l, "hreflang"), attr(l, "href")]),
    );
    const expected = Object.fromEntries([
      ...LOCALES.map((l) => [HTML_LANG[l], `${ORIGIN}${localizedPath(l, "/")}`]),
      ["x-default", `${ORIGIN}${localizedPath(DEFAULT_LOCALE, "/")}`],
    ]);
    assert.deepEqual(alternates, expected, `${locale}: hreflang must list every locale, itself and x-default`);
    for (const href of Object.values(alternates)) {
      assert.ok(existsSync(fileFor(href)), `${locale}: hreflang target ${href} is not built`);
    }

    const head = headOf(html);
    assert.ok(tags(head, "title").length === 1 && /<title>[^<]+<\/title>/.test(head), `${locale}: one <title> in <head>`);
    const description = metas(html, "name", "description");
    assert.ok(description.length === 1 && description[0].trim(), `${locale}: meta description`);
  }
});

/** Width and height from a PNG's IHDR chunk. */
const pngSize = (file) => {
  const png = readFileSync(file);
  assert.equal(png.toString("latin1", 12, 16), "IHDR", `${file} is not a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

test("share images are absolute URLs to a file that ships, at its real size", () => {
  for (const { locale, html } of homes.concat([{ locale: "404", html: notFound }])) {
    const og = metas(html, "property", "og:image");
    const twitter = metas(html, "name", "twitter:image");
    assert.equal(og.length, 1, `${locale}: one og:image`);
    assert.deepEqual(twitter, og, `${locale}: twitter:image is the same image`);
    const file = fileFor(og[0]);
    assert.ok(existsSync(file), `${locale}: ${og[0]} is not built`);
    const { width, height } = pngSize(file);
    assert.deepEqual(
      [metas(html, "property", "og:image:width"), metas(html, "property", "og:image:height")],
      [[String(width)], [String(height)]],
      `${locale}: og:image:width/height must match the file`,
    );
  }
});

test("og:locale is language_TERRITORY, one per locale", () => {
  const seen = homes.map(({ locale, html }) => {
    const values = metas(html, "property", "og:locale");
    assert.equal(values.length, 1, `${locale}: one og:locale`);
    assert.match(values[0], /^[a-z]{2}_[A-Z]{2}$/, `${locale}: Open Graph readers only accept language_TERRITORY`);
    return values[0];
  });
  assert.equal(new Set(seen).size, seen.length, "two locales share an og:locale");
});

test("the home page's structured data names an image that ships", () => {
  const html = homes.find((h) => h.locale === DEFAULT_LOCALE).html;
  const game = jsonLd(html).flatMap((b) => b["@graph"] ?? [b]).find((n) => n["@type"] === "VideoGame");
  assert.ok(game, "the VideoGame node is missing");
  assert.ok(existsSync(fileFor(game.image ?? "")), `VideoGame.image ${game.image} is not built`);
});

test("the 404 page stays out of the index and names no URL of its own", () => {
  // dist/404.html answers every unmatched path (wrangler `not_found_handling`),
  // and `/404` itself answers 200: any URL it named would be wrong.
  assert.ok(noindexed(notFound), "404.html must carry robots noindex");
  assert.equal(links(notFound, "canonical").length, 0, "404.html must not name a canonical");
  assert.equal(
    links(notFound, "alternate").filter((l) => attr(l, "hreflang")).length,
    0,
    "404.html must not list hreflang alternates",
  );
  assert.equal(metas(notFound, "property", "og:url").length, 0, "404.html must not carry og:url");
});

/** Every built HTML page under dist/, by URL. */
const builtPages = (dir = dist, prefix = "/") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return builtPages(join(dir, entry.name), `${prefix}${entry.name}/`);
    if (entry.name === "index.html") return [`${ORIGIN}${prefix}`];
    return [];
  });

test("the sitemap lists exactly the indexable pages, and robots.txt points at it", () => {
  const sitemap = read(join(dist, "sitemap.xml"));
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1])).sort();
  const indexable = builtPages().filter((url) => !noindexed(read(fileFor(url)))).sort();
  assert.deepEqual(listed, indexable, "sitemap <loc> entries and indexable built pages differ");
  for (const url of homes.map((h) => h.url)) {
    assert.ok(listed.includes(url), `${url} must be in the sitemap`);
  }
  const robots = read(join(dist, "robots.txt"));
  assert.match(robots, new RegExp(`^Sitemap: ${ORIGIN}/sitemap\\.xml$`, "m"));
});

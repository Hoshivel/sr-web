/*
  The portraits the pages declare are the files that ship.

  Every <img> of a portrait carries PORTRAIT_SIZE as its width and height, so the
  page reserves the right shape before the file arrives. Until 2026-11-01 the
  markup said 720x960 while the files were 640x853: the same 3:4 shape, so nothing
  showed -- and nothing would show if a re-export changed the shape either, until
  the layout jumped. This reads the WebP headers instead of trusting a comment.
*/
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { CHARACTERS, PORTRAIT_SIZE } from "../src/config/characters.ts";

/** Canvas size from a WebP file's header (lossy, lossless or extended). */
const webpSize = (bytes) => {
  assert.equal(bytes.toString("latin1", 0, 4), "RIFF");
  assert.equal(bytes.toString("latin1", 8, 12), "WEBP");
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 ") {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
};

test("every character portrait exists at the declared size", () => {
  for (const { id, art } of CHARACTERS) {
    if (art === null) continue;
    const file = new URL(`../public${art}`, import.meta.url);
    assert.ok(existsSync(file), `${id}: ${art} is missing`);
    assert.deepEqual(webpSize(readFileSync(file)), { ...PORTRAIT_SIZE }, `${id}: ${art} is not ${PORTRAIT_SIZE.width}x${PORTRAIT_SIZE.height}`);
  }
});

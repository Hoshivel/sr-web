/*
  The four characters' visual identity and where they appear -- shared by the home
  page's character section, the character index and each character page, so a
  portrait or accent colour changes in one place.

  The copy lives elsewhere: short lines in `src/i18n/ui.ts` (`char.<id>.*`), the
  long-form profile in `src/i18n/pages.ts`. The order here is the order everywhere.
*/
import type { CharacterId } from "../i18n/pages.ts";
import type { Chapter } from "./chapters.ts";

export interface CharacterVisual {
  id: CharacterId;
  /** Element sigil, decorative only. */
  glyph: string;
  /** Element accent colour (a design token), set as `--el` on the element. */
  el: string;
  /** Portrait (webp, PORTRAIT_SIZE); null keeps the procedural placeholder. */
  art: string | null;
  /** The chapter they appear in, or null while it has not opened. */
  chapter: Chapter["id"] | null;
}

export const CHARACTERS: readonly CharacterVisual[] = [
  { id: "hakuto", glyph: "❄", el: "var(--sr-accent-ice)", art: "/art/portraits/hakuto.webp", chapter: "snowpass" },
  { id: "shadow", glyph: "☾", el: "var(--sr-violet-light)", art: "/art/portraits/shadow.webp", chapter: "starseal" },
  { id: "sekien", glyph: "❂", el: "var(--sr-gold)", art: "/art/portraits/sekien.webp", chapter: null },
  { id: "aoiro", glyph: "❦", el: "var(--sr-success)", art: "/art/portraits/aoiro.webp", chapter: "starseal" },
];

/**
 * Pixel size of every file in public/art/portraits/ (3:4). The <img> width and
 * height reserve that shape before the file arrives; CSS decides the drawn size.
 */
export const PORTRAIT_SIZE = { width: 640, height: 853 } as const;

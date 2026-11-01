/*
  The chapters on the Shattered Realms Tree, with their release status.

  Two places show them: the tree island on the home page and the chapter list on
  the world page. They read this one list, so a chapter that opens changes status
  in one place and the two pages cannot disagree about it.

  The copy for each chapter (name, kicker, tagline, story) lives in the i18n
  dictionary under `theme.<id>.*`.
*/

export type ChapterStatus = "root" | "live" | "soon";

export interface Chapter {
  id: "shattered" | "snowpass" | "starseal";
  glyph: string;
  accent: string;
  status: ChapterStatus;
}

// Three nodes: 碎界 ◈ (the origin and root) -> 風雪過境 ❄ (chapter one, live) -> 星痕紀元 ✶ (chapter two, coming).
export const CHAPTERS: readonly Chapter[] = [
  { id: "shattered", glyph: "◈", accent: "#8fa9ff", status: "root" },
  { id: "snowpass", glyph: "❄", accent: "#7fd0ff", status: "live" },
  { id: "starseal", glyph: "✶", accent: "#b48dff", status: "soon" },
] as const;

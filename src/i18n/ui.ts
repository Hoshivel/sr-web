/*
  碎界 sr-web —— 介面文案字典（三語）。

  來源：遊戲 `frontend/src/i18n/translations.ts` 與 `story/themes/<id>/theme.json`
  （官方章節英文名以 theme.json 為準：Snowbound Passage / Age of Starmarks）。
  zh-Hant 為主語言；zh-CN / en 逐鍵齊備（型別強制完整，缺鍵編譯不過）。
*/

export const LOCALES = ["zh-Hant", "zh-CN", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-Hant";

/** URL 路徑前綴（預設語言掛根，其餘掛子路徑）。 */
export const LOCALE_PATH: Record<Locale, string> = {
  "zh-Hant": "",
  "zh-CN": "zh-cn",
  en: "en",
};

/** `<html lang>` 屬性值。 */
export const HTML_LANG: Record<Locale, string> = {
  "zh-Hant": "zh-Hant",
  "zh-CN": "zh-CN",
  en: "en",
};

/** `og:locale` 值。 */
export const OG_LOCALE: Record<Locale, string> = {
  "zh-Hant": "zh_Hant",
  "zh-CN": "zh_CN",
  en: "en_US",
};

/** 語言切換器顯示名（各以自身語言書寫）。 */
export const LOCALE_LABEL: Record<Locale, string> = {
  "zh-Hant": "正體中文",
  "zh-CN": "简体中文",
  en: "English",
};

/** 精簡標籤（header 語言切換器用；完整名放 title/aria-label）。 */
export const LOCALE_SHORT: Record<Locale, string> = {
  "zh-Hant": "繁",
  "zh-CN": "简",
  en: "EN",
};

// zh-Hant 為鍵的權威來源；其餘語言以 Record<UIKey, string> 強制對齊。
const zhHant = {
  "site.name": "碎界",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "破碎星空之下，啟程未竟之旅",
  "site.summary":
    "碎界是一款架空世界觀的 2D 六角格回合制策略遊戲，融合棋類策略、RPG 成長、MOBA 技能設計與開放世界探索。",

  "nav.world": "碎裂",
  "nav.gameplay": "玩法",
  "nav.chapters": "主題曲",
  "nav.characters": "英雄",
  "nav.play": "開始遊戲",

  "cta.play": "開始遊戲",
  "cta.learn": "了解世界",

  "a11y.skip": "跳到主要內容",
  "a11y.langMenu": "切換語言",
  "a11y.home": "回首頁",

  "footer.langLabel": "語言",
  "footer.summary": "《碎界》官方門面。程序化動態即視覺識別。",
  "footer.rights": "碎界 Shattered Realms",
  "footer.note": "本站為前端動效展示；伺服器分流／探活為未來後端。",

  "hero.badge": "旗艦動效建置中",

  // 碎裂 The Shattering（#world）
  "world.eyebrow": "世界觀",
  "world.titleA": "碎裂不是天罰，",
  "world.titleB": "是天地最後一次自救。",
  "world.lead": "當星痕斷裂，大地失去固定的形狀，世界碎成漂浮於虛空的殘片。",
  "world.body":
    "這不是終結——碎裂，是天地保存自身的最後手段。殘片各自漂散，靜待被重新拼合；你將率領探索隊，在虛空中尋回失落的大地。",
} satisfies Record<string, string>;

export type UIKey = keyof typeof zhHant;

const zhCN: Record<UIKey, string> = {
  "site.name": "碎界",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "破碎星空之下，启程未竟之旅",
  "site.summary":
    "碎界是一款架空世界观的 2D 六角格回合制策略游戏，融合棋类策略、RPG 成长、MOBA 技能设计与开放世界探索。",

  "nav.world": "碎裂",
  "nav.gameplay": "玩法",
  "nav.chapters": "主题曲",
  "nav.characters": "英雄",
  "nav.play": "开始游戏",

  "cta.play": "开始游戏",
  "cta.learn": "了解世界",

  "a11y.skip": "跳到主要内容",
  "a11y.langMenu": "切换语言",
  "a11y.home": "回首页",

  "footer.langLabel": "语言",
  "footer.summary": "《碎界》官方门面。程序化动态即视觉识别。",
  "footer.rights": "碎界 Shattered Realms",
  "footer.note": "本站为前端动效展示；服务器分流／探活为未来后端。",

  "hero.badge": "旗舰动效建置中",

  "world.eyebrow": "世界观",
  "world.titleA": "碎裂不是天罚，",
  "world.titleB": "是天地最后一次自救。",
  "world.lead": "当星痕断裂，大地失去固定的形状，世界碎成漂浮于虚空的残片。",
  "world.body":
    "这不是终结——碎裂，是天地保存自身的最后手段。残片各自漂散，静待被重新拼合；你将率领探索队，在虚空中寻回失落的大地。",
};

const en: Record<UIKey, string> = {
  "site.name": "Shattered Realms",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "Beneath a shattered sky, the journey begins",
  "site.summary":
    "Shattered Realms is a 2D hex-grid, turn-based strategy game blending board-game tactics, RPG growth, MOBA-style skills and open-world exploration.",

  "nav.world": "The Shattering",
  "nav.gameplay": "Gameplay",
  "nav.chapters": "Chapters",
  "nav.characters": "Characters",
  "nav.play": "Play",

  "cta.play": "Play now",
  "cta.learn": "Explore the world",

  "a11y.skip": "Skip to main content",
  "a11y.langMenu": "Switch language",
  "a11y.home": "Back to home",

  "footer.langLabel": "Language",
  "footer.summary":
    "The official face of Shattered Realms. Procedural motion is the visual identity.",
  "footer.rights": "Shattered Realms",
  "footer.note":
    "This site is a front-end motion showcase; server routing / health checks are a future backend.",

  "hero.badge": "Flagship motion in progress",

  "world.eyebrow": "The World",
  "world.titleA": "The Shattering was not a punishment —",
  "world.titleB": "it was the world's last act of self-rescue.",
  "world.lead":
    "When the star-seal broke, the land lost its fixed shape and the world scattered into fragments adrift in the void.",
  "world.body":
    "This is not the end. The shattering was how the world preserved itself — the fragments drift apart, waiting to be pieced back together. You will lead the expedition that reclaims the lost lands.",
};

export const ui: Record<Locale, Record<UIKey, string>> = {
  "zh-Hant": zhHant,
  "zh-CN": zhCN,
  en,
};

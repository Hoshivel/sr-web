/*
  碎界 sr-web —— 介面文案字典（四語）。

  來源：遊戲 `frontend/src/i18n/translations.ts` 與 `story/themes/<id>/theme.json`
  （官方章節英文名以 theme.json 為準：Snowstorm's Passage / Age of Starmarks）。
  zh-Hant 為主語言；zh-CN / en / ja 逐鍵齊備（型別強制完整，缺鍵編譯不過）。
  遊戲那一側的字典沒有這層型別（`Dict = Record<string, string>`），所以那裡的
  齊備要另外驗；這裡只要漏一鍵就編不過。
*/

export const LOCALES = ["zh-Hant", "zh-CN", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-Hant";

/** URL 路徑前綴（預設語言掛根，其餘掛子路徑）。 */
export const LOCALE_PATH: Record<Locale, string> = {
  "zh-Hant": "",
  "zh-CN": "zh-cn",
  en: "en",
  ja: "ja",
};

/** `<html lang>` 屬性值。 */
export const HTML_LANG: Record<Locale, string> = {
  "zh-Hant": "zh-Hant",
  "zh-CN": "zh-CN",
  en: "en",
  ja: "ja",
};

/** `og:locale` 值。 */
export const OG_LOCALE: Record<Locale, string> = {
  "zh-Hant": "zh_Hant",
  "zh-CN": "zh_CN",
  en: "en_US",
  ja: "ja_JP",
};

/** 語言切換器顯示名（各以自身語言書寫）。 */
export const LOCALE_LABEL: Record<Locale, string> = {
  "zh-Hant": "正體中文",
  "zh-CN": "简体中文",
  en: "English",
  ja: "日本語",
};

/** 精簡標籤（header 語言切換器用；完整名放 title/aria-label）。 */
export const LOCALE_SHORT: Record<Locale, string> = {
  "zh-Hant": "繁",
  "zh-CN": "简",
  en: "EN",
  ja: "日",
};

// zh-Hant 為鍵的權威來源；其餘語言以 Record<UIKey, string> 強制對齊。
const zhHant = {
  "site.name": "碎界",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "破碎星空之下，啟程未竟之旅",
  "site.summary":
    "《碎界》是一款可在瀏覽器遊玩的 2D 六角格回合制策略遊戲。構築手牌、調度角色，在交錯的旅途中拼回破碎的世界。",

  "nav.world": "碎裂",
  "nav.gameplay": "玩法",
  "nav.chapters": "碎界之樹",
  "nav.characters": "角色",
  "nav.play": "開始遊戲",

  "cta.play": "開始遊戲",
  "cta.learn": "探索碎界",

  "a11y.skip": "跳到主要內容",
  "a11y.langMenu": "切換語言",
  "a11y.home": "回首頁",
  "a11y.menu": "選單",
  // 同頁有多個 navigation 地標：可及名稱必須互相區別，否則螢幕閱讀器分不出來。
  "a11y.primaryNav": "主要導覽",
  "a11y.footerNav": "頁尾導覽",

  "footer.langLabel": "語言",
  "footer.summary": "破碎星空之下，啟程未竟之旅",
  "footer.rights": "碎界 Shattered Realms",

  "hero.badge": "正式上線",

  // 預覽 Teaser（#teaser）—— 只有眉標與播放器，不加說明文字
  "teaser.eyebrow": "預覽",
  "teaser.videoLabel": "碎界預覽片段",
  "teaser.prev": "上一段",
  "teaser.next": "下一段",
  "teaser.play": "播放",
  "teaser.pause": "暫停",
  "teaser.mute": "靜音",
  "teaser.unmute": "取消靜音",
  "teaser.volume": "音量",
  "teaser.seek": "播放進度",
  "teaser.fullscreen": "全螢幕",
  "teaser.exitFullscreen": "離開全螢幕",

  // 碎裂 The Shattering（#world）
  "world.eyebrow": "世界觀",
  "world.titleA": "碎裂不是天罰，",
  "world.titleB": "是天地最後一次自救。",
  "world.lead": "當星痕斷裂，大地失去固定的形狀，世界碎成漂浮於虛空的殘片。",
  // 本作的核心命題：沒有主角，也就沒有中心。整站敘事都由這句話往下長。
  "world.claim": "沒有誰站在世界的中心。",
  "world.ensemble":
    "每個人都懷著自己的理由前行；當道路交錯，失落的大地與碎裂的真相也逐漸顯形。",

  // 核心玩法 Gameplay（#gameplay）—— 只留標題與四張卡的焦點，不做解釋
  "gameplay.eyebrow": "核心玩法",
  "gameplay.titleA": "手牌、走位與技能，",
  "gameplay.titleB": "每一回合都能改寫戰場",
  "gameplay.cards.name": "牌組構築",
  "gameplay.cards.claim": "帶著戰術入場，臨場取捨每一張牌",
  "gameplay.board.name": "六角走位",
  "gameplay.board.claim": "搶位置、卡路線，讓站位改變攻防",
  "gameplay.skills.name": "角色技能",
  "gameplay.skills.claim": "連攜、壓制與反擊，掌握交戰節奏",
  "gameplay.srpg.name": "回合戰術",
  "gameplay.srpg.claim": "讀懂地形、射程與行動順序",

  // 角色 Characters（#characters）
  // 資訊順序刻意是「先是誰，再能打什麼」：role → seeking 為主，fantasy 降為次級。
  "char.eyebrow": "角色",
  "char.titleA": "交錯的旅途，",
  "char.titleB": "各自走向不同的答案",
  "char.lead":
    "有人尋找失去的人，有人追逐仍有光的碎片；每一次相遇，都會在彼此的旅途中留下痕跡。",
  "char.combat": "戰鬥",
  "char.slotNote": "角色形象即將公開",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境之棠",
  "char.hakuto.element": "冰霜 · 純淨",
  "char.hakuto.role": "〈風雪過境〉主要視角",
  "char.hakuto.seeking":
    "她在尋找一個她沒能護住的人。所有人都說那個人早已不在了——而她的傷口，比她的誕生更老。",
  "char.hakuto.fantasy": "在後排累積冰霜、引發凍結，封住敵人的前進路線。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影之君主",
  "char.shadow.element": "暗影 · 侵蝕",
  "char.shadow.role": "〈星痕紀元〉交錯而過",
  "char.shadow.seeking": "他在尋找一把鑰匙。他沒說那把鑰匙開的是什麼。",
  "char.shadow.fantasy": "穿梭陰影、累積侵蝕，再以〈萬影歸一〉完成收割。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎陽之子",
  "char.sekien.element": "烈焰 · 重生",
  "char.sekien.role": "篇章未啟 · 南方的暖光",
  "char.sekien.seeking":
    "他在尋找還照得到太陽的那片碎界。當人們習慣了在殘骸上活著，他問的是：還記不記得天亮的樣子。",
  "char.sekien.fantasy": "切換弓劍、累積餘燼；即使倒下，也能化作鳳凰重燃戰局。",
  "char.aoiro.name": "青蘿",
  "char.aoiro.epithet": "噬星荊棘",
  "char.aoiro.element": "劇毒 · 藤蔓",
  "char.aoiro.role": "〈星痕紀元〉同行一程",
  "char.aoiro.seeking":
    "她在尋找一個不必靠誰記得也活得下去的位置。聚落曾把她連著那塊地一起切走——所以她受僱同行，不說是同伴。",
  "char.aoiro.fantasy": "以毒素逼近臨界、用藤蔓封鎖退路，再以連射引爆攻勢。",

  // 碎界之樹 Chapters（#chapters）
  "chapters.eyebrow": "篇章",
  "chapters.titleA": "沿著碎界之樹，",
  "chapters.titleB": "看見旅途交會",
  "chapters.lead":
    "每一片碎界都承載一段旅途。當道路交錯，失落的大地也逐漸拼回原貌。",
  "chapters.hint": "拖曳撥動 · 點按展開",
  "chapters.status.root": "世界之根",
  "chapters.status.live": "已上線",
  "chapters.status.soon": "即將開放",
  "chapters.close": "關閉",
  "theme.shattered.name": "碎界",
  "theme.shattered.kicker": "起源",
  "theme.shattered.tagline": "破碎星空之下，萬章由此而生。",
  "theme.shattered.story":
    "來自各片碎界的人們踏上各自的旅途，在漂浮於虛空的碎片間相遇，拼回失落的大地；後續篇章都由這些交會展開。",
  "theme.snowpass.name": "風雪過境",
  "theme.snowpass.kicker": "第一章",
  "theme.snowpass.tagline": "世界破碎後的第一場暴風雪，與冰原上僅存的善意。",
  "theme.snowpass.story":
    "白棠誕生於冰原深處的一朵白棠花，在暴風雪吞沒大地後，守著世界最後的善意與希望。",
  "theme.starseal.name": "星痕紀元",
  "theme.starseal.kicker": "第二章",
  "theme.starseal.tagline": "星辰已經消失，只剩下痕跡。",
  "theme.starseal.story":
    "星痕曾把河流、山脈、森林與命運刻在天空。當它碎裂，觀星者踏上重塑世界法則的旅程。",

  // 開始遊戲 Play（#play）
  "play.eyebrow": "開始遊戲",
  "play.titleA": "備妥戰術，",
  "play.titleB": "踏入戰場",
  "play.serversTitle": "連線地區",
  "play.recommended": "最佳連線",
  "play.enter": "進入戰場",
  "play.disconnect": "離開遊戲",
  "play.frameTitle": "碎界遊戲畫面",
  "play.unknownRegion": "其他地區",
  "play.defaultRegion": "預設（自動分流）",
  "play.viewSize": "顯示模式",
  "play.size.normal": "標準",
  "play.size.theater": "寬螢幕",
  "play.size.fullscreen": "全螢幕",
  "play.newTab": "在新分頁遊玩",
  "play.unavailable": "目前沒有可進入的遊戲地區",
  "play.unavailableHint": "請稍後再試，或重新整理可用地區。",
  "play.retry": "重新連線",
  "play.stale": "連線暫時不穩，已為你保留最近可用的地區。",
} satisfies Record<string, string>;

export type UIKey = keyof typeof zhHant;

const zhCN: Record<UIKey, string> = {
  "site.name": "碎界",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "破碎星空之下，启程未竟之旅",
  "site.summary":
    "《碎界》是一款可在浏览器游玩的 2D 六角格回合制策略游戏。构筑手牌、调度角色，在交错的旅途中拼回破碎的世界。",

  "nav.world": "碎裂",
  "nav.gameplay": "玩法",
  "nav.chapters": "碎界之树",
  "nav.characters": "角色",
  "nav.play": "开始游戏",

  "cta.play": "开始游戏",
  "cta.learn": "探索碎界",

  "a11y.skip": "跳到主要内容",
  "a11y.langMenu": "切换语言",
  "a11y.home": "回首页",
  "a11y.menu": "菜单",
  "a11y.primaryNav": "主要导览",
  "a11y.footerNav": "页尾导览",

  "footer.langLabel": "语言",
  "footer.summary": "破碎星空之下，启程未竟之旅",
  "footer.rights": "碎界 Shattered Realms",

  "hero.badge": "正式上线",

  "teaser.eyebrow": "预览",
  "teaser.videoLabel": "碎界预览片段",
  "teaser.prev": "上一段",
  "teaser.next": "下一段",
  "teaser.play": "播放",
  "teaser.pause": "暂停",
  "teaser.mute": "静音",
  "teaser.unmute": "取消静音",
  "teaser.volume": "音量",
  "teaser.seek": "播放进度",
  "teaser.fullscreen": "全屏",
  "teaser.exitFullscreen": "退出全屏",

  "world.eyebrow": "世界观",
  "world.titleA": "碎裂不是天罚，",
  "world.titleB": "是天地最后一次自救。",
  "world.lead": "当星痕断裂，大地失去固定的形状，世界碎成漂浮于虚空的残片。",
  "world.claim": "没有谁站在世界的中心。",
  "world.ensemble":
    "每个人都怀着自己的理由前行；当道路交错，失落的大地与碎裂的真相也逐渐显形。",

  "gameplay.eyebrow": "核心玩法",
  "gameplay.titleA": "手牌、走位与技能，",
  "gameplay.titleB": "每一回合都能改写战场",
  "gameplay.cards.name": "牌组构筑",
  "gameplay.cards.claim": "带着战术入场，临场取舍每一张牌",
  "gameplay.board.name": "六角走位",
  "gameplay.board.claim": "抢位置、卡路线，让站位改变攻防",
  "gameplay.skills.name": "角色技能",
  "gameplay.skills.claim": "连携、压制与反击，掌握交战节奏",
  "gameplay.srpg.name": "回合战术",
  "gameplay.srpg.claim": "读懂地形、射程与行动顺序",

  "char.eyebrow": "角色",
  "char.titleA": "交错的旅途，",
  "char.titleB": "各自走向不同的答案",
  "char.lead":
    "有人寻找失去的人，有人追逐仍有光的碎片；每一次相遇，都会在彼此的旅途中留下痕迹。",
  "char.combat": "战斗",
  "char.slotNote": "角色形象即将公开",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境之棠",
  "char.hakuto.element": "冰霜 · 纯净",
  "char.hakuto.role": "〈风雪过境〉主要视角",
  "char.hakuto.seeking":
    "她在寻找一个她没能护住的人。所有人都说那个人早已不在了——而她的伤口，比她的诞生更老。",
  "char.hakuto.fantasy": "在后排累积冰霜、引发冻结，封住敌人的前进路线。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影之君主",
  "char.shadow.element": "暗影 · 侵蚀",
  "char.shadow.role": "〈星痕纪元〉交错而过",
  "char.shadow.seeking": "他在寻找一把钥匙。他没说那把钥匙开的是什么。",
  "char.shadow.fantasy": "穿梭阴影、累积侵蚀，再以〈万影归一〉完成收割。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎阳之子",
  "char.sekien.element": "烈焰 · 重生",
  "char.sekien.role": "篇章未启 · 南方的暖光",
  "char.sekien.seeking":
    "他在寻找还照得到太阳的那片碎界。当人们习惯了在残骸上活着，他问的是：还记不记得天亮的样子。",
  "char.sekien.fantasy": "切换弓剑、累积余烬；即使倒下，也能化作凤凰重燃战局。",
  "char.aoiro.name": "青萝",
  "char.aoiro.epithet": "噬星荆棘",
  "char.aoiro.element": "剧毒 · 藤蔓",
  "char.aoiro.role": "〈星痕纪元〉同行一程",
  "char.aoiro.seeking":
    "她在寻找一个不必靠谁记得也活得下去的位置。聚落曾把她连着那块地一起切走——所以她受雇同行，不说是同伴。",
  "char.aoiro.fantasy": "以毒素逼近临界、用藤蔓封锁退路，再以连射引爆攻势。",

  "chapters.eyebrow": "篇章",
  "chapters.titleA": "沿着碎界之树，",
  "chapters.titleB": "看见旅途交会",
  "chapters.lead":
    "每一片碎界都承载一段旅途。当道路交错，失落的大地也逐渐拼回原貌。",
  "chapters.hint": "拖曳拨动 · 点按展开",
  "chapters.status.root": "世界之根",
  "chapters.status.live": "已上线",
  "chapters.status.soon": "即将开放",
  "chapters.close": "关闭",
  "theme.shattered.name": "碎界",
  "theme.shattered.kicker": "起源",
  "theme.shattered.tagline": "破碎星空之下，万章由此而生。",
  "theme.shattered.story":
    "来自各片碎界的人们踏上各自的旅途，在漂浮于虚空的碎片间相遇，拼回失落的大地；后续篇章都由这些交会展开。",
  "theme.snowpass.name": "风雪过境",
  "theme.snowpass.kicker": "第一章",
  "theme.snowpass.tagline": "世界破碎后的第一场暴风雪，与冰原上仅存的善意。",
  "theme.snowpass.story":
    "白棠诞生于冰原深处的一朵白棠花，在暴风雪吞没大地后，守着世界最后的善意与希望。",
  "theme.starseal.name": "星痕纪元",
  "theme.starseal.kicker": "第二章",
  "theme.starseal.tagline": "星辰已经消失，只剩下痕迹。",
  "theme.starseal.story":
    "星痕曾把河流、山脉、森林与命运刻在天空。当它碎裂，观星者踏上重塑世界法则的旅程。",

  "play.eyebrow": "开始游戏",
  "play.titleA": "备妥战术，",
  "play.titleB": "踏入战场",
  "play.serversTitle": "连接地区",
  "play.recommended": "最佳连接",
  "play.enter": "进入战场",
  "play.disconnect": "离开游戏",
  "play.frameTitle": "碎界游戏画面",
  "play.unknownRegion": "其他地区",
  "play.defaultRegion": "默认（自动分流）",
  "play.viewSize": "显示模式",
  "play.size.normal": "标准",
  "play.size.theater": "宽屏",
  "play.size.fullscreen": "全屏",
  "play.newTab": "在新标签页游玩",
  "play.unavailable": "目前没有可进入的游戏地区",
  "play.unavailableHint": "请稍后再试，或刷新可用地区。",
  "play.retry": "重新连接",
  "play.stale": "连接暂时不稳定，已为你保留最近可用的地区。",
};

const en: Record<UIKey, string> = {
  "site.name": "Shattered Realms",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "Beneath a shattered sky, the journey begins",
  "site.summary":
    "Shattered Realms is a browser-playable 2D turn-based strategy game on a hex grid. Build your hand, position your cast, and piece together a broken world through intersecting journeys.",

  "nav.world": "The Shattering",
  "nav.gameplay": "Gameplay",
  "nav.chapters": "World Tree",
  "nav.characters": "Cast",
  "nav.play": "Play",

  "cta.play": "Play now",
  "cta.learn": "Explore the world",

  "a11y.skip": "Skip to main content",
  "a11y.langMenu": "Switch language",
  "a11y.home": "Back to home",
  "a11y.menu": "Menu",
  "a11y.primaryNav": "Primary navigation",
  "a11y.footerNav": "Footer navigation",

  "footer.langLabel": "Language",
  "footer.summary": "Beneath a shattered sky, the journey begins",
  "footer.rights": "Shattered Realms",

  "hero.badge": "Now live",

  "teaser.eyebrow": "Preview",
  "teaser.videoLabel": "Shattered Realms preview clip",
  "teaser.prev": "Previous clip",
  "teaser.next": "Next clip",
  "teaser.play": "Play",
  "teaser.pause": "Pause",
  "teaser.mute": "Mute",
  "teaser.unmute": "Unmute",
  "teaser.volume": "Volume",
  "teaser.seek": "Seek",
  "teaser.fullscreen": "Fullscreen",
  "teaser.exitFullscreen": "Exit fullscreen",

  "world.eyebrow": "The World",
  "world.titleA": "The Shattering was not a punishment —",
  "world.titleB": "it was the world's final attempt to save itself.",
  "world.lead":
    "When the starmarks broke, the land lost its fixed shape and the world scattered into fragments adrift in the void.",
  "world.claim": "Nobody stands at the center of this world.",
  "world.ensemble":
    "Everyone travels for a reason of their own. As their roads cross, lost lands — and the truth of the Shattering — come into view.",

  "gameplay.eyebrow": "Core Gameplay",
  "gameplay.titleA": "Cards, position and skills — ",
  "gameplay.titleB": "every turn can reshape the field",
  "gameplay.cards.name": "Deckbuilding",
  "gameplay.cards.claim": "Build your plan, then adapt card by card",
  "gameplay.board.name": "Hex Positioning",
  "gameplay.board.claim": "Claim space, block routes and turn position into advantage",
  "gameplay.skills.name": "Character Skills",
  "gameplay.skills.claim": "Chain skills, apply pressure and counter at the right moment",
  "gameplay.srpg.name": "Turn Tactics",
  "gameplay.srpg.claim": "Read the terrain, range and action order",

  "char.eyebrow": "Cast",
  "char.titleA": "Journeys that cross, ",
  "char.titleB": "each walking toward a different answer",
  "char.lead":
    "Some search for people they lost; others chase fragments that still hold light. Every meeting leaves a mark on the journeys that follow.",
  "char.combat": "In combat",
  "char.slotNote": "Character reveal coming soon",
  "char.hakuto.name": "Hakuto",
  "char.hakuto.epithet": "Bloom of the Snowbound Realm",
  "char.hakuto.element": "Frost · Purity",
  "char.hakuto.role": "Viewpoint of Snowstorm's Passage",
  "char.hakuto.seeking":
    "She is looking for someone she failed to protect. Everyone tells her that person is long gone — and her wound is older than her own birth.",
  "char.hakuto.fantasy":
    "A backline frost caster who builds toward Freeze and locks down enemy routes.",
  "char.shadow.name": "Dark Shadow",
  "char.shadow.epithet": "Lord of Shadows",
  "char.shadow.element": "Shadow · Erosion",
  "char.shadow.role": "Crossing through the Age of Starmarks",
  "char.shadow.seeking":
    "He is looking for a key. He won't say what it opens.",
  "char.shadow.fantasy":
    "Moves through shadow, builds Erosion, then finishes the fight with All Shadows as One.",
  "char.sekien.name": "Sekien",
  "char.sekien.epithet": "Son of the Blazing Sun",
  "char.sekien.element": "Flame · Rebirth",
  "char.sekien.role": "Chapter unopened · a warm light to the south",
  "char.sekien.seeking":
    "He is looking for the fragment the sun still reaches. Where people have grown used to living on wreckage, his question is whether they remember what daybreak looked like.",
  "char.sekien.fantasy":
    "Switches between bow and sword, banks Ember and can rise as a phoenix to reignite the fight.",
  "char.aoiro.name": "Aoiro",
  "char.aoiro.epithet": "Star-Devouring Bramble",
  "char.aoiro.element": "Venom · Vines",
  "char.aoiro.role": "Walking one stretch of the Age of Starmarks",
  "char.aoiro.seeking":
    "She is looking for a place to live that depends on nobody remembering her. A settlement once cut her away along with the ground she stood on — so she travels for hire, and won't call it company.",
  "char.aoiro.fantasy":
    "Pushes venom to its limit, seals escape routes with vines and detonates the pressure with rapid fire.",

  "chapters.eyebrow": "Chapters",
  "chapters.titleA": "Follow the World Tree, ",
  "chapters.titleB": "see where journeys cross",
  "chapters.lead":
    "Every realm-fragment holds a journey. As the roads cross, the lost world begins to take shape again.",
  "chapters.hint": "Drag to stir · tap to unfold",
  "chapters.status.root": "World Root",
  "chapters.status.live": "Live",
  "chapters.status.soon": "Coming soon",
  "chapters.close": "Close",
  "theme.shattered.name": "Shattered Realms",
  "theme.shattered.kicker": "Origin",
  "theme.shattered.tagline": "Beneath a shattered sky, every chapter is born.",
  "theme.shattered.story":
    "Across fragments adrift in the void, many journeys meet and piece the lost lands back together; every later chapter grows from these crossings.",
  "theme.snowpass.name": "Snowstorm's Passage",
  "theme.snowpass.kicker": "Chapter 1",
  "theme.snowpass.tagline":
    "The first blizzard after the world shattered — and the last kindness left on the ice.",
  "theme.snowpass.story":
    "Born from a lone snow-plum blossom deep in the ice, Hakuto guards the world's last kindness after the blizzard swallows the land.",
  "theme.starseal.name": "Age of Starmarks",
  "theme.starseal.kicker": "Chapter 2",
  "theme.starseal.tagline": "The stars are gone; only their marks remain.",
  "theme.starseal.story":
    "Starmarks once inscribed rivers, mountains, forests and fate across the sky. When they shatter, a Stargazer sets out to reshape the world's laws.",

  "play.eyebrow": "Play",
  "play.titleA": "Ready your tactics, ",
  "play.titleB": "step onto the battlefield",
  "play.serversTitle": "Connection regions",
  "play.recommended": "Best connection",
  "play.enter": "Enter the battlefield",
  "play.disconnect": "Leave game",
  "play.frameTitle": "Shattered Realms game",
  "play.unknownRegion": "Other region",
  "play.defaultRegion": "Default (auto-routed)",
  "play.viewSize": "Display mode",
  "play.size.normal": "Standard",
  "play.size.theater": "Wide",
  "play.size.fullscreen": "Fullscreen",
  "play.newTab": "Play in a new tab",
  "play.unavailable": "No game region is available",
  "play.unavailableHint": "Please try again shortly, or refresh the available regions.",
  "play.retry": "Reconnect",
  "play.stale": "The connection is unstable, so the most recently available regions are still shown.",
};

const ja: Record<UIKey, string> = {
  "site.name": "砕界",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "砕けた星空の下、未完の旅へ",
  "site.summary":
    "『砕界』はブラウザで遊べる 2D ヘックス制ターンベース・ストラテジー。手札を組み、仲間を配し、交わる旅路の果てに砕けた世界を繋ぎ直す。",

  // 事件（zh「碎裂」／en "The Shattering"）。ブランドの「砕界」とは別語なので、
  // 一文字違いで紛れないよう「砕裂」を当てる。
  "nav.world": "砕裂",
  "nav.gameplay": "遊び方",
  "nav.chapters": "砕界の樹",
  "nav.characters": "キャラクター",
  "nav.play": "ゲームを始める",

  "cta.play": "ゲームを始める",
  "cta.learn": "世界を知る",

  "a11y.skip": "本文へスキップ",
  "a11y.langMenu": "言語を切り替える",
  "a11y.home": "ホームへ戻る",
  "a11y.menu": "メニュー",
  "a11y.primaryNav": "メインナビゲーション",
  "a11y.footerNav": "フッターナビゲーション",

  "footer.langLabel": "言語",
  "footer.summary": "砕けた星空の下、未完の旅へ",
  "footer.rights": "砕界 Shattered Realms",

  "hero.badge": "正式サービス中",

  "teaser.eyebrow": "プレビュー",
  "teaser.videoLabel": "砕界プレビュー映像",
  "teaser.prev": "前のクリップ",
  "teaser.next": "次のクリップ",
  "teaser.play": "再生",
  "teaser.pause": "一時停止",
  "teaser.mute": "ミュート",
  "teaser.unmute": "ミュート解除",
  "teaser.volume": "音量",
  "teaser.seek": "再生位置",
  "teaser.fullscreen": "全画面",
  "teaser.exitFullscreen": "全画面を終了",

  "world.eyebrow": "世界観",
  "world.titleA": "砕けたのは天罰ではなく、",
  "world.titleB": "天地が自らを救う最後の手だった。",
  "world.lead":
    "星痕が断たれ、大地は定まった形を失い、世界は虚空に漂う欠片へと砕けた。",
  "world.claim": "この世界の中心に立つ者は、誰もいない。",
  "world.ensemble":
    "誰もが自分の理由を抱いて進む。道が交わるとき、失われた大地と砕けた真実が、少しずつ姿を現す。",

  "gameplay.eyebrow": "コアゲームプレイ",
  "gameplay.titleA": "手札、立ち回り、そして技能。",
  "gameplay.titleB": "一手ごとに戦場は書き換わる",
  "gameplay.cards.name": "デッキ構築",
  "gameplay.cards.claim": "戦術を携えて挑み、一枚ごとにその場で選び取る",
  "gameplay.board.name": "ヘックスの立ち回り",
  "gameplay.board.claim": "位置を奪い、道を塞ぎ、立ち位置で攻防を変える",
  "gameplay.skills.name": "キャラクター技能",
  "gameplay.skills.claim": "連携・制圧・反撃で、交戦の呼吸を握る",
  "gameplay.srpg.name": "ターン戦術",
  "gameplay.srpg.claim": "地形と射程、そして行動順を読み解く",

  "char.eyebrow": "キャラクター",
  "char.titleA": "交わる旅路の先で、",
  "char.titleB": "それぞれが違う答えへ向かう",
  "char.lead":
    "失った人を探す者、まだ光の残る欠片を追う者。出会いのひとつひとつが、互いの旅路に痕を残していく。",
  "char.combat": "戦闘では",
  "char.slotNote": "キャラクタービジュアルは近日公開",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境の棠",
  "char.hakuto.element": "氷霜 · 純潔",
  "char.hakuto.role": "〈風雪の通り道〉主視点",
  "char.hakuto.seeking":
    "彼女は、守りきれなかった一人を探している。その人はとうにいないと誰もが言う——そして彼女の傷は、彼女の誕生より古い。",
  "char.hakuto.fantasy": "後衛で氷霜を重ねて凍結を起こし、敵の進路を封じる。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影の君主",
  "char.shadow.element": "暗影 · 侵蝕",
  "char.shadow.role": "〈星痕の紀元〉で交差する",
  "char.shadow.seeking": "彼は一本の鍵を探している。それが何を開けるのかは、語らない。",
  "char.shadow.fantasy": "影を渡り、侵蝕を重ね、〈万影帰一〉で刈り取る。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎陽の子",
  "char.sekien.element": "烈焰 · 再生",
  "char.sekien.role": "章は未だ開かれず · 南の暖かな光",
  "char.sekien.seeking":
    "彼は、まだ陽の届く砕界を探している。人々が残骸の上で生きることに慣れてしまった今、彼が問うのは——夜明けの姿を、まだ覚えているか。",
  "char.sekien.fantasy":
    "弓と剣を切り替えて余燼を溜め、倒れてもなお鳳凰となって戦局を燃え直す。",
  "char.aoiro.name": "青蘿",
  "char.aoiro.epithet": "星を喰らう荊",
  "char.aoiro.element": "劇毒 · 蔓",
  "char.aoiro.role": "〈星痕の紀元〉を一区間ともに往く",
  "char.aoiro.seeking":
    "彼女は、誰かに覚えていてもらわなくても生きていける居場所を探している。集落はかつて、彼女を足もとの土地ごと切り離した——だから雇われて同行し、仲間とは言わない。",
  "char.aoiro.fantasy": "毒を臨界まで押し上げ、蔓で退路を塞ぎ、連射で一気に爆ぜさせる。",

  "chapters.eyebrow": "章",
  "chapters.titleA": "砕界の樹をたどり、",
  "chapters.titleB": "旅路の交わる場所を見る",
  "chapters.lead":
    "砕界の欠片は、それぞれがひとつの旅路を宿している。道が交わるとき、失われた大地は少しずつ元の姿を取り戻す。",
  "chapters.hint": "ドラッグで揺らす · タップで開く",
  "chapters.status.root": "世界の根",
  "chapters.status.live": "公開中",
  "chapters.status.soon": "近日公開",
  "chapters.close": "閉じる",
  "theme.shattered.name": "砕界",
  "theme.shattered.kicker": "起源",
  "theme.shattered.tagline": "砕けた星空の下、すべての章がここから生まれる。",
  "theme.shattered.story":
    "虚空に漂う欠片を越えて、それぞれの旅路が交わり、失われた大地を繋ぎ直していく。以降のすべての章は、こうした出会いから広がっていく。",
  "theme.snowpass.name": "風雪の通り道",
  "theme.snowpass.kicker": "第一章",
  "theme.snowpass.tagline":
    "世界が砕けたのちの、最初の吹雪。そして氷原に残された、最後の優しさ。",
  "theme.snowpass.story":
    "氷原の奥に咲いた一輪の白棠花から生まれた白棠は、吹雪が大地を呑み込んだのちも、世界最後の善意と希望を守り続けている。",
  "theme.starseal.name": "星痕の紀元",
  "theme.starseal.kicker": "第二章",
  "theme.starseal.tagline": "星はもう消えた。残されたのは、その痕だけ。",
  "theme.starseal.story":
    "星痕はかつて、河も山も森も運命も、すべて空に刻んでいた。それが砕けたとき、観星者は世界の理を編み直す旅に出る。",

  "play.eyebrow": "ゲームを始める",
  "play.titleA": "戦術を整え、",
  "play.titleB": "戦場へ踏み出す",
  "play.serversTitle": "接続地域",
  "play.recommended": "最適な接続",
  "play.enter": "戦場へ入る",
  "play.disconnect": "ゲームを離れる",
  "play.frameTitle": "砕界のゲーム画面",
  "play.unknownRegion": "その他の地域",
  "play.defaultRegion": "デフォルト（自動振り分け）",
  "play.viewSize": "表示モード",
  "play.size.normal": "標準",
  "play.size.theater": "ワイド",
  "play.size.fullscreen": "全画面",
  "play.newTab": "新しいタブで遊ぶ",
  "play.unavailable": "現在、入場できるゲーム地域がありません",
  "play.unavailableHint": "しばらくしてから、または利用可能な地域を再取得してお試しください。",
  "play.retry": "再接続",
  "play.stale": "接続が一時的に不安定なため、直近で利用できた地域を表示しています。",
};

export const ui: Record<Locale, Record<UIKey, string>> = {
  "zh-Hant": zhHant,
  "zh-CN": zhCN,
  en,
  ja,
};

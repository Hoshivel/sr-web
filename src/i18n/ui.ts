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
    "碎界是一款架空世界觀的 2D 六角格回合制策略遊戲：手牌、走棋、MOBA 技能與對抗、SRPG 四者合一。這裡沒有誰站在世界的中心——故事沿著彼此交錯的視角展開。",

  "nav.world": "碎裂",
  "nav.gameplay": "玩法",
  "nav.chapters": "碎界之樹",
  "nav.characters": "角色",
  "nav.play": "開始遊戲",

  "cta.play": "開始遊戲",
  "cta.learn": "了解世界",

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
  "teaser.seek": "播放進度",
  "teaser.fullscreen": "全螢幕",
  "teaser.exitFullscreen": "離開全螢幕",

  // 碎裂 The Shattering（#world）
  "world.eyebrow": "世界觀",
  "world.titleA": "碎裂不是天罰，",
  "world.titleB": "是天地最後一次自救。",
  "world.lead": "當星痕斷裂，大地失去固定的形狀，世界碎成漂浮於虛空的殘片。",
  "world.body": "這不是終結——碎裂，是天地保存自身的最後手段。",
  // 本作的核心命題：沒有主角，也就沒有中心。整站敘事都由這句話往下長。
  "world.claim": "沒有誰站在世界的中心。",
  "world.ensemble":
    "不同的人懷著各自的目的前行；故事沿著彼此交錯的視角展開，逐漸拼起失落的大地與世界破碎的真相。",

  // 核心玩法 Gameplay（#gameplay）—— 只留標題與四張卡的焦點，不做解釋
  "gameplay.eyebrow": "核心玩法",
  "gameplay.titleA": "手牌 × 走棋 × MOBA × SRPG，",
  "gameplay.titleB": "不套進既有類型的答案",
  "gameplay.cards.name": "手牌",
  "gameplay.cards.claim": "戰前構築與局內資源",
  "gameplay.board.name": "走棋",
  "gameplay.board.claim": "位置本身就是選擇",
  "gameplay.skills.name": "MOBA 技能與對抗",
  "gameplay.skills.claim": "技能、配合與戰場節奏",
  "gameplay.srpg.name": "SRPG",
  "gameplay.srpg.claim": "地形、範圍與回合規劃",

  // 角色 Characters（#characters）
  // 資訊順序刻意是「先是誰，再能打什麼」：role → seeking 為主，fantasy 降為次級。
  "char.eyebrow": "角色",
  "char.titleA": "交錯的旅途，",
  "char.titleB": "各自走向不同的答案",
  "char.lead":
    "他們不是一支隊伍的四個位置。有人在找回不來的人，有人在找還亮著的碎片——路偶爾交錯，答案各自不同。",
  "char.combat": "戰鬥",
  "char.slotNote": "立繪待接 · 程序化佔位",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境之棠",
  "char.hakuto.element": "冰霜 · 純淨",
  "char.hakuto.role": "〈風雪過境〉主要視角",
  "char.hakuto.seeking":
    "她在尋找一個她沒能護住的人。所有人都說那個人早已不在了——而她的傷口，比她的誕生更老。",
  "char.hakuto.fantasy": "高 EP 的後排法系，以冰霜疊加至凍結，把敵人牢牢定在原地。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影之君主",
  "char.shadow.element": "暗影 · 侵蝕",
  "char.shadow.role": "〈星痕紀元〉交錯而過",
  "char.shadow.seeking": "他在尋找一把鑰匙。他沒說那把鑰匙開的是什麼。",
  "char.shadow.fantasy": "高機動刺客，用黑暗堆疊侵蝕、生成影子，〈萬影歸一〉一擊收割全場。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎陽之子",
  "char.sekien.element": "烈焰 · 重生",
  "char.sekien.role": "篇章未啟 · 南方的暖光",
  "char.sekien.seeking":
    "他在尋找還照得到太陽的那片碎界。當人們習慣了在殘骸上活著，他問的是：還記不記得天亮的樣子。",
  "char.sekien.fantasy": "弓劍雙形態切換，累積餘燼重燃烈焰；瀕死化作鳳凰，燃盡重生。",
  "char.aoiro.name": "青蘿",
  "char.aoiro.epithet": "噬星荊棘",
  "char.aoiro.element": "劇毒 · 藤蔓",
  "char.aoiro.role": "〈星痕紀元〉同行一程",
  "char.aoiro.seeking":
    "她在尋找一個不必靠誰記得也活得下去的位置。聚落曾把她連著那塊地一起切走——所以她受僱同行，不說是同伴。",
  "char.aoiro.fantasy": "以神經毒素層層進階，於臨界引爆〈神經崩潰〉；藤蔓封鎖，連射傾瀉。",

  // 碎界之樹 Chapters（#chapters）
  "chapters.eyebrow": "碎界之樹",
  "chapters.titleA": "碎界之樹，",
  "chapters.titleB": "旅途在碎片間延伸",
  "chapters.lead":
    "每一片碎界都是一段旅途的落點，也是幾條路交錯的地方。拖動枝上的節點撥動整棵樹，點按展開那一片的故事。",
  "chapters.hint": "拖曳撥動 · 點按展開",
  "chapters.status.root": "世界之根",
  "chapters.status.live": "已上線",
  "chapters.status.soon": "即將開放",
  "chapters.close": "關閉",
  "theme.shattered.name": "碎界",
  "theme.shattered.kicker": "起源",
  "theme.shattered.tagline": "破碎星空之下，萬章由此而生。",
  "theme.shattered.story":
    "破碎的世界漂浮於虛空，你率領探索隊拼合失落的大地——所有篇章，都從這裡的裂縫中生長。",
  "theme.snowpass.name": "風雪過境",
  "theme.snowpass.kicker": "第一章",
  "theme.snowpass.tagline": "世界破碎後的第一場暴風雪，與冰原上僅存的善意。",
  "theme.snowpass.story":
    "霜雪封境的開篇。世界被第一場暴風雪覆蓋，白棠於冰原深處的一朵白棠花中誕生，守護世界最後的善意與希望。以冰霜疊加、凍結封鎖戰場為基調的篇章。",
  "theme.starseal.name": "星痕紀元",
  "theme.starseal.kicker": "第二章",
  "theme.starseal.tagline": "星辰已經消失，只剩下痕跡。",
  "theme.starseal.story":
    "世界曾由「星痕」維繫——河流、山脈、森林乃至命運皆刻於天空星痕。某日星痕破碎，大地失去固定形態；你作為觀星者，踏上重塑世界法則的旅程。",

  // 開始遊戲 Play（#play）
  "play.eyebrow": "開始遊戲",
  "play.titleA": "選擇一片碎界，",
  "play.titleB": "踏入六角戰場",
  "play.serversTitle": "節點",
  "play.recommended": "建議",
  "play.enter": "進入戰場",
  "play.disconnect": "離線",
  "play.idleHint": "選好節點 → 進入戰場",
  "play.viewSize": "視窗",
  "play.size.normal": "正常",
  "play.size.theater": "劇場",
  "play.size.fullscreen": "全屏",
  "play.newTab": "新分頁開啟",
  "play.unavailable": "目前無法取得可用節點",
  "play.unavailableHint": "路由服務沒有提供可信的遊戲入口；請稍後重新查詢。",
  "play.retry": "重試",
  "play.stale": "路由服務暫時無法連線；目前使用仍在容錯期限內的最近成功結果。",
  "play.shotsTitle": "戰場一瞥",
  "play.shotNote": "截圖待接",
} satisfies Record<string, string>;

export type UIKey = keyof typeof zhHant;

const zhCN: Record<UIKey, string> = {
  "site.name": "碎界",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "破碎星空之下，启程未竟之旅",
  "site.summary":
    "碎界是一款架空世界观的 2D 六角格回合制策略游戏：手牌、走棋、MOBA 技能与对抗、SRPG 四者合一。这里没有谁站在世界的中心——故事沿着彼此交错的视角展开。",

  "nav.world": "碎裂",
  "nav.gameplay": "玩法",
  "nav.chapters": "碎界之树",
  "nav.characters": "角色",
  "nav.play": "开始游戏",

  "cta.play": "开始游戏",
  "cta.learn": "了解世界",

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
  "teaser.seek": "播放进度",
  "teaser.fullscreen": "全屏",
  "teaser.exitFullscreen": "退出全屏",

  "world.eyebrow": "世界观",
  "world.titleA": "碎裂不是天罚，",
  "world.titleB": "是天地最后一次自救。",
  "world.lead": "当星痕断裂，大地失去固定的形状，世界碎成漂浮于虚空的残片。",
  "world.body": "这不是终结——碎裂，是天地保存自身的最后手段。",
  "world.claim": "没有谁站在世界的中心。",
  "world.ensemble":
    "不同的人怀着各自的目的前行；故事沿着彼此交错的视角展开，逐渐拼起失落的大地与世界破碎的真相。",

  "gameplay.eyebrow": "核心玩法",
  "gameplay.titleA": "手牌 × 走棋 × MOBA × SRPG，",
  "gameplay.titleB": "不套进既有类型的答案",
  "gameplay.cards.name": "手牌",
  "gameplay.cards.claim": "战前构筑与局内资源",
  "gameplay.board.name": "走棋",
  "gameplay.board.claim": "位置本身就是选择",
  "gameplay.skills.name": "MOBA 技能与对抗",
  "gameplay.skills.claim": "技能、配合与战场节奏",
  "gameplay.srpg.name": "SRPG",
  "gameplay.srpg.claim": "地形、范围与回合规划",

  "char.eyebrow": "角色",
  "char.titleA": "交错的旅途，",
  "char.titleB": "各自走向不同的答案",
  "char.lead":
    "他们不是一支队伍的四个位置。有人在找回不来的人，有人在找还亮着的碎片——路偶尔交错，答案各自不同。",
  "char.combat": "战斗",
  "char.slotNote": "立绘待接 · 程序化占位",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境之棠",
  "char.hakuto.element": "冰霜 · 纯净",
  "char.hakuto.role": "〈风雪过境〉主要视角",
  "char.hakuto.seeking":
    "她在寻找一个她没能护住的人。所有人都说那个人早已不在了——而她的伤口，比她的诞生更老。",
  "char.hakuto.fantasy": "高 EP 的后排法系，以冰霜叠加至冻结，把敌人牢牢定在原地。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影之君主",
  "char.shadow.element": "暗影 · 侵蚀",
  "char.shadow.role": "〈星痕纪元〉交错而过",
  "char.shadow.seeking": "他在寻找一把钥匙。他没说那把钥匙开的是什么。",
  "char.shadow.fantasy": "高机动刺客，用黑暗叠加侵蚀、生成影子，〈万影归一〉一击收割全场。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎阳之子",
  "char.sekien.element": "烈焰 · 重生",
  "char.sekien.role": "篇章未启 · 南方的暖光",
  "char.sekien.seeking":
    "他在寻找还照得到太阳的那片碎界。当人们习惯了在残骸上活着，他问的是：还记不记得天亮的样子。",
  "char.sekien.fantasy": "弓剑双形态切换，累积余烬重燃烈焰；濒死化作凤凰，燃尽重生。",
  "char.aoiro.name": "青萝",
  "char.aoiro.epithet": "噬星荆棘",
  "char.aoiro.element": "剧毒 · 藤蔓",
  "char.aoiro.role": "〈星痕纪元〉同行一程",
  "char.aoiro.seeking":
    "她在寻找一个不必靠谁记得也活得下去的位置。聚落曾把她连着那块地一起切走——所以她受雇同行，不说是同伴。",
  "char.aoiro.fantasy": "以神经毒素层层进阶，于临界引爆〈神经崩溃〉；藤蔓封锁，连射倾泻。",

  "chapters.eyebrow": "碎界之树",
  "chapters.titleA": "碎界之树，",
  "chapters.titleB": "旅途在碎片间延伸",
  "chapters.lead":
    "每一片碎界都是一段旅途的落点，也是几条路交错的地方。拖动枝上的节点拨动整棵树，点按展开那一片的故事。",
  "chapters.hint": "拖曳拨动 · 点按展开",
  "chapters.status.root": "世界之根",
  "chapters.status.live": "已上线",
  "chapters.status.soon": "即将开放",
  "chapters.close": "关闭",
  "theme.shattered.name": "碎界",
  "theme.shattered.kicker": "起源",
  "theme.shattered.tagline": "破碎星空之下，万章由此而生。",
  "theme.shattered.story":
    "破碎的世界漂浮于虚空，你率领探索队拼合失落的大地——所有篇章，都从这里的裂缝中生长。",
  "theme.snowpass.name": "风雪过境",
  "theme.snowpass.kicker": "第一章",
  "theme.snowpass.tagline": "世界破碎后的第一场暴风雪，与冰原上仅存的善意。",
  "theme.snowpass.story":
    "霜雪封境的开篇。世界被第一场暴风雪覆盖，白棠于冰原深处的一朵白棠花中诞生，守护世界最后的善意与希望。以冰霜叠加、冻结封锁战场为基调的篇章。",
  "theme.starseal.name": "星痕纪元",
  "theme.starseal.kicker": "第二章",
  "theme.starseal.tagline": "星辰已经消失，只剩下痕迹。",
  "theme.starseal.story":
    "世界曾由「星痕」维系——河流、山脉、森林乃至命运皆刻于天空星痕。某日星痕破碎，大地失去固定形态；你作为观星者，踏上重塑世界法则的旅程。",

  "play.eyebrow": "开始游戏",
  "play.titleA": "选择一片碎界，",
  "play.titleB": "踏入六角战场",
  "play.serversTitle": "节点",
  "play.recommended": "建议",
  "play.enter": "进入战场",
  "play.disconnect": "离线",
  "play.idleHint": "选好节点 → 进入战场",
  "play.viewSize": "窗口",
  "play.size.normal": "正常",
  "play.size.theater": "剧场",
  "play.size.fullscreen": "全屏",
  "play.newTab": "新标签页打开",
  "play.unavailable": "目前无法取得可用节点",
  "play.unavailableHint": "路由服务没有提供可信的游戏入口；请稍后重新查询。",
  "play.retry": "重试",
  "play.stale": "路由服务暂时无法连接；目前使用仍在容错期限内的最近成功结果。",
  "play.shotsTitle": "战场一瞥",
  "play.shotNote": "截图待接",
};

const en: Record<UIKey, string> = {
  "site.name": "Shattered Realms",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "Beneath a shattered sky, the journey begins",
  "site.summary":
    "Shattered Realms is a 2D hex-grid, turn-based strategy game fusing a card hand, board movement, MOBA-style skills and confrontation, and SRPG progression. Nobody stands at the centre of this world — the story unfolds along viewpoints that cross each other.",

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
  "teaser.seek": "Seek",
  "teaser.fullscreen": "Fullscreen",
  "teaser.exitFullscreen": "Exit fullscreen",

  "world.eyebrow": "The World",
  "world.titleA": "The Shattering was not a punishment —",
  "world.titleB": "it was the world's last act of self-rescue.",
  "world.lead":
    "When the star-seal broke, the land lost its fixed shape and the world scattered into fragments adrift in the void.",
  "world.body":
    "This is not the end. The shattering was how the world preserved itself.",
  "world.claim": "Nobody stands at the centre of this world.",
  "world.ensemble":
    "Different people walk on with purposes of their own; the story unfolds along viewpoints that cross each other, piecing together the lost lands — and the truth of how the world broke.",

  "gameplay.eyebrow": "Core Gameplay",
  "gameplay.titleA": "Cards × board × MOBA × SRPG — ",
  "gameplay.titleB": "an answer that fits no existing genre",
  "gameplay.cards.name": "Card Hand",
  "gameplay.cards.claim": "Pre-match building, in-match resource",
  "gameplay.board.name": "Board Movement",
  "gameplay.board.claim": "Position is itself a choice",
  "gameplay.skills.name": "MOBA Skills & Confrontation",
  "gameplay.skills.claim": "Skills, synergy, and the tempo of a fight",
  "gameplay.srpg.name": "SRPG",
  "gameplay.srpg.claim": "Terrain, range, and planning the turn",

  "char.eyebrow": "Cast",
  "char.titleA": "Journeys that cross, ",
  "char.titleB": "each walking toward a different answer",
  "char.lead":
    "They are not four slots on one team. One is looking for someone who cannot come back, another for a fragment that still has light — the roads cross now and then; the answers do not.",
  "char.combat": "In combat",
  "char.slotNote": "Art incoming · procedural placeholder",
  "char.hakuto.name": "Hakuto",
  "char.hakuto.epithet": "Bloom of the Snowbound Realm",
  "char.hakuto.element": "Frost · Purity",
  "char.hakuto.role": "Viewpoint of Snowbound Passage",
  "char.hakuto.seeking":
    "She is looking for someone she failed to protect. Everyone tells her that person is long gone — and her wound is older than her own birth.",
  "char.hakuto.fantasy":
    "A backline caster on a deep EP pool, stacking frost into freeze to lock enemies in place.",
  "char.shadow.name": "Dark Shadow",
  "char.shadow.epithet": "Lord of Shadows",
  "char.shadow.element": "Shadow · Erosion",
  "char.shadow.role": "Crossing through the Age of Starmarks",
  "char.shadow.seeking":
    "He is looking for a key. He won't say what it opens.",
  "char.shadow.fantasy":
    "A high-mobility assassin who stacks erosion into shadows, then reaps the whole board with All Shadows as One.",
  "char.sekien.name": "Sekien",
  "char.sekien.epithet": "Son of the Blazing Sun",
  "char.sekien.element": "Flame · Rebirth",
  "char.sekien.role": "Chapter unopened · a warm light to the south",
  "char.sekien.seeking":
    "He is looking for the fragment the sun still reaches. Where people have grown used to living on wreckage, his question is whether they remember what daybreak looked like.",
  "char.sekien.fantasy":
    "Shifts between bow and sword, banking Ember to rekindle Flame — and rises from death as a phoenix.",
  "char.aoiro.name": "Aoiro",
  "char.aoiro.epithet": "Star-Devouring Bramble",
  "char.aoiro.element": "Venom · Vines",
  "char.aoiro.role": "Walking one stretch of the Age of Starmarks",
  "char.aoiro.seeking":
    "She is looking for a place to live that depends on nobody remembering her. A settlement once cut her away along with the ground she stood on — so she travels for hire, and won't call it company.",
  "char.aoiro.fantasy":
    "Escalates neurotoxin stage by stage to detonate Neural Collapse; walls the board with vines and pours out rapid-fire.",

  "chapters.eyebrow": "The World Tree",
  "chapters.titleA": "The World Tree — ",
  "chapters.titleB": "journeys stretch between the fragments",
  "chapters.lead":
    "Every realm is where a journey touches down, and where a few roads cross. Drag a node to stir the whole tree; tap one to unfold its story.",
  "chapters.hint": "Drag to stir · tap to unfold",
  "chapters.status.root": "World Root",
  "chapters.status.live": "Live",
  "chapters.status.soon": "Coming soon",
  "chapters.close": "Close",
  "theme.shattered.name": "Shattered Realms",
  "theme.shattered.kicker": "Origin",
  "theme.shattered.tagline": "Beneath a shattered sky, every chapter is born.",
  "theme.shattered.story":
    "A broken world adrift in the void; you lead the expedition to piece the lost lands together — and every chapter grows from the fractures here.",
  "theme.snowpass.name": "Snowbound Passage",
  "theme.snowpass.kicker": "Chapter 1",
  "theme.snowpass.tagline":
    "The first blizzard after the world shattered — and the last kindness left on the ice.",
  "theme.snowpass.story":
    "The opening chapter of a frozen world. When the first snowstorm buried the land, Hakuto was born from a lone snow-plum blossom deep in the ice, guarding the world's last kindness — a chapter built on stacking frost and locking the field with freeze.",
  "theme.starseal.name": "Age of Starmarks",
  "theme.starseal.kicker": "Chapter 2",
  "theme.starseal.tagline": "The stars are gone; only their marks remain.",
  "theme.starseal.story":
    "The world was once held by the star-seal — rivers, mountains, forests, even fate, inscribed in the sky. When it shattered, the land lost its fixed shape; as a Stargazer you set out to reshape the world's laws.",

  "play.eyebrow": "Play",
  "play.titleA": "Choose a realm, ",
  "play.titleB": "step onto the hex battlefield",
  "play.serversTitle": "Nodes",
  "play.recommended": "Best",
  "play.enter": "Enter the battlefield",
  "play.disconnect": "Disconnect",
  "play.idleHint": "Pick a node → enter",
  "play.viewSize": "View",
  "play.size.normal": "Normal",
  "play.size.theater": "Theater",
  "play.size.fullscreen": "Fullscreen",
  "play.newTab": "Open in new tab",
  "play.unavailable": "No playable node is available",
  "play.unavailableHint": "The routing service did not provide a trusted game entry point. Please try again shortly.",
  "play.retry": "Retry",
  "play.stale": "The routing service is temporarily unreachable; using the latest successful result within its failover window.",
  "play.shotsTitle": "Battlefield glimpses",
  "play.shotNote": "Screenshots incoming",
};

export const ui: Record<Locale, Record<UIKey, string>> = {
  "zh-Hant": zhHant,
  "zh-CN": zhCN,
  en,
};

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
  "a11y.menu": "選單",

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

  // 玩法 Gameplay（#gameplay）—— 四合一
  "gameplay.eyebrow": "玩法",
  "gameplay.titleA": "四種玩法，",
  "gameplay.titleB": "融於同一張六角棋盤",
  "gameplay.lead":
    "棋類策略的縝密、RPG 成長的養成、MOBA 技能的爽快、開放世界的探索——在回合制的六角戰場上合而為一。",
  "gameplay.tactics.name": "棋類策略",
  "gameplay.tactics.desc":
    "在六角棋盤上調度站位：行動點（AP）分配、地形高低與視線、戰爭迷霧下的資訊博弈，每一步都是取捨。",
  "gameplay.growth.name": "RPG 成長",
  "gameplay.growth.desc":
    "局內升級解鎖核心技能，從被動、主動到終極逐階綻放；蒐集素材合成裝備，養出屬於你的角色曲線。",
  "gameplay.skills.name": "MOBA 技能",
  "gameplay.skills.desc":
    "核心技能與卡牌技能雙軌並行，操作 EP、烈焰等專屬資源，以狀態、控制與爆發改寫戰局。",
  "gameplay.explore.name": "開放探索",
  "gameplay.explore.desc":
    "地形會回應你的技能——烈焰燒出焦土、河遇火化蒸汽、冰霜消融；野怪棲息、星使流轉，戰場是活的世界。",

  // 英雄 Characters（#characters）—— 程序化佔位＋換裝槽
  "char.eyebrow": "英雄",
  "char.titleA": "領路的英雄，",
  "char.titleB": "各執一種碎界之力",
  "char.lead": "他們是探索隊的先鋒——冰霜、暗影、烈焰、劇毒，四種截然不同的玩法幻想。",
  "char.slotNote": "立繪待接 · 程序化佔位",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境之棠",
  "char.hakuto.element": "冰霜 · 純淨",
  "char.hakuto.fantasy": "高 EP 的後排法系，以冰霜疊加至凍結，把敵人牢牢定在原地。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影之君主",
  "char.shadow.element": "暗影 · 侵蝕",
  "char.shadow.fantasy": "高機動刺客，用黑暗堆疊侵蝕、生成影子，〈萬影歸一〉一擊收割全場。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎陽之子",
  "char.sekien.element": "烈焰 · 重生",
  "char.sekien.fantasy": "弓劍雙形態切換，累積餘燼重燃烈焰；瀕死化作鳳凰，燃盡重生。",
  "char.aoiro.name": "青蘿",
  "char.aoiro.epithet": "噬星荊棘",
  "char.aoiro.element": "劇毒 · 藤蔓",
  "char.aoiro.fantasy": "以神經毒素層層進階，於臨界引爆〈神經崩潰〉；藤蔓封鎖，連射傾瀉。",

  // 主題曲 Chapters / 碎界樹（#chapters）
  "chapters.eyebrow": "主題曲",
  "chapters.titleA": "碎界之樹，",
  "chapters.titleB": "章節自虛空生長",
  "chapters.lead":
    "每一章都是碎界樹上的一枚星火。拖動枝上的節點撥動整棵樹，點按展開那一章的故事。",
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
  "play.titleA": "選一個節點，",
  "play.titleB": "踏入六角戰場",
  "play.lead":
    "分流器探活各區節點、擇優連線；選定後即以 iframe 嵌入該節點的即時對戰畫面。本次為前端展示，未接真實分流後端。",
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
  "play.mockNote": "節點為後端依就近分流回傳的候選；本頁靜態預覽時以 mock 呈現。",
  "play.shotsTitle": "戰場一瞥",
  "play.shotNote": "截圖待接",
  "play.region.hk1": "香港",
  "play.region.jp1": "東京",
  "play.region.sg1": "新加坡",
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
  "a11y.menu": "菜单",

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

  "gameplay.eyebrow": "玩法",
  "gameplay.titleA": "四种玩法，",
  "gameplay.titleB": "融于同一张六角棋盘",
  "gameplay.lead":
    "棋类策略的缜密、RPG 成长的养成、MOBA 技能的爽快、开放世界的探索——在回合制的六角战场上合而为一。",
  "gameplay.tactics.name": "棋类策略",
  "gameplay.tactics.desc":
    "在六角棋盘上调度站位：行动点（AP）分配、地形高低与视线、战争迷雾下的信息博弈，每一步都是取舍。",
  "gameplay.growth.name": "RPG 成长",
  "gameplay.growth.desc":
    "局内升级解锁核心技能，从被动、主动到终极逐阶绽放；搜集素材合成装备，养出属于你的角色曲线。",
  "gameplay.skills.name": "MOBA 技能",
  "gameplay.skills.desc":
    "核心技能与卡牌技能双轨并行，操作 EP、烈焰等专属资源，以状态、控制与爆发改写战局。",
  "gameplay.explore.name": "开放探索",
  "gameplay.explore.desc":
    "地形会回应你的技能——烈焰烧出焦土、河遇火化蒸汽、冰霜消融；野怪栖息、星使流转，战场是活的世界。",

  "char.eyebrow": "英雄",
  "char.titleA": "领路的英雄，",
  "char.titleB": "各执一种碎界之力",
  "char.lead": "他们是探索队的先锋——冰霜、暗影、烈焰、剧毒，四种截然不同的玩法幻想。",
  "char.slotNote": "立绘待接 · 程序化占位",
  "char.hakuto.name": "白棠",
  "char.hakuto.epithet": "雪境之棠",
  "char.hakuto.element": "冰霜 · 纯净",
  "char.hakuto.fantasy": "高 EP 的后排法系，以冰霜叠加至冻结，把敌人牢牢定在原地。",
  "char.shadow.name": "暗影",
  "char.shadow.epithet": "影之君主",
  "char.shadow.element": "暗影 · 侵蚀",
  "char.shadow.fantasy": "高机动刺客，用黑暗叠加侵蚀、生成影子，〈万影归一〉一击收割全场。",
  "char.sekien.name": "赤焰",
  "char.sekien.epithet": "炎阳之子",
  "char.sekien.element": "烈焰 · 重生",
  "char.sekien.fantasy": "弓剑双形态切换，累积余烬重燃烈焰；濒死化作凤凰，燃尽重生。",
  "char.aoiro.name": "青萝",
  "char.aoiro.epithet": "噬星荆棘",
  "char.aoiro.element": "剧毒 · 藤蔓",
  "char.aoiro.fantasy": "以神经毒素层层进阶，于临界引爆〈神经崩溃〉；藤蔓封锁，连射倾泻。",

  "chapters.eyebrow": "主题曲",
  "chapters.titleA": "碎界之树，",
  "chapters.titleB": "章节自虚空生长",
  "chapters.lead":
    "每一章都是碎界树上的一枚星火。拖动枝上的节点拨动整棵树，点按展开那一章的故事。",
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
  "play.titleA": "选一个节点，",
  "play.titleB": "踏入六角战场",
  "play.lead":
    "分流器探活各区节点、择优连线；选定后即以 iframe 嵌入该节点的即时对战画面。本次为前端展示，未接真实分流后端。",
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
  "play.mockNote": "节点为后端依就近分流返回的候选；本页静态预览时以 mock 呈现。",
  "play.shotsTitle": "战场一瞥",
  "play.shotNote": "截图待接",
  "play.region.hk1": "香港",
  "play.region.jp1": "东京",
  "play.region.sg1": "新加坡",
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
  "a11y.menu": "Menu",

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

  "gameplay.eyebrow": "Gameplay",
  "gameplay.titleA": "Four genres, ",
  "gameplay.titleB": "fused on a single hex board",
  "gameplay.lead":
    "The precision of board tactics, the growth of an RPG, the punch of MOBA skills, the freedom of an open world — united on a turn-based hex battlefield.",
  "gameplay.tactics.name": "Board Tactics",
  "gameplay.tactics.desc":
    "Maneuver across a hex grid: budget action points (AP), exploit height and line of sight, and out-read your opponent through the fog of war — every step is a trade-off.",
  "gameplay.growth.name": "RPG Growth",
  "gameplay.growth.desc":
    "Level up mid-match to unlock core skills from passive to ultimate, and craft gear from gathered materials to shape your own build.",
  "gameplay.skills.name": "MOBA Skills",
  "gameplay.skills.desc":
    "Run core skills and card skills in parallel, manage resources like EP and Flame, and turn the fight with status, control and burst.",
  "gameplay.explore.name": "Open Exploration",
  "gameplay.explore.desc":
    "Terrain answers your skills — flame scorches the earth, fire on water turns to steam, frost melts away; wild monsters roam and envoys wander a living battlefield.",

  "char.eyebrow": "Characters",
  "char.titleA": "The heroes who lead, ",
  "char.titleB": "each wielding a shard of power",
  "char.lead":
    "They are the vanguard of the expedition — frost, shadow, flame and venom, four utterly different gameplay fantasies.",
  "char.slotNote": "Art incoming · procedural placeholder",
  "char.hakuto.name": "Hakuto",
  "char.hakuto.epithet": "Bloom of the Snowbound Realm",
  "char.hakuto.element": "Frost · Purity",
  "char.hakuto.fantasy":
    "A backline caster on a deep EP pool, stacking frost into freeze to lock enemies in place.",
  "char.shadow.name": "Dark Shadow",
  "char.shadow.epithet": "Lord of Shadows",
  "char.shadow.element": "Shadow · Erosion",
  "char.shadow.fantasy":
    "A high-mobility assassin who stacks erosion into shadows, then reaps the whole board with All Shadows as One.",
  "char.sekien.name": "Sekien",
  "char.sekien.epithet": "Son of the Blazing Sun",
  "char.sekien.element": "Flame · Rebirth",
  "char.sekien.fantasy":
    "Shifts between bow and sword, banking Ember to rekindle Flame — and rises from death as a phoenix.",
  "char.aoiro.name": "Aoiro",
  "char.aoiro.epithet": "Star-Devouring Bramble",
  "char.aoiro.element": "Venom · Vines",
  "char.aoiro.fantasy":
    "Escalates neurotoxin stage by stage to detonate Neural Collapse; walls the board with vines and pours out rapid-fire.",

  "chapters.eyebrow": "Chapters",
  "chapters.titleA": "The World Tree — ",
  "chapters.titleB": "chapters grow from the void",
  "chapters.lead":
    "Every chapter is a spark on the World Tree of Shattered Realms. Drag a node to stir the whole tree; tap one to unfold its story.",
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
  "play.titleA": "Pick a node, ",
  "play.titleB": "step onto the hex battlefield",
  "play.lead":
    "The router health-checks each regional node and connects you to the best one; your pick is then embedded live via iframe. This is a front-end showcase — no real routing backend yet.",
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
  "play.mockNote": "Nodes are the backend's proximity-routed candidates; mocked here in the static preview.",
  "play.shotsTitle": "Battlefield glimpses",
  "play.shotNote": "Screenshots incoming",
  "play.region.hk1": "Hong Kong",
  "play.region.jp1": "Tokyo",
  "play.region.sg1": "Singapore",
};

export const ui: Record<Locale, Record<UIKey, string>> = {
  "zh-Hant": zhHant,
  "zh-CN": zhCN,
  en,
};

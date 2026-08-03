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
    "碎界是一款架空世界觀的 2D 六角格回合制策略遊戲：手牌、走棋、MOBA 技能與對抗、SRPG 四者合一，不屬於目前市面上任何主流類型。",

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
  "footer.note": "官網為純靜態部署；節點分流與探活由獨立的服務網域提供。",

  "hero.badge": "正式上線",

  // 碎裂 The Shattering（#world）
  "world.eyebrow": "世界觀",
  "world.titleA": "碎裂不是天罰，",
  "world.titleB": "是天地最後一次自救。",
  "world.lead": "當星痕斷裂，大地失去固定的形狀，世界碎成漂浮於虛空的殘片。",
  "world.body":
    "這不是終結——碎裂，是天地保存自身的最後手段。殘片各自漂散，靜待被重新拼合；你將率領探索隊，在虛空中尋回失落的大地。",

  // 玩法 Gameplay（#gameplay）—— 手牌 / 走棋 / MOBA 技能與對抗 / SRPG
  "gameplay.eyebrow": "玩法",
  "gameplay.titleA": "手牌 × 走棋 × MOBA × SRPG，",
  "gameplay.titleB": "不屬於任何一種主流類型",
  "gameplay.lead":
    "抽牌組手、六角走位、MOBA 式的技能與對抗、SRPG 的養成與戰役——四條血統不是拼在一起，而是在同一張棋盤上同時運作。",
  "gameplay.claim": "它不是卡牌遊戲，不是戰棋，也不是 MOBA——目前市面上找不到同一類。",
  "gameplay.cards.name": "手牌",
  "gameplay.cards.desc":
    "卡牌技能構成你的手牌：抽牌、留牌、接續。關鍵牌什麼時候打出去，和打在哪一格同樣重要。",
  "gameplay.board.name": "走棋",
  "gameplay.board.desc":
    "在六角棋盤上調度站位：行動點（AP）分配、地形高低與視線、戰爭迷霧下的資訊博弈，每一步都是取捨。",
  "gameplay.skills.name": "MOBA 技能與對抗",
  "gameplay.skills.desc":
    "核心技能自被動、主動到終極逐階綻放，操作 EP、烈焰等專屬資源；以狀態、控制與爆發正面壓過對手。",
  "gameplay.srpg.name": "SRPG",
  "gameplay.srpg.desc":
    "局內升級、蒐集素材合成裝備，養出屬於你的角色曲線；地形會回應技能，野怪棲息、星使流轉，戰場是活的世界。",

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
    "分流服務探活各節點、擇優連線；選定後即以 iframe 嵌入該節點的即時對戰畫面，也可另開新分頁進入。",
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
  "play.nodeNote": "節點由 Hoshivel 路由服務依健康、距離與容量政策收斂；官網不會自行猜測或覆寫入口。",
  "play.unavailable": "目前無法取得可用節點",
  "play.unavailableHint": "路由服務沒有提供可信的遊戲入口；請稍後重新查詢。",
  "play.retry": "重新查詢",
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
    "碎界是一款架空世界观的 2D 六角格回合制策略游戏：手牌、走棋、MOBA 技能与对抗、SRPG 四者合一，不属于目前市面上任何主流类型。",

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
  "footer.note": "官网为纯静态部署；节点分流与探活由独立的服务域名提供。",

  "hero.badge": "正式上线",

  "world.eyebrow": "世界观",
  "world.titleA": "碎裂不是天罚，",
  "world.titleB": "是天地最后一次自救。",
  "world.lead": "当星痕断裂，大地失去固定的形状，世界碎成漂浮于虚空的残片。",
  "world.body":
    "这不是终结——碎裂，是天地保存自身的最后手段。残片各自漂散，静待被重新拼合；你将率领探索队，在虚空中寻回失落的大地。",

  "gameplay.eyebrow": "玩法",
  "gameplay.titleA": "手牌 × 走棋 × MOBA × SRPG，",
  "gameplay.titleB": "不属于任何一种主流类型",
  "gameplay.lead":
    "抽牌组手、六角走位、MOBA 式的技能与对抗、SRPG 的养成与战役——四条血统不是拼在一起，而是在同一张棋盘上同时运作。",
  "gameplay.claim": "它不是卡牌游戏，不是战棋，也不是 MOBA——目前市面上找不到同一类。",
  "gameplay.cards.name": "手牌",
  "gameplay.cards.desc":
    "卡牌技能构成你的手牌：抽牌、留牌、接续。关键牌什么时候打出去，和打在哪一格同样重要。",
  "gameplay.board.name": "走棋",
  "gameplay.board.desc":
    "在六角棋盘上调度站位：行动点（AP）分配、地形高低与视线、战争迷雾下的信息博弈，每一步都是取舍。",
  "gameplay.skills.name": "MOBA 技能与对抗",
  "gameplay.skills.desc":
    "核心技能自被动、主动到终极逐阶绽放，操作 EP、烈焰等专属资源；以状态、控制与爆发正面压过对手。",
  "gameplay.srpg.name": "SRPG",
  "gameplay.srpg.desc":
    "局内升级、搜集素材合成装备，养出属于你的角色曲线；地形会回应技能，野怪栖息、星使流转，战场是活的世界。",

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
    "分流服务探活各节点、择优连线；选定后即以 iframe 嵌入该节点的实时对战画面，也可另开新标签页进入。",
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
  "play.nodeNote": "节点由 Hoshivel 路由服务依健康、距离与容量策略收敛；官网不会自行猜测或覆盖入口。",
  "play.unavailable": "目前无法取得可用节点",
  "play.unavailableHint": "路由服务没有提供可信的游戏入口；请稍后重新查询。",
  "play.retry": "重新查询",
  "play.stale": "路由服务暂时无法连接；目前使用仍在容错期限内的最近成功结果。",
  "play.shotsTitle": "战场一瞥",
  "play.shotNote": "截图待接",
};

const en: Record<UIKey, string> = {
  "site.name": "Shattered Realms",
  "site.nameLatin": "SHATTERED REALMS",
  "site.tagline": "Beneath a shattered sky, the journey begins",
  "site.summary":
    "Shattered Realms is a 2D hex-grid, turn-based strategy game fusing a card hand, board movement, MOBA-style skills and confrontation, and SRPG progression — a combination no mainstream genre on the market covers.",

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
    "The site is deployed as pure static files; node routing and health checks are served from a separate service domain.",

  "hero.badge": "Now live",

  "world.eyebrow": "The World",
  "world.titleA": "The Shattering was not a punishment —",
  "world.titleB": "it was the world's last act of self-rescue.",
  "world.lead":
    "When the star-seal broke, the land lost its fixed shape and the world scattered into fragments adrift in the void.",
  "world.body":
    "This is not the end. The shattering was how the world preserved itself — the fragments drift apart, waiting to be pieced back together. You will lead the expedition that reclaims the lost lands.",

  "gameplay.eyebrow": "Gameplay",
  "gameplay.titleA": "Cards × board × MOBA × SRPG — ",
  "gameplay.titleB": "no mainstream genre fits it",
  "gameplay.lead":
    "A hand of cards, movement across a hex board, MOBA-style skills and confrontation, SRPG progression and campaigns — four bloodlines that don't sit side by side; they run at once on the same board.",
  "gameplay.claim":
    "It isn't a card game, it isn't a tactics game, and it isn't a MOBA — nothing on the market is quite this.",
  "gameplay.cards.name": "Card Hand",
  "gameplay.cards.desc":
    "Card skills make up your hand: draw, hold, chain. When you play the key card matters as much as which tile you play it on.",
  "gameplay.board.name": "Board Movement",
  "gameplay.board.desc":
    "Maneuver across a hex grid: budget action points (AP), exploit height and line of sight, and out-read your opponent through the fog of war — every step is a trade-off.",
  "gameplay.skills.name": "MOBA Skills & Confrontation",
  "gameplay.skills.desc":
    "Core skills bloom from passive to ultimate while you manage EP, Flame and other resources — win the exchange outright with status, control and burst.",
  "gameplay.srpg.name": "SRPG",
  "gameplay.srpg.desc":
    "Level up mid-match and craft gear from gathered materials to shape your own build; terrain answers your skills, monsters roam and envoys wander a living battlefield.",

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
    "The routing service health-checks each node and connects you to the best one; your pick is then embedded live via iframe, or opened in a new tab.",
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
  "play.nodeNote":
    "Hoshivel routing narrows nodes by health, distance, and capacity policy; this site never guesses or rewrites an entry point.",
  "play.unavailable": "No playable node is available",
  "play.unavailableHint": "The routing service did not provide a trusted game entry point. Please try again shortly.",
  "play.retry": "Check again",
  "play.stale": "The routing service is temporarily unreachable; using the latest successful result within its failover window.",
  "play.shotsTitle": "Battlefield glimpses",
  "play.shotNote": "Screenshots incoming",
};

export const ui: Record<Locale, Record<UIKey, string>> = {
  "zh-Hant": zhHant,
  "zh-CN": zhCN,
  en,
};

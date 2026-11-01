/*
  Shattered Realms sr-web -- copy for the subpages (characters, world, gameplay,
  FAQ), in four languages.

  The home page stays a focused introduction; these pages carry the detail a
  search engine (and a curious reader) looks for. They were added on 2026-11-01
  at the user's request, after the SEO baseline found the site had a single
  indexable page per language.

  Sources, so the next edit knows where to check:
  - Character titles, quotes, roles and skill names are the game's own strings
    (`frontend/src/i18n/translations.ts`, `char.<id>.*` and `skill.*.name`).
  - Mode, difficulty and victory names follow the game's lobby and rules text
    (`lobbyTranslations.ts`, `rules.*`), so the site and the game use one word
    for each thing.
  - Skill and rule descriptions are written for the site **without numbers**:
    damage, ranges, turn counts and timers change with balance, and a page that
    quotes them goes stale without anyone noticing. The game shows the numbers.
  - Nothing here describes chapters that are not out yet beyond what the home
    page already says.

  The same naming rules as `ui.ts` apply (the Shattered Realms Tree is 碎界樹 /
  碎界树 / Shattered Realms Tree / 砕界樹); `test/shattered-tree-name.test.mjs`
  reads this file too. `test/pages-copy.test.mjs` checks that every locale has
  the same entries in the same shape -- the types cannot see array lengths.
*/

import type { Locale } from "./ui.ts";

export const CHARACTER_IDS = ["hakuto", "shadow", "sekien", "aoiro"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** Logical (locale-free) paths of the subpages; `localizedPath` adds the prefix. */
export const PAGE_PATH = {
  characters: "/characters/",
  world: "/world/",
  gameplay: "/gameplay/",
  faq: "/faq/",
} as const;
export type PageId = keyof typeof PAGE_PATH;

export const characterPath = (id: CharacterId): string => `${PAGE_PATH.characters}${id}/`;

export interface Skill {
  name: string;
  text: string;
}
export interface CoreSkill extends Skill {
  /** The in-match level that unlocks it (Lv.5 is the ultimate). */
  level: 1 | 3 | 5;
}

export interface CharacterCopy {
  /** The page name; the components append `labels.titleSuffix` for <title>. */
  title: string;
  description: string;
  /** The game's `char.<id>.title`: the names others call them by. */
  titles: string;
  /** The game's `char.<id>.epithet`: their own line. */
  quote: string;
  /** The game's `char.<id>.role`: what they do in a fight. */
  role: string;
  /** How they fight, in a few sentences and without numbers. */
  style: string[];
  passives: Skill[];
  core: CoreSkill[];
  cards: Skill[];
}

export interface Term {
  term: string;
  text: string;
}
export interface Section {
  /** Fragment id, so other pages and the FAQ can link straight to it. */
  id: string;
  heading: string;
  body: string[];
  terms?: Term[];
}

/** Where an FAQ answer points for more: a subpage or the play section. */
export type FaqLink = PageId | "play";
export interface FaqEntry {
  id: string;
  q: string;
  a: string[];
  link?: FaqLink;
}

export interface PageCopy {
  title: string;
  description: string;
}

export interface PagesCopy {
  labels: {
    /** Appended to every subpage name to form its <title>. */
    titleSuffix: string;
    /** Accessible name of the breadcrumb trail. */
    breadcrumb: string;
    home: string;
    /** The footer's list of subpages. */
    explore: string;
    /** Link from a character on the home page to their page (the name follows, visually hidden). */
    profile: string;
    story: string;
    style: string;
    skills: string;
    passives: string;
    passivesNote: string;
    core: string;
    coreNote: string;
    ultimate: string;
    cards: string;
    cardsNote: string;
    /** Character page: the chapter they appear in. */
    chapter: string;
    others: string;
    /** Before the link that follows an FAQ answer. */
    more: string;
  };
  /** Each subpage's name in navigation and breadcrumbs. */
  nav: Record<PageId, string>;
  characters: PageCopy;
  character: Record<CharacterId, CharacterCopy>;
  world: PageCopy & { sections: Section[]; chaptersHeading: string; chaptersLead: string };
  gameplay: PageCopy & { lead: string; sections: Section[] };
  faq: PageCopy & { lead: string; entries: FaqEntry[] };
}

const zhHant: PagesCopy = {
  labels: {
    titleSuffix: "｜碎界 Shattered Realms",
    breadcrumb: "頁面位置",
    home: "首頁",
    explore: "深入了解",
    profile: "完整介紹",
    story: "故事",
    style: "戰鬥風格",
    skills: "技能",
    passives: "被動",
    passivesNote: "出生即有，永久生效。",
    core: "核心技能",
    coreNote: "隨局內等級解鎖，固定在技能列上。",
    ultimate: "終極",
    cards: "卡牌技能",
    cardsNote: "抽到並打出對應的技能牌時施放。",
    chapter: "登場篇章",
    others: "其他角色",
    more: "延伸閱讀：",
  },
  nav: {
    characters: "角色",
    world: "世界觀",
    gameplay: "玩法說明",
    faq: "常見問題",
  },
  characters: {
    title: "角色介紹",
    description:
      "認識《碎界》的四位角色——白棠、暗影、赤焰與青蘿：他們各自在找什麼、在哪一段旅途登場，以及在戰鬥中擅長什麼。",
  },
  character: {
    hakuto: {
      title: "白棠（雪境之棠）",
      description:
        "白棠是《碎界》〈風雪過境〉的主要視角：誕生於冰原深處的白棠花，以冰霜與凍結封住敵人的後排法系。她的故事、戰鬥風格與全部技能。",
      titles: "雪境之棠、霜華聖女、白銀庭園的守望者",
      quote: "雪骨冰姿，潔白無瑕。",
      role: "控制 · 冰霜法系後排",
      style: [
        "以 EP 為核心資源的後排法系。普通攻擊與技能都會在敵人身上疊加冰霜，冰霜疊滿就轉為凍結，讓她能從後方封住對手的前進路線。",
        "她同時帶著治療、淨化與冰晶護盾：消耗的 EP 越多，回復與護盾就越厚，前線的隊友因此撐得更久。",
      ],
      passives: [
        { name: "霜刺", text: "普通攻擊每次命中都會疊加冰霜，並定期附帶依目前 EP 計算的真實傷害。" },
        { name: "冰清玉潔", text: "生命首次跌入危險區時，立即獲得冰晶護盾；護盾被擊破時，向周圍的敵人爆發冰霜。" },
      ],
      core: [
        { level: 1, name: "風雪欲來", text: "對一片範圍造成魔法傷害並附加冰霜，同時鋪下暫時的冰雪地形。" },
        { level: 3, name: "白棠花開", text: "淨化範圍內友方（含自己）的負面狀態並回復生命；消耗的 EP 越多，回復越多。" },
        {
          level: 5,
          name: "霜華永眠",
          text: "把一大片土地化為冰雪庭園，接下來數回合持續造成傷害並疊加冰霜；冰霜疊滿的敵人會被凍結並承受重擊。",
        },
      ],
      cards: [
        { name: "冰晶守護", text: "為自己或一名友方加上冰晶護盾；選擇友方時，兩人同時上盾。" },
        { name: "寒鋒冰錐", text: "朝一個方向射出貫穿冰錐，對沿線每個敵人造成冰霜魔法傷害並附加冰霜。" },
        { name: "白蓮聖詠", text: "立即治療一名友方或自己；剩餘與消耗的 EP 越多，回復越多。" },
      ],
    },
    shadow: {
      title: "暗影（影之君主）",
      description:
        "暗影是《碎界》中以侵蝕與影子收割全場的刺客，在〈星痕紀元〉與旅人們交錯而過。他的故事、戰鬥風格與全部技能。",
      titles: "影之君主、永夜行者、如影隨行",
      quote: "光明的背面，皆是我的國度。",
      role: "暗影主宰 · 黑暗操控刺客",
      style: [
        "以「侵蝕」與「影子」為核心的刺客。黑暗攻擊會累積敵人的侵蝕度，侵蝕夠深的敵人背後會長出緊隨的影子；在自己的暗影領域裡出手，侵蝕會加深得更快。",
        "他的終結是〈萬影歸一〉：收割全場影子，一擊處決。高機動、高暴擊，但防禦與生命偏低，講究進場、收割、撤離的節奏。",
      ],
      passives: [
        { name: "如影隨形", text: "朝附近的目標移動時，移動所需的 AP 大幅減少。" },
        { name: "墮落於黑暗", text: "黑暗攻擊把目標的侵蝕度推滿時，立即造成大量侵蝕傷害；目標若倖存而生命偏低，直接處決。" },
      ],
      core: [
        { level: 1, name: "影刃", text: "朝一個方向擲出兩把短刃，命中背負影子的目標時傷害更高。" },
        {
          level: 3,
          name: "永夜侵蝕",
          text: "以自身為中心展開逐回合擴張的暗影領域：被觸及的敵人遭到侵蝕並減速，侵蝕夠深的敵人背後會出現影子；攻擊領域內的目標時，會額外加深侵蝕。",
        },
        { level: 5, name: "萬影歸一", text: "在自己的領域內施放：收割領域中所有影子，將目標拖到領域中心，造成隨影子數量增強的侵蝕重擊。" },
      ],
      cards: [
        { name: "歸影", text: "在原地留下一道影子並大幅提升速度；持續期間再次施放，立即回到那個位置。" },
        { name: "影蝕共鳴", text: "本回合大幅提高攻擊與技能傷害，附加的侵蝕度加倍。" },
        { name: "影襲", text: "遁到射程內目標的身後，以必定暴擊的背刺重創對方並使其恐懼。" },
      ],
    },
    sekien: {
      title: "赤焰（炎陽之子）",
      description:
        "赤焰是《碎界》中以真正炎核戰鬥的先鋒：弓劍雙形態、累積餘燼，倒下也能化作鳳凰重燃。他的故事、戰鬥風格與全部技能。",
      titles: "炎陽之子、赤天烈陽、永燃之焰",
      quote: "此火非術，乃我血肉。",
      role: "輸出 · 實體火焰先鋒",
      style: [
        "他操控的不是魔力，而是一團真正的炎核；戰鬥時消耗的資源叫做烈焰。弓形態從遠處點火，每一箭都累積餘燼，在沒有出手的回合把餘燼燃回烈焰；烈焰充足時就切入劍形態，近身爆發。",
        "火焰與焦地是他的主場：站在上面時恢復更快，對身陷其中的敵人也更致命。瀕死時他會化為鳳凰，燃盡烈焰重燃血肉。",
      ],
      passives: [
        { name: "炎核共鳴", text: "火焰分為劍、弓兩種形態：劍形態的近戰傷害隨烈焰增加，弓形態每射出一箭都會累積餘燼。" },
        { name: "浴火重燃", text: "沒有攻擊的回合把部分餘燼轉回烈焰，站在火焰或焦地上時效果加倍；以火焰擊殺敵人時立即恢復烈焰。" },
        {
          name: "浴火重生",
          text: "受到致命傷害時，若烈焰足夠就保住一口氣，化作鳳凰並在周圍鋪下焦地；燃盡的烈焰化為屏障，烈焰重新積滿時重生。",
        },
      ],
      core: [
        { level: 1, name: "炎核形變", text: "在弓與劍兩種形態之間切換。" },
        { level: 1, name: "烈焰貫星", text: "朝一個方向射出巨大火矢，貫穿沿線敵人且傷害不衰減，並留下焦地。" },
        {
          level: 3,
          name: "炎劍降臨",
          text: "凝聚火焰長劍並鎖定劍形態數回合，大幅強化近戰與暴擊；劍氣能延伸到第二格，點燃敵人與地面。",
        },
        {
          level: 5,
          name: "鳳焰天翔",
          text: "放出貫穿全場的火鳳凰，飛得越遠消耗越多烈焰、威力越強；命中處燃起焦地並使最先命中的敵人暈眩，代價是暴露自己的位置。",
        },
      ],
      cards: [
        { name: "天焚流星", text: "在一片範圍召喚火流星並附加灼燒，同時累積餘燼。" },
        { name: "炎雨", text: "一次射出多支火矢，平均分散到射程內的敵人；命中站在火焰或焦地上的敵人時，灼燒更久。" },
        { name: "餘燼回收", text: "蓄力一回合，把所有餘燼轉回烈焰；站在火焰或焦地上時立即完成。" },
      ],
    },
    aoiro: {
      title: "青蘿（噬星荊棘）",
      description:
        "青蘿是《碎界》〈星痕紀元〉中同行一程的射手：以神經毒素逼近臨界、用藤蔓封鎖退路，再以連射引爆。她的故事、戰鬥風格與全部技能。",
      titles: "噬星荊棘、苗床棄子、翠綠災厄",
      quote: "我曾是被獻祭的棄子。",
      role: "持續輸出 · 劇毒神經控制射手",
      style: [
        "以「神經毒素」為核心的射手。毒箭在敵人身上堆疊神經毒素，每推進一個階段就施加更重的減益，逼近臨界時引爆〈神經崩潰〉。",
        "她能催生藤蔓地形封鎖退路，也能進入連射模式，把整副手牌化作免費的普通攻擊一次傾瀉。",
      ],
      passives: [
        {
          name: "連射",
          text: "進入連射狀態時，手牌暫時化為免費的青棘射擊：丟出一張牌就是一次普通攻擊，回合結束時沒用完的手牌會復原。",
        },
        { name: "毒性感知", text: "敵人的神經毒素每推進一個階段就回復 EP；每回合第一次有敵人神經崩潰時，下一個技能少花 AP。" },
      ],
      core: [
        { level: 1, name: "神經超載", text: "強化下一次普通攻擊：必定命中、一次射出多支箭，附加的神經毒素也加倍。" },
        { level: 3, name: "神經阻斷", text: "對單一目標造成毒素傷害並大量附加神經毒素；毒素夠深時，立即結算一次持續傷害。" },
        { level: 5, name: "噬星過載", text: "以永久的代價換取爆發：立即進入連射模式並大幅延伸射程，直到回合結束。" },
      ],
      cards: [
        { name: "寄生蔓延", text: "在一片範圍催生藤蔓地形，範圍內的敵人受到毒素傷害並被束縛在原地。" },
        { name: "毒棘穿刺", text: "朝一個方向射出穿透荊棘彈，每穿過一格藤蔓就附加更多神經毒素。" },
        {
          name: "荊棘共鳴",
          text: "進入共鳴：攻擊藤蔓附近的目標會讓藤蔓蔓延；攻擊藤蔓中的敵人時，共鳴擴散到周圍同樣身陷藤蔓的敵人。",
        },
      ],
    },
  },
  world: {
    title: "世界觀：碎裂與碎界樹",
    description:
      "《碎界》的世界：星痕斷裂，大地碎成漂浮於虛空的殘片，沒有誰站在世界的中心。碎裂的由來、碎界樹，以及〈風雪過境〉〈星痕紀元〉等篇章。",
    sections: [
      {
        id: "shattering",
        heading: "星痕斷裂之後",
        body: [
          "在碎裂之前，星痕把河流、山脈、森林與命運刻在天空，大地因此有固定的形狀。星痕斷裂之後，大地失去了依據，碎成一片片漂浮在虛空中的殘片——碎界。",
          "碎裂不是誰降下的懲罰，而是天地在崩毀之前，為了保住自己所做的最後一次自救。",
        ],
      },
      {
        id: "ensemble",
        heading: "沒有中心的世界",
        body: [
          "這個世界沒有誰站在中心，也沒有一位主角替所有人回答問題。每個人都懷著自己的理由前行：有人尋找失去的人，有人追逐仍有光的碎片。",
          "當這些旅途在漂浮的碎片之間交錯，失落的大地與碎裂的真相才一點一點顯形。",
        ],
      },
      {
        id: "battlefield",
        heading: "戰場就是碎片",
        body: [
          "在戰鬥中，碎裂就是地形本身。碎片之間隔著無法通行的虛空，要跨過去，得站在邊緣自己建起傳送門。",
          "冰原、森林、河流與焦地都會被技能改寫：火焰燒出焦地、把河流蒸成蒸汽，冰霜讓河面結冰、鋪上冰雪。",
        ],
      },
    ],
    chaptersHeading: "碎界樹與篇章",
    chaptersLead:
      "碎界樹是《碎界》的篇章之樹：每一片碎界承載一段旅途，旅途交錯之處長出新的篇章。在遊戲裡，從碎界樹選擇篇章，就能進入該篇章的大廳，展開故事與對戰。",
  },
  gameplay: {
    title: "玩法說明",
    description:
      "《碎界》怎麼玩：用行動點移動、出牌與施放技能，在會被改寫的六角格地形上搶位置；局內升級解鎖技能，以消滅、生存或佔領取勝。另有故事、匹配、試煉與娛樂模式。",
    lead: "《碎界》是 2D 六角格回合制策略遊戲。每一局，你帶著角色踏上由碎片拼成的戰場，用行動點、手牌與技能搶下位置、改寫地形，直到一方取勝。",
    sections: [
      {
        id: "turns",
        heading: "回合與行動點",
        body: [
          "每一輪依角色的敏捷由高到低輪流行動。輪到你時，用行動點（AP）移動、普通攻擊、打出卡牌、施放技能、與地形互動或建造；用完或主動結束，就換下一位。",
          "所有人都行動完之後進入事件階段：野怪與召喚物行動，地形與持續效果結算，角色也會自然獲得經驗與星幣。",
        ],
      },
      {
        id: "hand",
        heading: "手牌",
        body: [
          "開局先抽牌，之後每回合自動補牌；手牌有上限，行動階段棄牌不花行動點。",
          "對手看得到你手上有幾張牌，看不到是哪幾張。",
        ],
        terms: [
          { term: "技能牌", text: "施放角色的卡牌技能。" },
          { term: "素材牌", text: "收進素材庫，用來合成裝備與建造。" },
          { term: "效果牌", text: "回復、護盾、增益或干擾。" },
          { term: "特殊牌", text: "傳送、摸牌、降低消耗、清除冷卻或淨化。" },
        ],
      },
      {
        id: "skills",
        heading: "技能與局內等級",
        body: [
          "每位角色都有出生即生效的被動、隨局內等級解鎖的核心技能，以及抽到對應技能牌才能使用的卡牌技能。施放技能需要足夠的 AP 與 EP，並等待冷卻。",
          "等級每局從頭累積：事件階段、擊敗野怪與敵方角色都會帶來經驗。",
        ],
        terms: [
          { term: "Lv.1", text: "被動與第一個核心技能。" },
          { term: "Lv.3", text: "第二個核心技能。" },
          { term: "Lv.5", text: "終極技能。" },
        ],
      },
      {
        id: "terrain",
        heading: "六角格、地形與高度",
        body: [
          "戰場由六角格組成，地形改變移動與戰鬥：森林與碎石提供掩體，河流與藤蔓拖慢腳步，山岳擋住去路與視線，冰面讓人滑行，蒸汽遮蔽視線。",
          "地形會被技能改寫：火焰燒出焦地、把河流蒸成蒸汽，冰霜讓河面結冰。戰場也有高低之分——高處的射程與視野更好，也能利用掩體遮擋視線；要跨越高低差，得靠攀爬、樓梯或攀巖鉤。",
          "戰場籠罩在迷霧裡，只看得到視野內的敵人。",
        ],
      },
      {
        id: "building",
        heading: "建造與傳送門",
        body: [
          "素材可以就地建造：橋、樓梯、牆、防禦工事、瞭望塔、路障、拒馬與篝火，各自改變通行、視野或攻防。篝火與拒馬不分敵我，放的位置要想清楚。",
          "碎片之間隔著虛空。站在虛空邊緣，就能建起跨越虛空的傳送門，開出通往對岸的路。",
        ],
      },
      {
        id: "economy",
        heading: "野怪、星使與裝備",
        body: [
          "野怪是中立單位，分普通、精英與首領，在事件階段行動，不計入勝負；擊敗牠們能拿到素材、經驗與星幣，首領的獎勵由隊伍分享。",
          "星使是在戰場上旅行的商人，位置全圖可見；走到相鄰的格子，就能用星幣購買素材、裝備與效果牌，也能易物或出售裝備。星幣只在當局有效。",
        ],
      },
      {
        id: "victory",
        heading: "勝利條件",
        body: [
          "多數對戰以消滅取勝；自訂房間可以自由選擇地圖與勝利條件。故事中的戰鬥一律採用消滅。",
          "3v3 中，生命歸零的角色會倒地待救治，相鄰的隊友可以把他救回來；全隊都倒下就落敗。",
        ],
        terms: [
          { term: "消滅", text: "擊敗對方所有角色。" },
          { term: "生存", text: "在指定的回合數內存活。" },
          { term: "佔領", text: "搶下並持續控制場上的要衝點，先滿足條件的一方獲勝。" },
        ],
      },
      {
        id: "modes",
        heading: "遊戲模式",
        body: ["從碎界樹選好篇章後，大廳分成故事與對戰。對戰有三個入口："],
        terms: [
          { term: "故事", text: "沿著篇章的劇情前進，在劇情戰鬥中對上 AI。" },
          { term: "匹配", text: "依星燼排位的玩家對戰。" },
          { term: "試煉", text: "挑戰 AI，難度分為簡單、困難與煉獄；可以一個人，也能和隊友組成 3v3。" },
          { term: "娛樂", text: "休閒對戰、佔領戰與自訂房間，都不計分。" },
        ],
      },
      {
        id: "formats",
        heading: "對戰形式",
        body: ["匹配與試煉都可以選擇以下形式："],
        terms: [
          { term: "1v1", text: "經典一對一，各控一名角色。" },
          { term: "1v1 Super", text: "每人操控三名角色，共用隊伍回合，可隨時切換。" },
          { term: "3v3", text: "三人一隊，每人操控一名角色。" },
        ],
      },
    ],
  },
  faq: {
    title: "常見問題",
    description:
      "《碎界》常見問題：在哪裡玩、需不需要帳號、一開始有哪些角色、有哪些模式、能不能一個人或和朋友一起玩，以及目前開放的篇章。",
    lead: "關於《碎界》最常被問到的幾件事。",
    entries: [
      {
        id: "what",
        q: "《碎界》是什麼樣的遊戲？",
        a: [
          "《碎界》（Shattered Realms）是由 Hoshivel 開發的 2D 六角格回合制策略遊戲。每回合用行動點移動、出牌與施放角色技能，在會被技能改寫的地形上搶位置，直到一方取勝。",
        ],
        link: "gameplay",
      },
      {
        id: "where",
        q: "要去哪裡玩？需要下載嗎？",
        a: ["直接在瀏覽器裡玩，不需要下載安裝。在本站的「開始遊戲」選擇連線地區即可進入，也可以改在新分頁開啟。"],
        link: "play",
      },
      {
        id: "account",
        q: "需要帳號嗎？",
        a: ["以 Hoshi ID 登入——那是 Hoshivel 各作品共用的帳號。登入後，角色、進度與戰績都會保存在帳號裡。"],
      },
      {
        id: "characters",
        q: "一開始有哪些角色可以用？",
        a: [
          "新帳號會先進入基本教學，完成後就能獲得白棠。",
          "3v3 不限制你持有幾名角色：伺服器會替那一局補足可選的角色，只限該局使用。",
        ],
        link: "characters",
      },
      {
        id: "modes",
        q: "有哪些遊戲模式？",
        a: [
          "大廳分成故事與對戰。對戰有三個入口：匹配是依星燼排位的玩家對戰；試煉是挑戰 AI，分簡單、困難與煉獄；娛樂包含休閒對戰、佔領戰與自訂房間，都不計分。",
          "對戰形式有 1v1、每人操控三名角色的 1v1 Super，以及三人一隊的 3v3。",
        ],
        link: "gameplay",
      },
      {
        id: "solo",
        q: "可以一個人玩嗎？",
        a: [
          "可以。故事與試煉都能一個人對上 AI。只有你一位玩家的對局可以隨時暫停；斷線或離開也只會暫停，之後再從大廳接著打。",
        ],
      },
      {
        id: "friends",
        q: "可以和朋友一起玩嗎？",
        a: [
          "可以。用組隊邀請碼找朋友同隊，最多三人一隊，一起匹配或挑戰試煉；也可以開自訂房間，用對局碼邀請雙方玩家與觀戰者。",
        ],
      },
      {
        id: "victory",
        q: "怎麼取勝？",
        a: [
          "多數對戰以消滅取勝：擊敗對方所有角色。另有在指定回合數內存活的生存，以及搶下並守住要衝點的佔領；故事中的戰鬥一律採用消滅。",
        ],
        link: "gameplay",
      },
      {
        id: "languages",
        q: "支援哪些語言？",
        a: ["遊戲與本站都提供正體中文、简体中文、English 與日本語。"],
      },
      {
        id: "chapters",
        q: "目前開放到哪一章？",
        a: ["第一章〈風雪過境〉已經上線，第二章〈星痕紀元〉即將開放。"],
        link: "world",
      },
    ],
  },
};

const zhCN: PagesCopy = {
  labels: {
    titleSuffix: "｜碎界 Shattered Realms",
    breadcrumb: "页面位置",
    home: "首页",
    explore: "深入了解",
    profile: "完整介绍",
    story: "故事",
    style: "战斗风格",
    skills: "技能",
    passives: "被动",
    passivesNote: "出生即有，永久生效。",
    core: "核心技能",
    coreNote: "随局内等级解锁，固定在技能栏上。",
    ultimate: "终极",
    cards: "卡牌技能",
    cardsNote: "抽到并打出对应的技能牌时施放。",
    chapter: "登场篇章",
    others: "其他角色",
    more: "延伸阅读：",
  },
  nav: {
    characters: "角色",
    world: "世界观",
    gameplay: "玩法说明",
    faq: "常见问题",
  },
  characters: {
    title: "角色介绍",
    description:
      "认识《碎界》的四位角色——白棠、暗影、赤焰与青萝：他们各自在寻找什么、在哪一段旅途登场，以及在战斗中擅长什么。",
  },
  character: {
    hakuto: {
      title: "白棠（雪境之棠）",
      description:
        "白棠是《碎界》〈风雪过境〉的主要视角：诞生于冰原深处的白棠花，以冰霜与冻结封住敌人的后排法系。她的故事、战斗风格与全部技能。",
      titles: "雪境之棠、霜华圣女、白银庭园的守望者",
      quote: "雪骨冰姿，洁白无瑕。",
      role: "控制 · 冰霜法系后排",
      style: [
        "以 EP 为核心资源的后排法系。普通攻击与技能都会在敌人身上叠加冰霜，冰霜叠满就转为冻结，让她能从后方封住对手的前进路线。",
        "她同时带着治疗、净化与冰晶护盾：消耗的 EP 越多，回复与护盾就越厚，前线的队友因此撑得更久。",
      ],
      passives: [
        { name: "霜刺", text: "普通攻击每次命中都会叠加冰霜，并定期附带按当前 EP 计算的真实伤害。" },
        { name: "冰清玉洁", text: "生命首次跌入危险区时，立即获得冰晶护盾；护盾被击破时，向周围的敌人爆发冰霜。" },
      ],
      core: [
        { level: 1, name: "风雪欲来", text: "对一片范围造成魔法伤害并附加冰霜，同时铺下暂时的冰雪地形。" },
        { level: 3, name: "白棠花开", text: "净化范围内友方（含自己）的负面状态并回复生命；消耗的 EP 越多，回复越多。" },
        {
          level: 5,
          name: "霜华永眠",
          text: "把一大片土地化为冰雪庭园，接下来数回合持续造成伤害并叠加冰霜；冰霜叠满的敌人会被冻结并承受重击。",
        },
      ],
      cards: [
        { name: "冰晶守护", text: "为自己或一名友方加上冰晶护盾；选择友方时，两人同时上盾。" },
        { name: "寒锋冰锥", text: "朝一个方向射出贯穿冰锥，对沿线每个敌人造成冰霜魔法伤害并附加冰霜。" },
        { name: "白莲圣咏", text: "立即治疗一名友方或自己；剩余与消耗的 EP 越多，回复越多。" },
      ],
    },
    shadow: {
      title: "暗影（影之君主）",
      description:
        "暗影是《碎界》中以侵蚀与影子收割全场的刺客，在〈星痕纪元〉与旅人们交错而过。他的故事、战斗风格与全部技能。",
      titles: "影之君主、永夜行者、如影随行",
      quote: "光明的背面，皆是我的国度。",
      role: "暗影主宰 · 黑暗操控刺客",
      style: [
        "以「侵蚀」与「影子」为核心的刺客。黑暗攻击会累积敌人的侵蚀度，侵蚀够深的敌人背后会长出紧随的影子；在自己的暗影领域里出手，侵蚀会加深得更快。",
        "他的终结是〈万影归一〉：收割全场影子，一击处决。高机动、高暴击，但防御与生命偏低，讲究进场、收割、撤离的节奏。",
      ],
      passives: [
        { name: "如影随形", text: "朝附近的目标移动时，移动所需的 AP 大幅减少。" },
        { name: "堕落于黑暗", text: "黑暗攻击把目标的侵蚀度推满时，立即造成大量侵蚀伤害；目标若幸存而生命偏低，直接处决。" },
      ],
      core: [
        { level: 1, name: "影刃", text: "朝一个方向掷出两把短刃，命中背负影子的目标时伤害更高。" },
        {
          level: 3,
          name: "永夜侵蚀",
          text: "以自身为中心展开逐回合扩张的暗影领域：被触及的敌人遭到侵蚀并减速，侵蚀够深的敌人背后会出现影子；攻击领域内的目标时，会额外加深侵蚀。",
        },
        { level: 5, name: "万影归一", text: "在自己的领域内施放：收割领域中所有影子，将目标拖到领域中心，造成随影子数量增强的侵蚀重击。" },
      ],
      cards: [
        { name: "归影", text: "在原地留下一道影子并大幅提升速度；持续期间再次施放，立即回到那个位置。" },
        { name: "影蚀共鸣", text: "本回合大幅提高攻击与技能伤害，附加的侵蚀度加倍。" },
        { name: "影袭", text: "遁到射程内目标的身后，以必定暴击的背刺重创对方并使其恐惧。" },
      ],
    },
    sekien: {
      title: "赤焰（炎阳之子）",
      description:
        "赤焰是《碎界》中以真正炎核战斗的先锋：弓剑双形态、累积余烬，倒下也能化作凤凰重燃。他的故事、战斗风格与全部技能。",
      titles: "炎阳之子、赤天烈阳、永燃之焰",
      quote: "此火非术，乃我血肉。",
      role: "输出 · 实体火焰先锋",
      style: [
        "他操控的不是魔力，而是一团真正的炎核；战斗时消耗的资源叫作烈焰。弓形态从远处点火，每一箭都累积余烬，在没有出手的回合把余烬燃回烈焰；烈焰充足时就切入剑形态，近身爆发。",
        "火焰与焦地是他的主场：站在上面时恢复更快，对身陷其中的敌人也更致命。濒死时他会化为凤凰，燃尽烈焰重燃血肉。",
      ],
      passives: [
        { name: "炎核共鸣", text: "火焰分为剑、弓两种形态：剑形态的近战伤害随烈焰增加，弓形态每射出一箭都会累积余烬。" },
        { name: "浴火重燃", text: "没有攻击的回合把部分余烬转回烈焰，站在火焰或焦地上时效果加倍；以火焰击杀敌人时立即恢复烈焰。" },
        {
          name: "浴火重生",
          text: "受到致命伤害时，若烈焰足够就保住一口气，化作凤凰并在周围铺下焦地；燃尽的烈焰化为屏障，烈焰重新积满时重生。",
        },
      ],
      core: [
        { level: 1, name: "炎核形变", text: "在弓与剑两种形态之间切换。" },
        { level: 1, name: "烈焰贯星", text: "朝一个方向射出巨大火矢，贯穿沿线敌人且伤害不衰减，并留下焦地。" },
        {
          level: 3,
          name: "炎剑降临",
          text: "凝聚火焰长剑并锁定剑形态数回合，大幅强化近战与暴击；剑气能延伸到第二格，点燃敌人与地面。",
        },
        {
          level: 5,
          name: "凤焰天翔",
          text: "放出贯穿全场的火凤凰，飞得越远消耗越多烈焰、威力越强；命中处燃起焦地并使最先命中的敌人眩晕，代价是暴露自己的位置。",
        },
      ],
      cards: [
        { name: "天焚流星", text: "在一片范围召唤火流星并附加灼烧，同时累积余烬。" },
        { name: "炎雨", text: "一次射出多支火矢，平均分散到射程内的敌人；命中站在火焰或焦地上的敌人时，灼烧更久。" },
        { name: "余烬回收", text: "蓄力一回合，把所有余烬转回烈焰；站在火焰或焦地上时立即完成。" },
      ],
    },
    aoiro: {
      title: "青萝（噬星荆棘）",
      description:
        "青萝是《碎界》〈星痕纪元〉中同行一程的射手：以神经毒素逼近临界、用藤蔓封锁退路，再以连射引爆。她的故事、战斗风格与全部技能。",
      titles: "噬星荆棘、苗床弃子、翠绿灾厄",
      quote: "我曾是被献祭的弃子。",
      role: "持续输出 · 剧毒神经控制射手",
      style: [
        "以「神经毒素」为核心的射手。毒箭在敌人身上堆叠神经毒素，每推进一个阶段就施加更重的减益，逼近临界时引爆〈神经崩溃〉。",
        "她能催生藤蔓地形封锁退路，也能进入连射模式，把整副手牌化作免费的普通攻击一次倾泻。",
      ],
      passives: [
        {
          name: "连射",
          text: "进入连射状态时，手牌暂时化为免费的青棘射击：丢出一张牌就是一次普通攻击，回合结束时没用完的手牌会复原。",
        },
        { name: "毒性感知", text: "敌人的神经毒素每推进一个阶段就回复 EP；每回合第一次有敌人神经崩溃时，下一个技能少花 AP。" },
      ],
      core: [
        { level: 1, name: "神经超载", text: "强化下一次普通攻击：必定命中、一次射出多支箭，附加的神经毒素也加倍。" },
        { level: 3, name: "神经阻断", text: "对单一目标造成毒素伤害并大量附加神经毒素；毒素够深时，立即结算一次持续伤害。" },
        { level: 5, name: "噬星过载", text: "以永久的代价换取爆发：立即进入连射模式并大幅延伸射程，直到回合结束。" },
      ],
      cards: [
        { name: "寄生蔓延", text: "在一片范围催生藤蔓地形，范围内的敌人受到毒素伤害并被束缚在原地。" },
        { name: "毒棘穿刺", text: "朝一个方向射出穿透荆棘弹，每穿过一格藤蔓就附加更多神经毒素。" },
        {
          name: "荆棘共鸣",
          text: "进入共鸣：攻击藤蔓附近的目标会让藤蔓蔓延；攻击藤蔓中的敌人时，共鸣扩散到周围同样身陷藤蔓的敌人。",
        },
      ],
    },
  },
  world: {
    title: "世界观：碎裂与碎界树",
    description:
      "《碎界》的世界：星痕断裂，大地碎成漂浮于虚空的残片，没有谁站在世界的中心。碎裂的由来、碎界树，以及〈风雪过境〉〈星痕纪元〉等篇章。",
    sections: [
      {
        id: "shattering",
        heading: "星痕断裂之后",
        body: [
          "在碎裂之前，星痕把河流、山脉、森林与命运刻在天空，大地因此有固定的形状。星痕断裂之后，大地失去了依据，碎成一片片漂浮在虚空中的残片——碎界。",
          "碎裂不是谁降下的惩罚，而是天地在崩毁之前，为了保住自己所做的最后一次自救。",
        ],
      },
      {
        id: "ensemble",
        heading: "没有中心的世界",
        body: [
          "这个世界没有谁站在中心，也没有一位主角替所有人回答问题。每个人都怀着自己的理由前行：有人寻找失去的人，有人追逐仍有光的碎片。",
          "当这些旅途在漂浮的碎片之间交错，失落的大地与碎裂的真相才一点一点显形。",
        ],
      },
      {
        id: "battlefield",
        heading: "战场就是碎片",
        body: [
          "在战斗中，碎裂就是地形本身。碎片之间隔着无法通行的虚空，要跨过去，得站在边缘自己建起传送门。",
          "冰原、森林、河流与焦地都会被技能改写：火焰烧出焦地、把河流蒸成蒸汽，冰霜让河面结冰、铺上冰雪。",
        ],
      },
    ],
    chaptersHeading: "碎界树与篇章",
    chaptersLead:
      "碎界树是《碎界》的篇章之树：每一片碎界承载一段旅途，旅途交错之处长出新的篇章。在游戏里，从碎界树选择篇章，就能进入该篇章的大厅，展开故事与对战。",
  },
  gameplay: {
    title: "玩法说明",
    description:
      "《碎界》怎么玩：用行动点移动、出牌与施放技能，在会被改写的六角格地形上抢位置；局内升级解锁技能，以消灭、生存或占领取胜。另有故事、匹配、试炼与娱乐模式。",
    lead: "《碎界》是 2D 六角格回合制策略游戏。每一局，你带着角色踏上由碎片拼成的战场，用行动点、手牌与技能抢下位置、改写地形，直到一方取胜。",
    sections: [
      {
        id: "turns",
        heading: "回合与行动点",
        body: [
          "每一轮按角色的敏捷由高到低轮流行动。轮到你时，用行动点（AP）移动、普通攻击、打出卡牌、施放技能、与地形互动或建造；用完或主动结束，就换下一位。",
          "所有人都行动完之后进入事件阶段：野怪与召唤物行动，地形与持续效果结算，角色也会自然获得经验与星币。",
        ],
      },
      {
        id: "hand",
        heading: "手牌",
        body: [
          "开局先抽牌，之后每回合自动补牌；手牌有上限，行动阶段弃牌不花行动点。",
          "对手看得到你手上有几张牌，看不到是哪几张。",
        ],
        terms: [
          { term: "技能牌", text: "施放角色的卡牌技能。" },
          { term: "素材牌", text: "收进素材库，用来合成装备与建造。" },
          { term: "效果牌", text: "回复、护盾、增益或干扰。" },
          { term: "特殊牌", text: "传送、摸牌、降低消耗、清除冷却或净化。" },
        ],
      },
      {
        id: "skills",
        heading: "技能与局内等级",
        body: [
          "每位角色都有出生即生效的被动、随局内等级解锁的核心技能，以及抽到对应技能牌才能使用的卡牌技能。施放技能需要足够的 AP 与 EP，并等待冷却。",
          "等级每局从头累积：事件阶段、击败野怪与敌方角色都会带来经验。",
        ],
        terms: [
          { term: "Lv.1", text: "被动与第一个核心技能。" },
          { term: "Lv.3", text: "第二个核心技能。" },
          { term: "Lv.5", text: "终极技能。" },
        ],
      },
      {
        id: "terrain",
        heading: "六角格、地形与高度",
        body: [
          "战场由六角格组成，地形改变移动与战斗：森林与碎石提供掩体，河流与藤蔓拖慢脚步，山岳挡住去路与视线，冰面让人滑行，蒸汽遮蔽视线。",
          "地形会被技能改写：火焰烧出焦地、把河流蒸成蒸汽，冰霜让河面结冰。战场也有高低之分——高处的射程与视野更好，也能利用掩体遮挡视线；要跨越高低差，得靠攀爬、楼梯或攀岩钩。",
          "战场笼罩在迷雾里，只看得到视野内的敌人。",
        ],
      },
      {
        id: "building",
        heading: "建造与传送门",
        body: [
          "素材可以就地建造：桥、楼梯、墙、防御工事、瞭望塔、路障、拒马与篝火，各自改变通行、视野或攻防。篝火与拒马不分敌我，放的位置要想清楚。",
          "碎片之间隔着虚空。站在虚空边缘，就能建起跨越虚空的传送门，开出通往对岸的路。",
        ],
      },
      {
        id: "economy",
        heading: "野怪、星使与装备",
        body: [
          "野怪是中立单位，分普通、精英与首领，在事件阶段行动，不计入胜负；击败它们能拿到素材、经验与星币，首领的奖励由队伍分享。",
          "星使是在战场上旅行的商人，位置全图可见；走到相邻的格子，就能用星币购买素材、装备与效果牌，也能易物或出售装备。星币只在当局有效。",
        ],
      },
      {
        id: "victory",
        heading: "胜利条件",
        body: [
          "多数对战以消灭取胜；自定义房间可以自由选择地图与胜利条件。故事中的战斗一律采用消灭。",
          "3v3 中，生命归零的角色会倒地待救治，相邻的队友可以把他救回来；全队都倒下就落败。",
        ],
        terms: [
          { term: "消灭", text: "击败对方所有角色。" },
          { term: "生存", text: "在指定的回合数内存活。" },
          { term: "占领", text: "抢下并持续控制场上的要冲点，先满足条件的一方获胜。" },
        ],
      },
      {
        id: "modes",
        heading: "游戏模式",
        body: ["从碎界树选好篇章后，大厅分成故事与对战。对战有三个入口："],
        terms: [
          { term: "故事", text: "沿着篇章的剧情前进，在剧情战斗中对上 AI。" },
          { term: "匹配", text: "按星烬排位的玩家对战。" },
          { term: "试炼", text: "挑战 AI，难度分为简单、困难与炼狱；可以一个人，也能和队友组成 3v3。" },
          { term: "娱乐", text: "休闲对战、占领战与自定义房间，都不计分。" },
        ],
      },
      {
        id: "formats",
        heading: "对战形式",
        body: ["匹配与试炼都可以选择以下形式："],
        terms: [
          { term: "1v1", text: "经典一对一，各控一名角色。" },
          { term: "1v1 Super", text: "每人操控三名角色，共用队伍回合，可随时切换。" },
          { term: "3v3", text: "三人一队，每人操控一名角色。" },
        ],
      },
    ],
  },
  faq: {
    title: "常见问题",
    description:
      "《碎界》常见问题：在哪里玩、需不需要账号、一开始有哪些角色、有哪些模式、能不能一个人或和朋友一起玩，以及目前开放的篇章。",
    lead: "关于《碎界》最常被问到的几件事。",
    entries: [
      {
        id: "what",
        q: "《碎界》是什么样的游戏？",
        a: [
          "《碎界》（Shattered Realms）是由 Hoshivel 开发的 2D 六角格回合制策略游戏。每回合用行动点移动、出牌与施放角色技能，在会被技能改写的地形上抢位置，直到一方取胜。",
        ],
        link: "gameplay",
      },
      {
        id: "where",
        q: "在哪里玩？需要下载吗？",
        a: ["直接在浏览器里玩，不需要下载安装。在本站的「开始游戏」选择连线地区即可进入，也可以改在新标签页打开。"],
        link: "play",
      },
      {
        id: "account",
        q: "需要账号吗？",
        a: ["使用 Hoshi ID 登录——那是 Hoshivel 各作品共用的账号。登录后，角色、进度与战绩都会保存在账号里。"],
      },
      {
        id: "characters",
        q: "一开始有哪些角色可以用？",
        a: [
          "新账号会先进入基本教学，完成后就能获得白棠。",
          "3v3 不限制你持有几名角色：服务器会替那一局补足可选的角色，只限该局使用。",
        ],
        link: "characters",
      },
      {
        id: "modes",
        q: "有哪些游戏模式？",
        a: [
          "大厅分成故事与对战。对战有三个入口：匹配是按星烬排位的玩家对战；试炼是挑战 AI，分简单、困难与炼狱；娱乐包含休闲对战、占领战与自定义房间，都不计分。",
          "对战形式有 1v1、每人操控三名角色的 1v1 Super，以及三人一队的 3v3。",
        ],
        link: "gameplay",
      },
      {
        id: "solo",
        q: "可以一个人玩吗？",
        a: [
          "可以。故事与试炼都能一个人对上 AI。只有你一位玩家的对局可以随时暂停；断线或离开也只会暂停，之后再从大厅接着打。",
        ],
      },
      {
        id: "friends",
        q: "可以和朋友一起玩吗？",
        a: [
          "可以。用组队邀请码找朋友同队，最多三人一队，一起匹配或挑战试炼；也可以开自定义房间，用对局码邀请双方玩家与观战者。",
        ],
      },
      {
        id: "victory",
        q: "怎么取胜？",
        a: [
          "多数对战以消灭取胜：击败对方所有角色。另有在指定回合数内存活的生存，以及抢下并守住要冲点的占领；故事中的战斗一律采用消灭。",
        ],
        link: "gameplay",
      },
      {
        id: "languages",
        q: "支持哪些语言？",
        a: ["游戏与本站都提供正體中文、简体中文、English 与日本語。"],
      },
      {
        id: "chapters",
        q: "目前开放到哪一章？",
        a: ["第一章〈风雪过境〉已经上线，第二章〈星痕纪元〉即将开放。"],
        link: "world",
      },
    ],
  },
};

const en: PagesCopy = {
  labels: {
    titleSuffix: " | Shattered Realms",
    breadcrumb: "Breadcrumb",
    home: "Home",
    explore: "Explore",
    profile: "Full profile",
    story: "Story",
    style: "Combat style",
    skills: "Skills",
    passives: "Passives",
    passivesNote: "Active from the start, all match long.",
    core: "Core skills",
    coreNote: "Unlock with in-match levels and stay on the skill bar.",
    ultimate: "Ultimate",
    cards: "Card skills",
    cardsNote: "Cast by drawing and playing the matching skill card.",
    chapter: "Appears in",
    others: "Other characters",
    more: "Read more: ",
  },
  nav: {
    characters: "Characters",
    world: "World",
    gameplay: "How to Play",
    faq: "FAQ",
  },
  characters: {
    title: "Characters",
    description:
      "Meet the cast of Shattered Realms — Hakuto, Dark Shadow, Sekien and Aoiro: what each is searching for, where their journey begins, and how they fight.",
  },
  character: {
    hakuto: {
      title: "Hakuto, Bloom of the Snowbound Realm",
      description:
        "Hakuto is the viewpoint of Snowstorm's Passage in Shattered Realms: a frost caster born from a snow-plum blossom. Her story, combat style and skills.",
      titles: "Bloom of the Snowbound Realm · Saint of Frostlight · Warden of the Silver Garden",
      quote: "Snow-boned, ice-graced — pure beyond blemish.",
      role: "Control · Frost backline caster",
      style: [
        "A backline caster built on EP. Her basic attacks and skills stack frost on enemies, and a full stack turns into freeze — so from the back row she can shut down the routes the other side wants to take.",
        "She also carries healing, cleansing and crystal shields. The more EP she spends, the stronger they get, keeping the front line standing longer.",
      ],
      passives: [
        { name: "Frostbarb", text: "Every basic attack that lands stacks frost, and regularly adds true damage based on her current EP." },
        { name: "Pure as Frost", text: "The first time her HP falls into danger, she gains an ice shield; when it breaks, frost bursts over the enemies around her." },
      ],
      core: [
        { level: 1, name: "Blizzard Approaches", text: "Deals magic damage over an area, applies frost and lays down snow for a short while." },
        { level: 3, name: "Crabapple Bloom", text: "Cleanses debuffs from allies in an area (herself included) and heals them; the more EP spent, the bigger the heal." },
        {
          level: 5,
          name: "Eternal Frost",
          text: "Turns a wide field into a frozen garden that keeps dealing damage and stacking frost for several turns; enemies who reach a full stack freeze and take a heavy hit.",
        },
      ],
      cards: [
        { name: "Crystal Guard", text: "Shields herself or an ally; choosing an ally shields both of them at once." },
        { name: "Frostfang Lance", text: "Fires a piercing ice lance in one direction, dealing frost magic damage and frost to every enemy in its path." },
        { name: "White Lotus Hymn", text: "Instantly heals an ally or herself; both her remaining EP and the EP spent make the heal bigger." },
      ],
    },
    shadow: {
      title: "Dark Shadow, Lord of Shadows",
      description:
        "Dark Shadow is the Shattered Realms assassin who harvests the field with erosion and shadows, crossing paths in the Age of Starmarks. Story, style, skills.",
      titles: "Lord of Shadows · Walker of the Eternal Night · The Ever-Following Shade",
      quote: "All that lies behind the light is my dominion.",
      role: "Shadow sovereign · Dark-control assassin",
      style: [
        "An assassin built around erosion and shadows. His dark attacks build up an enemy's erosion, and once it runs deep enough a shadow clings to that enemy's back. Striking inside his own shadow domain deepens the erosion faster.",
        "His finisher is All Shadows as One: he harvests every shadow on the field for a single executing blow. High mobility and crit, low defence and HP — he dives in, harvests and gets out.",
      ],
      passives: [
        { name: "Like a Shadow", text: "Moving toward a nearby target costs far less AP." },
        { name: "Fall into Darkness", text: "When a dark attack fills a target's erosion, it takes heavy erosion damage at once; a survivor left on low HP is executed." },
      ],
      core: [
        { level: 1, name: "Shadow Blade", text: "Throws two short blades in one direction; they hit harder against a target carrying a shadow." },
        {
          level: 3,
          name: "Eternal Erosion",
          text: "Unfurls a shadow domain around him that grows every turn. Enemies it touches are eroded and slowed, deep erosion grows a shadow on their backs, and attacks on targets inside the domain erode them further.",
        },
        { level: 5, name: "All Shadows as One", text: "Cast inside his domain: harvests every shadow in it, drags the target to the centre and lands an erosion strike that grows with each shadow taken." },
      ],
      cards: [
        { name: "Return to Shadow", text: "Leaves a shadow where he stands and greatly raises his speed; casting again while it lasts brings him straight back." },
        { name: "Shadow Resonance", text: "For this turn, sharply raises his attack and skill damage and doubles the erosion he applies." },
        { name: "Shadow Strike", text: "Slips behind a target in range for a guaranteed critical backstab that leaves it afraid." },
      ],
    },
    sekien: {
      title: "Sekien, Son of the Blazing Sun",
      description:
        "Sekien is the Shattered Realms vanguard who fights with a living flame core: bow and sword, banked Ember, a phoenix rebirth. His story, style and skills.",
      titles: "Son of the Blazing Sun · Fierce Sun of the Crimson Sky · The Everburning Flame",
      quote: "This fire is no spell — it is my flesh and blood.",
      role: "Damage · Embodied-flame vanguard",
      style: [
        "He wields no mana but a literal flame core, and the resource he burns in a fight is Flame. In bow form he sets fires from afar and every arrow banks Ember, which he rekindles into Flame on turns he holds his fire; with Flame to spare he switches to sword form for close-range burst.",
        "Fire and scorched ground are his home turf: he recovers faster standing on them, and enemies caught in them suffer more. On the brink of death he becomes a phoenix, burning all his Flame to reforge his flesh.",
      ],
      passives: [
        { name: "Flame Core Resonance", text: "His flame takes a sword or bow form: in sword form his melee damage grows with Flame; in bow form every shot banks Ember." },
        { name: "Rekindle", text: "On turns he doesn't attack, part of his Ember turns back into Flame, doubled on fire or scorched ground; a fire kill restores Flame at once." },
        {
          name: "Phoenix Rebirth",
          text: "A fatal blow with enough Flame leaves him clinging to life as a phoenix, scorching the ground around him; his Flame becomes a barrier, and once it fills again he is reborn.",
        },
      ],
      core: [
        { level: 1, name: "Flame Core Morph", text: "Switches between bow and sword form." },
        { level: 1, name: "Blazing Starlance", text: "Fires a giant arrow in one direction that pierces every enemy in line without losing damage, leaving scorched ground behind." },
        {
          level: 3,
          name: "Flame Blade Descent",
          text: "Forges a flame sword and locks him into sword form for a few turns, greatly boosting melee damage and crits; sword-qi reaches a second tile and sets enemies and ground alight.",
        },
        {
          level: 5,
          name: "Phoenix Ascension",
          text: "Looses a phoenix that pierces the whole field, burning more Flame and hitting harder the farther it flies; it scorches the impact and stuns the first enemy hit — at the price of revealing where he stands.",
        },
      ],
      cards: [
        { name: "Heaven's Meteors", text: "Calls meteors onto an area, adding burn and banking Ember." },
        { name: "Flame Rain", text: "Looses a volley of fire arrows spread across the enemies in range; enemies standing on fire or scorched ground burn longer." },
        { name: "Ember Reclaim", text: "Charges for a turn, then turns all his Ember into Flame — instantly if he stands on fire or scorched ground." },
      ],
    },
    aoiro: {
      title: "Aoiro, Star-Devouring Bramble",
      description:
        "Aoiro is the archer of Shattered Realms who walks one stretch of the Age of Starmarks: neurotoxin to the brink, vines to cut off escape, then rapid fire.",
      titles: "Star-Devouring Bramble · Castaway of the Seedbed · The Verdant Calamity",
      quote: "I was the offering they cast away.",
      role: "Sustained DPS · Venom neuro-control archer",
      style: [
        "An archer built around neurotoxin. Her venom arrows stack it on enemies; each stage it climbs adds a heavier debuff, and at the brink it detonates as Neural Collapse.",
        "She grows vine fields to cut off escape routes, and can enter rapid-fire mode to pour out her whole hand as free basic attacks.",
      ],
      passives: [
        {
          name: "Rapid-fire",
          text: "In rapid-fire, every card in her hand briefly becomes a free Green-Thorn Shot: each card she spends is one basic attack, and unused cards come back when the turn ends.",
        },
        { name: "Toxic Perception", text: "She recovers EP each time an enemy's neurotoxin climbs a stage; the first Neural Collapse each turn makes her next skill cost less AP." },
      ],
      core: [
        { level: 1, name: "Neural Overload", text: "Charges her next basic attack: it cannot miss, fires several arrows at once and applies double neurotoxin." },
        { level: 3, name: "Neural Blockade", text: "Deals poison damage to one target and applies a heavy dose of neurotoxin; if the venom runs deep enough, its damage over time ticks at once." },
        { level: 5, name: "Star-Devouring Overload", text: "Trades a permanent cost for a burst: she enters rapid-fire at once with greatly extended range until the turn ends." },
      ],
      cards: [
        { name: "Parasitic Spread", text: "Grows a vine field over an area; enemies inside take poison damage and are rooted in place." },
        { name: "Venom Pierce", text: "Fires a piercing thorn bolt in one direction; every vine tile it crosses adds more neurotoxin." },
        {
          name: "Thorn Resonance",
          text: "Enters resonance: hitting a target near vines makes the vines spread, and striking a vine-bound enemy resonates to the vine-bound enemies around it.",
        },
      ],
    },
  },
  world: {
    title: "The World: the Shattering and the Shattered Realms Tree",
    description:
      "The world of Shattered Realms: when the starmarks broke, the land scattered across the void. Read about the Shattering and the Shattered Realms Tree.",
    sections: [
      {
        id: "shattering",
        heading: "After the starmarks broke",
        body: [
          "Before the Shattering, the starmarks inscribed rivers, mountains, forests and fate across the sky, and that is what gave the land its shape. When they broke, the land lost what held it together and scattered into fragments adrift in the void — the shattered realms.",
          "The Shattering was not a punishment anyone handed down. It was the world's final attempt to save itself before it fell apart.",
        ],
      },
      {
        id: "ensemble",
        heading: "A world without a center",
        body: [
          "Nobody stands at the center of this world, and no single hero answers for everyone. Each person travels for a reason of their own: some search for people they lost, others chase fragments that still hold light.",
          "Only where those journeys cross between the drifting fragments do the lost lands — and the truth of the Shattering — slowly come into view.",
        ],
      },
      {
        id: "battlefield",
        heading: "The battlefield is a fragment",
        body: [
          "In battle, the Shattering is the terrain itself. The void between fragments cannot be crossed on foot; to get across, you stand at the edge and build a portal yourself.",
          "Ice fields, forests, rivers and scorched ground can all be rewritten by skills: fire scorches the ground and boils rivers into steam, and frost freezes the water and lays down snow.",
        ],
      },
    ],
    chaptersHeading: "The Shattered Realms Tree and its chapters",
    chaptersLead:
      "The Shattered Realms Tree is the tree of chapters: every realm-fragment holds a journey, and new chapters grow where journeys cross. In the game you pick a chapter from the tree to enter its lobby, where its story and battles begin.",
  },
  gameplay: {
    title: "How to Play",
    description:
      "How Shattered Realms plays: spend AP to move, play cards and cast skills on changing hex terrain, level up mid-match, and eliminate, survive or capture.",
    lead: "Shattered Realms is a 2D turn-based strategy game on a hex grid. Each match, you take your characters onto a battlefield pieced together from fragments and use action points, cards and skills to claim ground and reshape the terrain until one side wins.",
    sections: [
      {
        id: "turns",
        heading: "Turns and action points",
        body: [
          "Each round, characters act in order of Agility, highest first. On your turn you spend action points (AP) to move, make basic attacks, play cards, cast skills, interact with terrain or build; when they run out or you end your turn, the next character goes.",
          "Once everyone has acted comes the event phase: wild monsters and summons act, terrain and ongoing effects resolve, and characters earn experience and Star Coins.",
        ],
      },
      {
        id: "hand",
        heading: "Your hand",
        body: [
          "You draw at the start of a match and again every turn. Your hand has a limit, and discarding during the action phase costs no AP.",
          "Opponents can see how many cards you hold, but not which ones.",
        ],
        terms: [
          { term: "Skill cards", text: "Cast your character's card skills." },
          { term: "Material cards", text: "Go into your stockpile, for crafting equipment and building." },
          { term: "Effect cards", text: "Heal, shield, buff or disrupt." },
          { term: "Special cards", text: "Teleport, draw, cut costs, reset cooldowns or cleanse." },
        ],
      },
      {
        id: "skills",
        heading: "Skills and in-match levels",
        body: [
          "Every character has passives that work from the start, core skills that unlock as they level up during the match, and card skills cast by playing the matching skill card. Skills need enough AP and EP, and have cooldowns.",
          "Levels start over every match: the event phase and defeating monsters and enemy characters all give experience.",
        ],
        terms: [
          { term: "Lv.1", text: "Passives and the first core skill." },
          { term: "Lv.3", text: "The second core skill." },
          { term: "Lv.5", text: "The ultimate." },
        ],
      },
      {
        id: "terrain",
        heading: "Hexes, terrain and elevation",
        body: [
          "The battlefield is a hex grid, and terrain shapes movement and combat: forests and rubble give cover, rivers and vines slow you down, mountains block the way and the view, ice makes you slide, and steam blocks line of sight.",
          "Skills rewrite terrain: fire scorches the ground and boils rivers into steam, and frost freezes the water. The field has elevation too — higher ground extends range and vision and lets cover block line of sight, and you cross height gaps by climbing, with stairs or with a grappling hook.",
          "Fog covers the field: you only see enemies within your vision.",
        ],
      },
      {
        id: "building",
        heading: "Building and portals",
        body: [
          "Materials let you build on the spot: bridges, stairs, walls, fortifications, watchtowers, barricades, spike barriers and campfires, each changing movement, vision or the fight. Campfires and spike barriers treat friend and foe alike, so place them with care.",
          "The void separates the fragments. Stand at its edge and you can build a portal across it, opening a way to the far side.",
        ],
      },
      {
        id: "economy",
        heading: "Monsters, Star Envoys and equipment",
        body: [
          "Wild monsters are neutral common, elite or boss units. They act in the event phase and never count toward victory; defeating them grants materials, experience and Star Coins, and boss rewards are shared by the team.",
          "Star Envoys are merchants who travel the battlefield, and everyone can see where they are. Stand next to one to buy materials, equipment and effect cards with Star Coins, barter, or sell equipment. Star Coins last only for the current match.",
        ],
      },
      {
        id: "victory",
        heading: "Victory conditions",
        body: [
          "Most matches are won by elimination, and custom rooms can pick any map and victory condition. Story battles always use elimination.",
          "In 3v3, a character whose HP hits zero is downed, and an adjacent teammate can bring them back; when the whole team is down, the team loses.",
        ],
        terms: [
          { term: "Eliminate", text: "Defeat all of the enemy's characters." },
          { term: "Survive", text: "Stay alive for a set number of turns." },
          { term: "Capture", text: "Seize and hold the strongpoints on the field; the first side to meet the condition wins." },
        ],
      },
      {
        id: "modes",
        heading: "Game modes",
        body: ["Once you pick a chapter from the Shattered Realms Tree, its lobby offers Story and Battle. Battle has three entries:"],
        terms: [
          { term: "Story", text: "Follow the chapter's story and face the AI in story battles." },
          { term: "Matchmaking", text: "Ranked battles against other players, matched by embers." },
          { term: "Trial", text: "Challenge the AI on Easy, Hard or Inferno, on your own or as a 3v3 team with friends." },
          { term: "Unranked", text: "Casual battles, Capture and custom rooms, none of which are ranked." },
        ],
      },
      {
        id: "formats",
        heading: "Battle formats",
        body: ["Matchmaking and Trial both offer these formats:"],
        terms: [
          { term: "1v1", text: "The classic duel, one character each." },
          { term: "1v1 Super", text: "Command three characters on a shared team turn and switch between them freely." },
          { term: "3v3", text: "Two teams of three, one character per player." },
        ],
      },
    ],
  },
  faq: {
    title: "FAQ",
    description:
      "Shattered Realms FAQ: where to play, accounts, starting characters, game modes, playing solo or with friends, and which chapters are out.",
    lead: "The questions we hear most about Shattered Realms.",
    entries: [
      {
        id: "what",
        q: "What kind of game is Shattered Realms?",
        a: [
          "Shattered Realms (碎界) is a 2D turn-based strategy game on a hex grid, developed by Hoshivel. Each turn you spend action points to move, play cards and cast character skills, claiming ground on terrain that skills can rewrite, until one side wins.",
        ],
        link: "gameplay",
      },
      {
        id: "where",
        q: "Where do I play? Do I need to download anything?",
        a: ["It runs in your browser, with nothing to download or install. Choose a connection region under Play on this site to jump in, or open the game in a new tab."],
        link: "play",
      },
      {
        id: "account",
        q: "Do I need an account?",
        a: ["You sign in with Hoshi ID, the account shared across Hoshivel's games. Your characters, progress and match history are saved to it."],
      },
      {
        id: "characters",
        q: "Which characters can I use at the start?",
        a: [
          "New accounts begin with the Basic tutorial; finishing it gives you Hakuto.",
          "3v3 has no minimum on how many characters you own: the server fills in characters you can pick for that match, for that match only.",
        ],
        link: "characters",
      },
      {
        id: "modes",
        q: "What game modes are there?",
        a: [
          "The lobby has Story and Battle. Battle has three entries: Matchmaking is ranked play against other players, matched by embers; Trial pits you against the AI on Easy, Hard or Inferno; Unranked covers casual battles, Capture and custom rooms.",
          "Formats are 1v1, 1v1 Super (three characters per player) and 3v3 (teams of three).",
        ],
        link: "gameplay",
      },
      {
        id: "solo",
        q: "Can I play on my own?",
        a: [
          "Yes. Story and Trial both let you face the AI alone. A match where you are the only player can be paused at any time; disconnecting or leaving only pauses it, and you can pick it up again from the lobby.",
        ],
      },
      {
        id: "friends",
        q: "Can I play with friends?",
        a: [
          "Yes. Share a party invite code to form a team of up to three for Matchmaking or Trial, or open a custom room and invite both teams and spectators with a match code.",
        ],
      },
      {
        id: "victory",
        q: "How do I win?",
        a: [
          "Most matches are won by elimination: defeat all of the enemy's characters. Some use Survive (last a set number of turns) or Capture (seize and hold strongpoints). Story battles always use elimination.",
        ],
        link: "gameplay",
      },
      {
        id: "languages",
        q: "Which languages are supported?",
        a: ["The game and this site are available in 正體中文, 简体中文, English and 日本語."],
      },
      {
        id: "chapters",
        q: "Which chapters are out?",
        a: ["Chapter 1, Snowstorm's Passage, is live. Chapter 2, Age of Starmarks, is coming soon."],
        link: "world",
      },
    ],
  },
};

const ja: PagesCopy = {
  labels: {
    titleSuffix: "｜砕界 Shattered Realms",
    breadcrumb: "パンくずリスト",
    home: "ホーム",
    explore: "もっと知る",
    profile: "詳しく見る",
    story: "物語",
    style: "戦い方",
    skills: "スキル",
    passives: "パッシブ",
    passivesNote: "最初から常に効果を発揮します。",
    core: "コアスキル",
    coreNote: "対戦中のレベルで解放され、スキルバーに常駐します。",
    ultimate: "アルティメット",
    cards: "カードスキル",
    cardsNote: "対応するスキルカードを引いて使うと発動します。",
    chapter: "登場する章",
    others: "ほかのキャラクター",
    more: "関連ページ：",
  },
  nav: {
    characters: "キャラクター",
    world: "世界観",
    gameplay: "遊び方",
    faq: "よくある質問",
  },
  characters: {
    title: "キャラクター紹介",
    description:
      "『砕界』の 4 人のキャラクター——白棠・暗影・赤焰・青蘿。それぞれが何を探し、どの旅路で登場し、戦いで何を得意とするのかを紹介します。",
  },
  character: {
    hakuto: {
      title: "白棠（雪境の棠）",
      description:
        "白棠は『砕界』〈風雪の通り道〉の主視点。氷原の奥に咲いた白棠花から生まれ、氷霜と凍結で敵を封じる後衛の術者。物語・戦い方・全スキルを紹介します。",
      titles: "雪境の棠、霜華の聖女、白銀の庭園の守り手",
      quote: "雪の骨、氷の姿。白きこと、汚れひとつなく。",
      role: "コントロール · 氷霜系の後衛",
      style: [
        "EP を土台に戦う後衛の術者。通常攻撃とスキルで敵に氷霜を重ね、重なりきると凍結に変わる。後方から相手の進路を封じられる。",
        "治療・浄化・氷晶シールドも備える。EP を多く使うほど回復とシールドは厚くなり、前線の味方を長く支えられる。",
      ],
      passives: [
        { name: "霜刺", text: "通常攻撃が当たるたびに氷霜を重ね、ときおり現在の EP に応じた確定ダメージを上乗せする。" },
        { name: "氷清玉潔", text: "HP が初めて危険域に落ちたとき、氷晶シールドを得る。シールドが砕かれると、周囲の敵に氷霜が炸裂する。" },
      ],
      core: [
        { level: 1, name: "風雪来たる", text: "範囲に魔法ダメージを与えて氷霜を付与し、しばらくのあいだ地面を雪氷に変える。" },
        { level: 3, name: "白棠花開", text: "範囲内の味方（自分を含む）の弱体を浄化して HP を回復する。消費した EP が多いほど回復量も増える。" },
        {
          level: 5,
          name: "霜華永眠",
          text: "広い大地を氷雪の庭園に変え、数ターンにわたってダメージと氷霜を重ねる。氷霜が重なりきった敵は凍結し、大きなダメージを受ける。",
        },
      ],
      cards: [
        { name: "氷晶守護", text: "自分か味方ひとりに氷晶シールドを付与する。味方を選ぶと、自分とその味方の両方にかかる。" },
        { name: "寒鋒氷錐", text: "指定した方向へ貫通する氷錐を放ち、線上の敵すべてに氷霜魔法ダメージと氷霜を与える。" },
        { name: "白蓮聖詠", text: "味方か自分を即座に治療する。残りの EP と消費した EP が多いほど回復量も増える。" },
      ],
    },
    shadow: {
      title: "暗影（影の君主）",
      description:
        "暗影は『砕界』で侵蝕と影を操り、戦場を刈り取るアサシン。〈星痕の紀元〉で旅人たちと交差する。物語・戦い方・全スキルを紹介します。",
      titles: "影の君主、永夜の歩む者、影の如く付き従う者",
      quote: "光の裏側は、すべて我が国。",
      role: "影の支配者 · 暗黒操作型アサシン",
      style: [
        "「侵蝕」と「影」を核とするアサシン。暗黒属性の攻撃で敵の侵蝕度を積み上げ、侵蝕が深まった敵の背後には影が貼りつく。自分の暗影領域の中で攻撃すると、侵蝕はさらに速く深まる。",
        "とどめは〈万影帰一〉。戦場の影をすべて刈り取り、一撃で仕留める。機動力と会心は高いが、防御と HP は低い——飛び込み、刈り取り、退く戦い方だ。",
      ],
      passives: [
        { name: "影の如く", text: "近くの対象へ向かって移動するとき、移動の AP 消費が大きく下がる。" },
        { name: "闇への墜落", text: "暗黒属性の攻撃で対象の侵蝕度が満ちると、即座に大きな侵蝕ダメージを与える。生き残っても HP が少なければ、そのまま処刑する。" },
      ],
      core: [
        { level: 1, name: "影刃", text: "指定した方向へ短刃を二本放つ。影を背負った対象にはより大きなダメージを与える。" },
        {
          level: 3,
          name: "永夜侵蝕",
          text: "自分を中心に、ターンごとに広がる暗影領域を展開する。触れた敵は侵蝕されて減速し、侵蝕が深まった敵の背後には影が生まれる。領域内の対象への攻撃は、さらに侵蝕を深める。",
        },
        { level: 5, name: "万影帰一", text: "自分の領域の中で使う。領域内の影をすべて刈り取って対象を中心へ引きずり込み、刈り取った影の数だけ強まる侵蝕の一撃を与える。" },
      ],
      cards: [
        { name: "帰影", text: "その場に影を残し、速度を大きく上げる。持続中にもう一度使うと、その位置へ即座に戻る。" },
        { name: "影蝕共鳴", text: "このターン、攻撃力とスキルダメージが大きく上がり、付与する侵蝕度が倍になる。" },
        { name: "影襲", text: "射程内の対象の背後へ影で回り込み、確定会心の背刺しを与えて恐怖させる。" },
      ],
    },
    sekien: {
      title: "赤焰（炎陽の子）",
      description:
        "赤焰は『砕界』で本物の炎核を操る先鋒。弓と剣の二形態で余燼をため、倒れても鳳凰となって燃え直る。物語・戦い方・全スキルを紹介します。",
      titles: "炎陽の子、赤天の烈日、永く燃ゆる焰",
      quote: "この火は術にあらず、我が血肉なり。",
      role: "アタッカー · 実体を持つ炎の先鋒",
      style: [
        "彼が操るのは魔力ではなく、正真正銘の炎核。戦いで燃やす資源は烈焰だ。弓形態では遠くから火を放ち、射るたびに余燼をため、撃たなかったターンにそれを烈焰へ戻す。烈焰が十分にあれば剣形態に切り替え、近距離で一気に攻める。",
        "火炎と焦土は彼の領分。その上に立てば回復が速まり、そこに囚われた敵はより大きな痛手を負う。死の淵では鳳凰と化し、烈焰を燃やし尽くして血肉を作り直す。",
      ],
      passives: [
        { name: "炎核共鳴", text: "炎は剣と弓、ふたつの形態をとる。剣形態では烈焰に応じて近接ダメージが上がり、弓形態では射るたびに余燼がたまる。" },
        { name: "浴火再燃", text: "攻撃しなかったターンは余燼の一部が烈焰に戻る（火炎や焦土の上では倍）。火で敵を倒すと、即座に烈焰が回復する。" },
        {
          name: "浴火重生",
          text: "烈焰が十分にあれば、致命傷を受けても踏みとどまり、鳳凰となって周囲を焦土に変える。燃え尽きた烈焰は障壁となり、烈焰が再び満ちると復活する。",
        },
      ],
      core: [
        { level: 1, name: "炎核変形", text: "弓形態と剣形態を切り替える。" },
        { level: 1, name: "烈焰貫星", text: "指定した方向へ巨大な火矢を放ち、線上の敵を減衰なしで貫いて焦土を残す。" },
        {
          level: 3,
          name: "炎剣降臨",
          text: "炎を長剣に凝らし、数ターンのあいだ剣形態に固定する。近接ダメージと会心が大きく上がり、剣気は二マス目まで届いて敵と地面を燃やす。",
        },
        {
          level: 5,
          name: "鳳焰天翔",
          text: "戦場を端まで貫く火の鳳凰を放つ。遠くへ飛ぶほど烈焰を多く使い、威力も増す。着弾点は焦土となり、最初に当たった敵をスタンさせるが、引き換えに自分の位置も露見する。",
        },
      ],
      cards: [
        { name: "天焚流星", text: "範囲に火の流星を呼び、火傷を与えて余燼をためる。" },
        { name: "炎雨", text: "火矢を一度に何本も放ち、射程内の敵に振り分ける。火炎や焦土の上にいる敵は、火傷が長引く。" },
        { name: "余燼回収", text: "一ターンためてから、すべての余燼を烈焰に変える。火炎や焦土の上ならその場で発動する。" },
      ],
    },
    aoiro: {
      title: "青蘿（星を喰らう荊）",
      description:
        "青蘿は『砕界』〈星痕の紀元〉を一区間ともに往く射手。神経毒を臨界まで押し上げ、蔓で退路を塞ぎ、連射で爆ぜさせる。物語・戦い方・全スキルを紹介します。",
      titles: "星を喰らう荊棘、苗床の捨て子、翠緑の災厄",
      quote: "わたしは、捧げられて捨てられた子。",
      role: "継続アタッカー · 猛毒と神経操作の射手",
      style: [
        "「神経毒」を核とする射手。毒矢で敵に神経毒を積み上げ、段階が上がるごとに重い弱体を重ね、臨界に達すると〈神経崩壊〉が炸裂する。",
        "蔓の地形を育てて退路を塞ぎ、連射モードに入れば手札まるごとを無償の通常攻撃として撃ち込める。",
      ],
      passives: [
        {
          name: "連射",
          text: "連射状態に入ると、手札が一時的に無償の青棘射撃になる。手札を一枚使うごとに通常攻撃一回となり、使わなかった手札はターン終了時に戻る。",
        },
        { name: "毒性感知", text: "敵の神経毒が段階を上げるたびに EP が回復する。毎ターン最初に敵が神経崩壊を起こすと、次のスキルの AP 消費が下がる。" },
      ],
      core: [
        { level: 1, name: "神経過負荷", text: "次の通常攻撃を強化する。必ず命中し、一度に何本も矢を放ち、付与する神経毒も倍になる。" },
        { level: 3, name: "神経遮断", text: "単体に毒ダメージを与え、神経毒を大量に付与する。毒が十分に深ければ、その場で継続ダメージが一回発生する。" },
        { level: 5, name: "噬星過負荷", text: "永続の代償と引き換えに爆発力を得る。ターン終了まで、即座に連射モードに入り、射程も大きく伸びる。" },
      ],
      cards: [
        { name: "寄生蔓延", text: "範囲に蔓の地形を育てる。範囲内の敵は毒ダメージを受け、その場に束縛される。" },
        { name: "毒棘穿刺", text: "指定した方向へ貫通する荊棘の弾を放つ。蔓のマスを通り抜けるごとに、付与する神経毒が増える。" },
        {
          name: "荊棘共鳴",
          text: "共鳴状態に入る。蔓の近くの対象を攻撃すると蔓が広がり、蔓に囚われた敵を攻撃すると、周囲で同じく蔓に囚われた敵にも共鳴する。",
        },
      ],
    },
  },
  world: {
    title: "世界観：砕裂と砕界樹",
    description:
      "『砕界』の世界。星痕が断たれ、大地は虚空に漂う欠片へと砕けた。この世界の中心に立つ者は誰もいない。砕裂の由来、砕界樹、そして各章を紹介します。",
    sections: [
      {
        id: "shattering",
        heading: "星痕が断たれたあと",
        body: [
          "砕裂の前、星痕は河も山も森も運命も空に刻み、大地はそれによって定まった形を保っていた。星痕が断たれると、大地はよりどころを失い、虚空に漂う欠片——砕界——へと砕けた。",
          "砕裂は誰かが下した罰ではない。崩れ落ちる前に、天地が自らを救おうとした最後の手だった。",
        ],
      },
      {
        id: "ensemble",
        heading: "中心のない世界",
        body: [
          "この世界の中心に立つ者は誰もいない。全員の問いに答える主人公もいない。誰もが自分の理由を抱いて進む——失った人を探す者もいれば、まだ光の残る欠片を追う者もいる。",
          "その旅路が漂う欠片のあいだで交わるとき、失われた大地と砕けた真実が、少しずつ姿を現す。",
        ],
      },
      {
        id: "battlefield",
        heading: "戦場は欠片そのもの",
        body: [
          "戦いの中では、砕裂は地形そのものだ。欠片と欠片のあいだには歩いて渡れない虚空が広がり、越えるには縁に立って自ら転送門を築くしかない。",
          "氷原・森・河・焦土は、どれもスキルで書き換わる。火炎は大地を焦がして河を蒸気に変え、氷霜は水面を凍らせて雪氷を敷く。",
        ],
      },
    ],
    chaptersHeading: "砕界樹と章",
    chaptersLead:
      "砕界樹は『砕界』の章の樹。砕界の欠片はそれぞれがひとつの旅路を宿し、旅路の交わるところに新しい章が芽吹く。ゲームでは砕界樹から章を選ぶと、その章のロビーに入り、物語と対戦が始まる。",
  },
  gameplay: {
    title: "遊び方",
    description:
      "『砕界』の遊び方。行動力で移動・カード・スキルを使い分け、変化するヘックスの地形で位置を奪い合う。対戦中にレベルを上げ、殲滅・生存・占領で勝利を目指す。",
    lead: "『砕界』は 2D ヘックス制のターンベース・ストラテジー。対戦ごとにキャラクターを連れて欠片でできた戦場に降り立ち、行動力・手札・スキルで位置を奪い、地形を書き換えながら、どちらかが勝つまで戦う。",
    sections: [
      {
        id: "turns",
        heading: "ターンと行動力",
        body: [
          "各ラウンドは、キャラクターの敏捷が高い順に行動する。自分の番では行動力（AP）を使って移動・通常攻撃・カードの使用・スキル・地形への働きかけ・建築を行い、使い切るか自分で終了すると次のキャラクターへ移る。",
          "全員が行動を終えるとイベントフェーズに入る。野良モンスターと召喚物が動き、地形と継続効果が処理され、キャラクターは経験値と星幣を得る。",
        ],
      },
      {
        id: "hand",
        heading: "手札",
        body: [
          "対戦開始時に手札を引き、以降は毎ターン自動で補充される。手札には上限があり、行動フェーズ中の破棄は AP を消費しない。",
          "相手から見えるのは手札の枚数だけで、中身は見えない。",
        ],
        terms: [
          { term: "スキルカード", text: "キャラクターのカードスキルを放つ。" },
          { term: "素材カード", text: "素材庫に入り、装備の合成や建築に使う。" },
          { term: "効果カード", text: "回復・シールド・強化・妨害。" },
          { term: "特殊カード", text: "転移・ドロー・コスト減・クールダウン解除・浄化。" },
        ],
      },
      {
        id: "skills",
        heading: "スキルと対戦中のレベル",
        body: [
          "どのキャラクターも、最初から効果を発揮するパッシブ、対戦中のレベルで解放されるコアスキル、対応するスキルカードを使って放つカードスキルを持つ。スキルには十分な AP と EP が必要で、クールダウンもある。",
          "レベルは対戦ごとに一から積み上げる。イベントフェーズや、野良モンスター・敵キャラクターの撃破で経験値が入る。",
        ],
        terms: [
          { term: "Lv.1", text: "パッシブと 1 つ目のコアスキル。" },
          { term: "Lv.3", text: "2 つ目のコアスキル。" },
          { term: "Lv.5", text: "アルティメット。" },
        ],
      },
      {
        id: "terrain",
        heading: "ヘックス・地形・高低差",
        body: [
          "戦場はヘックスで構成され、地形が移動と戦闘を左右する。森と瓦礫は遮蔽になり、河と蔓は足を鈍らせ、山は道と視線をふさぎ、氷面では滑り、蒸気は視線を遮る。",
          "地形はスキルで書き換わる。火炎は大地を焦土にして河を蒸気に変え、氷霜は水面を凍らせる。戦場には高低差もあり、高所は射程と視界を伸ばし、遮蔽物で視線を遮れる。高低差を越えるには、よじ登るか、階段や鉤縄を使う。",
          "戦場は霧に包まれ、視界内の敵しか見えない。",
        ],
      },
      {
        id: "building",
        heading: "建築と転送門",
        body: [
          "素材があれば、その場で建築できる。橋・階段・壁・防御陣地・物見櫓・バリケード・拒馬・焚き火は、それぞれ通行や視界、攻防を変える。焚き火と拒馬は敵味方を区別しないので、置く場所はよく考えよう。",
          "欠片と欠片のあいだには虚空がある。その縁に立てば、虚空を越える転送門を築き、対岸への道を開ける。",
        ],
      },
      {
        id: "economy",
        heading: "野良モンスター・星使・装備",
        body: [
          "野良モンスターは中立ユニットで、通常・エリート・ボスの 3 段階がある。イベントフェーズに行動し、勝敗には数えない。倒すと素材・経験値・星幣が手に入り、ボスの報酬はチームで分け合う。",
          "星使は戦場を旅する商人で、居場所は全員に見えている。隣接すれば、星幣で素材・装備・効果カードを買えるほか、物々交換や装備の売却もできる。星幣はその対戦中しか使えない。",
        ],
      },
      {
        id: "victory",
        heading: "勝利条件",
        body: [
          "多くの対戦は殲滅で決着する。カスタムルームではマップと勝利条件を自由に選べる。物語の戦闘はすべて殲滅で行われる。",
          "3v3 では、HP が尽きたキャラクターは要救護となって倒れ、隣接する味方が助け起こせる。チーム全員が倒れると敗北となる。",
        ],
        terms: [
          { term: "殲滅", text: "相手のキャラクターをすべて倒す。" },
          { term: "生存", text: "指定ターン数を生き延びる。" },
          { term: "占領", text: "戦場の要衝を奪って保持し、条件を先に満たしたほうが勝つ。" },
        ],
      },
      {
        id: "modes",
        heading: "ゲームモード",
        body: ["砕界樹から章を選ぶと、ロビーには物語と対戦がある。対戦の入り口は 3 つ："],
        terms: [
          { term: "物語", text: "章の物語を進め、物語の戦闘で AI と戦う。" },
          { term: "マッチング", text: "星燼で対戦相手が選ばれる、プレイヤー同士のランクマッチ。" },
          { term: "試練", text: "かんたん・むずかしい・煉獄の 3 段階で AI に挑む。ひとりでも、仲間と 3v3 チームを組んでも遊べる。" },
          { term: "エンタメ", text: "カジュアル・占領戦・カスタムルーム。どれも星燼の対象外。" },
        ],
      },
      {
        id: "formats",
        heading: "対戦形式",
        body: ["マッチングと試練では、次の形式を選べる："],
        terms: [
          { term: "1v1", text: "クラシックな一騎討ち。各自 1 キャラクターを操作する。" },
          { term: "1v1 Super", text: "1 人が 3 キャラクターを操作。チームターンを共有し、いつでも切り替えられる。" },
          { term: "3v3", text: "3 人 1 チーム。1 人が 1 キャラクターを操作する。" },
        ],
      },
    ],
  },
  faq: {
    title: "よくある質問",
    description:
      "『砕界』のよくある質問。どこで遊べるか、アカウントは必要か、最初に使えるキャラクター、ゲームモード、ひとりや友達と遊べるか、公開中の章について。",
    lead: "『砕界』について、よく寄せられる質問をまとめました。",
    entries: [
      {
        id: "what",
        q: "『砕界』はどんなゲーム？",
        a: [
          "『砕界』（Shattered Realms）は Hoshivel が開発する 2D ヘックス制のターンベース・ストラテジーです。毎ターン行動力を使って移動し、カードを使い、キャラクターのスキルを放ち、スキルで書き換わる地形の上で位置を奪い合って、どちらかが勝つまで戦います。",
        ],
        link: "gameplay",
      },
      {
        id: "where",
        q: "どこで遊べますか？ダウンロードは必要？",
        a: ["ブラウザでそのまま遊べ、ダウンロードやインストールは不要です。このサイトの「ゲームを始める」で接続地域を選べば入れます。新しいタブで開くこともできます。"],
        link: "play",
      },
      {
        id: "account",
        q: "アカウントは必要ですか？",
        a: ["Hoshi ID でログインします。Hoshivel の各作品で共通のアカウントです。キャラクター・進行状況・戦績はアカウントに保存されます。"],
      },
      {
        id: "characters",
        q: "最初に使えるキャラクターは？",
        a: [
          "新しいアカウントはまず基本チュートリアルから始まり、クリアすると白棠を獲得できます。",
          "3v3 では所持キャラクター数の条件はありません。その対戦で選べるキャラクターをサーバーが補い、その対戦に限って使えます。",
        ],
        link: "characters",
      },
      {
        id: "modes",
        q: "どんなゲームモードがありますか？",
        a: [
          "ロビーには物語と対戦があります。対戦の入り口は 3 つ。マッチングは星燼で相手が選ばれるランクマッチ、試練はかんたん・むずかしい・煉獄で AI に挑むモード、エンタメはカジュアル・占領戦・カスタムルームで、星燼の対象外です。",
          "対戦形式は 1v1、1 人が 3 キャラクターを操作する 1v1 Super、3 人 1 チームの 3v3 です。",
        ],
        link: "gameplay",
      },
      {
        id: "solo",
        q: "ひとりでも遊べますか？",
        a: [
          "遊べます。物語と試練は、ひとりで AI と戦えます。プレイヤーが自分ひとりの対戦はいつでも一時停止でき、切断したり離れたりしても一時停止になるだけなので、あとでロビーから続きを遊べます。",
        ],
      },
      {
        id: "friends",
        q: "友達と一緒に遊べますか？",
        a: [
          "遊べます。パーティ招待コードで最大 3 人のチームを組み、マッチングや試練に挑めます。カスタムルームを開けば、対戦コードで両チームのプレイヤーと観戦者を招待できます。",
        ],
      },
      {
        id: "victory",
        q: "どうすれば勝てますか？",
        a: [
          "多くの対戦は殲滅、つまり相手のキャラクターをすべて倒すと勝ちです。指定ターン数を生き延びる生存や、要衝を奪って保持する占領もあります。物語の戦闘はすべて殲滅です。",
        ],
        link: "gameplay",
      },
      {
        id: "languages",
        q: "対応している言語は？",
        a: ["ゲームとこのサイトは、正體中文・简体中文・English・日本語に対応しています。"],
      },
      {
        id: "chapters",
        q: "いまどの章まで遊べますか？",
        a: ["第一章〈風雪の通り道〉が公開中で、第二章〈星痕の紀元〉は近日公開予定です。"],
        link: "world",
      },
    ],
  },
};

export const pages: Record<Locale, PagesCopy> = {
  "zh-Hant": zhHant,
  "zh-CN": zhCN,
  en,
  ja,
};

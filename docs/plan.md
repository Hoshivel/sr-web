# sr-web 旗艦官網 — 實作計畫（倉庫內權威副本）

> 本檔為已核准實作計畫的**倉庫內權威副本**（原稿在代理環境的 plan 目錄，屬臨時性、不隨倉庫保存）。
> 任何代理冷接手時，以本檔 ＋ [workspace](https://github.com/Hoshivel/workspace)
> `sessions/` 裡對應的會話日誌為準（若有）。

## Context（為什麼做這個）

`sr-web` 是《碎界 / Shattered Realms》的官方門面網站，部署目標 `sr.oha.li`。原本 repo 幾乎是空的（只有一個 `README.md`）。

> **更新（2026-08-02）**：官網正式上線於 **`sr.hoshivel.com`**（純靜態部署），遊戲節點為
> **`play.sr.hoshivel.com`**（目前單節點）；分流 API 因此改掛獨立網域（如
> `api.hoshivel.com` / `svc.hoshivel.com`）由前端跨源呼叫。本檔以下段落保留原始規劃時的
> `sr.oha.li` 敘述作為歷史紀錄，實際網域以本註記與 `README.md` 為準。
>
> **更新（2026-08-03）**：Play 已遷移至 `hoshi-svc` 通用路由 API：
> `GET https://svc.hoshivel.com/v1/services/sr-game/route?endpoint=web`。舊的靜態
> `/api/play.json`、內建假健康節點、`/play/session/` mock 與原本的 `sr-web/backend`
> 均已在 hoshi-svc 通過驗證後移除；本倉庫現在是純靜態官網。

需求核心：官網要有**旗艦級動效**，而不是普通的 HTML+JS —— 「配得上門面」。

關鍵事實（決定設計方向）：

> **遊戲 repo 裡沒有任何二進位美術資產** —— 沒有 logo 圖檔、沒有截圖、沒有角色立繪、沒有字型、沒有音訊。整個「品牌」是由 **CSS 漸層 + Unicode 字符（`◈` 主標記）+ 程序化 canvas 動態** 組成的。

所以「優秀的動效」不是錦上添花 —— **程序化動態就是視覺識別本身**，也是缺少美術素材時唯一能撐起「門面感」的東西。

**已確認決策**：
- 技術棧：**Astro + React islands**（strict TS）
- 動效強度：**旗艦級 WebGL 捲動電影**
- 素材走向：**程序化即美術，預留換裝槽**（日後有正式立繪/截圖可直接換上）
- 範圍：**前端動效站 + hoshi-svc Play 流程**（原規劃的假流程已於 2026-08-03 汰換）

---

## 技術棧與工具

| 用途 | 選型 | 說明 |
|------|------|------|
| 框架 | **Astro** + `@astrojs/react` | 靜態優先、Lighthouse/SEO 最佳、把效能預算留給動效；互動區塊用 React island |
| 語言 | TypeScript `strict` | `npm run build`（`astro check && astro build`）為驗收門檻 |
| 捲動電影 | **GSAP + ScrollTrigger** | pinned / scrub / reveal 的骨幹 |
| 平滑捲動 | **Lenis** | 慣性捲動，旗艦網站的「順滑感」來源 |
| 程序化 WebGL | **Pixi.js** | 2D WebGL，**與遊戲同款渲染器**，對應「乾淨向量/發光」美學 |
| 原生增強 | CSS `@property` 漸層、scroll-driven animations、View Transitions | 漸進增強、效能友善 |
| 內容 | Astro content collections / MDX | 角色、章節等結構化內容 |
| i18n | zh-Hant 主，結構預留 zh-CN / en | 文案來源：遊戲 `frontend/src/i18n/translations.ts` |

全站以 `prefers-reduced-motion` 為基線，每個效果都有靜態/降級版本。

---

## 設計系統 / 品牌 tokens

色盤蒸餾自遊戲 `frontend/src/styles.css`（原檔 1,380 個 inline hex、0 個 CSS 變數）。已落地於 `src/styles/tokens.css`：

- 底：`#06070b` / `#0b0d12`；面板：`#161a22` / `#12151d`；邊框：`#2a2f3a`
- 文字：`#e6e9ef`；次要：`#8b93a7`
- **主強調 periwinkle `#8fa9ff`**；藍 `#6ab0ff` / `#5b8cff`；**violet `#7a5bff` / `#b89bff`**；金 `#ffd479`
- 章節強調：snowpass `#7fd0ff`、starseal `#b48dff`（用 `[data-chapter]` 覆寫 `--sr-chapter`）
- 字標漸層：`linear-gradient(120deg, #cdd7ff, #8fa9ff 45%, #b89bff)`
- 字符系統：`◈`（主標記）、`❄` snowpass、`✶` starseal、`◆` Shards。由 `◈` 產生 favicon（已做）+ OG 圖（Phase 1）
- 字型：`system-ui, "Noto Sans TC"`；字標是否加 display web font 於 Phase 1 定

---

## 網站結構（單頁長捲動 `/` + 少量子路由）

| # | 區塊 | 內容 & 動效 |
|---|------|------|
| 1 | **Hero** | Pixi 程序化虛空（漂浮碎片/星痕）、`◈` 脈動、漸層字標「碎界 / Shattered Realms」、標語 **破碎星空之下，啟程未竟之旅**、CTA `開始遊戲`(Play)+`了解世界`；疊 Starfield+游標星座 |
| 2 | **碎裂 The Shattering** | 世界觀捲動電影：**碎裂不是天罰，是天地最後一次自救**；招牌「褪色（Fading）」溶解效果；碎片漂散 |
| 3 | **玩法 Gameplay** | 四合一（**手牌 / 走棋 / MOBA 技能與對抗 / SRPG**——2026-08-02 依實際類型定位改寫，原為「棋類策略/RPG 成長/MOBA 技能/開放探索」）；scroll-reveal；招牌**可反應地形**（火→焦土、河+火→蒸汽、野火蔓延、冰融）、高低差/視線、卡牌手層、戰爭迷霧 |
| 4 | **主題曲 Chapters / World Tree** | snowpass `❄`（已上線）/ starseal `✶`（即將）；互動式「碎界樹」（複用 `Entry.tsx` 物理）或氛圍隨捲動 morph（冰藍→星紫）|
| 5 | **英雄 Characters** | 白棠 / 暗影 / 赤焰 / 青蘿 卡片；元素光暈、題詞、玩法幻想；**程序化佔位 + 換裝槽** |
| 6 | **Media** | 程序化截圖佔位；預留正式截圖廊換裝槽 |
| 7 | **Play 啟動器（island）** | hoshi-svc RouteDecision → 建議／候選節點 → 使用者進入後才 iframe 嵌入原始 web endpoint |
| 8 | **Footer** | 導覽、語言切換、致謝 |

---

## 關鍵複用（可直接移植的遊戲程式，位於 ShatteredRealms/frontend/src/）

- **`ui/Starfield.tsx`** — canvas 星場 + 游標星座（reduced-motion 已支援；stars `rgba(206,218,255)`、links `rgba(122,162,255)`、DPR≤2）。**幾乎可原樣移植成 React island** → Phase 2。
- **`ui/meta/Entry.tsx`** — 「碎界樹」spring-damper 物理（節點可抓取拋擲、枝條擺盪）→ Phase 5。
- **`ui/TunnelTransition.tsx`** + `styles.css` `.scene-transition`（≈line 4388）— 超空間 warp 轉場。
- 文案：`i18n/translations.ts`（`start.tagline`、`entry.hubTitle`、`theme.*.tagline`，三語齊全）。
- 待解：英文章節名各檔不一致 → 以 `theme.json` 為準（`Snowbound Passage` / `Age of Starmarks`）。

---

## Play 流程 —— hoshi-svc 通用路由

- Play island 呼叫
  `GET ${PUBLIC_HOSHI_SVC_BASE}/v1/services/sr-game/route?endpoint=web`。
- 瀏覽器建立不含個資的穩定 routing key，保存在 localStorage，且只經
  `X-Hoshi-Routing-Key` 標頭送出；不得進 query string。
- `src/lib/play.ts` 嚴格驗證完整 RouteDecision，將 `candidates[].endpoints.web` 轉為
  Play UI 節點，並以 `recommended.id` 預選。
- TTL 內可重用最後成功決策；線上查詢失敗時，只能沿用到
  `expiresAt + staleIfError`。逾時、503、畸形回應且無合規 stale 決策時顯示不可用，
  不回退到靜態或內建節點。
- 選節點不會預載遊戲；按下「進入戰場」後才建立 iframe。iframe 與新分頁均使用
  hoshi-svc 回傳的原始 web endpoint，不附加前端 query。
- hoshi-svc CORS 允許 `https://sr.hoshivel.com`、`GET` 與
  `X-Hoshi-Routing-Key`；遊戲主機另需允許本站 WebSocket origin 與 iframe 嵌入。

---

## 效能與無障礙

- 靜態優先 HTML；island 以 `client:visible` 延遲注水。
- code-split Pixi & GSAP；粒子數依視窗調整；DPR≤2。
- `prefers-reduced-motion`：每效果皆有靜態/緩和 fallback。
- 行動裝置：降低粒子預算、關閉最重 WebGL、保持捲動順滑。
- SEO/OG：meta、sitemap、OG 圖、`lang="zh-Hant"`；避免 island 晚注水造成 CLS。

---

## Repo 慣例（沿用 ShatteredRealms 家族）

- 文件/註解**正體中文**；狀態關鍵字 `Editing`/`editing`/`idle` 保持原樣。
- **會話日誌**：正本在 [workspace](https://github.com/Hoshivel/workspace) 的
  `sessions/`（目標 + 待辦 + `Editing`），每階段更新。**本倉庫不維護 `sessions/`。**
- Runtime = **cloud** → 每完成一小階段 commit + push 到 `claude/sr-web-animation-planning-u1vujx`。
- 若日後加 CI，以 branch 過濾只在 `main` 觸發。

---

## 分階段里程碑

- **Phase 0 — 骨架** ✅：Astro5 + React + strict TS；GSAP/Lenis/Pixi；base layout、tokens、favicon(`◈`)、session log；`npm run build` 綠燈、佔位頁 0 JS。
- **Phase 1 — 品牌基元** ✅：tokens 完善（間距/字級/陰影/backdrop/glyph 尺度）、SVG 標記 `Mark` + `Wordmark` 鎖定組、字符系統（◈❄✶◆）、程序化 OG 圖（og.svg→og.png）、動效工具（`src/lib/motion.ts`：reveal/Lenis/GSAP 動態載入 + `useReducedMotion` hook）、Header/Footer、i18n 三語字典 + 連結式語言切換 + `/`、`/zh-cn`、`/en` 路由（含 hreflang）。`npm run build` 綠。
- **Phase 2 — Hero** ✅（**待視覺簽核**）：分層 Hero＝Pixi 程序化虛空（`VoidField`：漂浮碎片＋星雲＋游標視差，動態載入、reduced-motion/窄視窗降級）＋移植 Starfield 星座（`client:visible` island）＋◈ 脈動＋漸層字標＋標語＋Play/Learn 磁吸 CTA＋捲動指示＋中央可讀性 veil。`npm run build` 綠。**依計畫在此暫停，交付 Hero 預覽供視覺定調簽核再進 Phase 3。**
- **Phase 3 — 捲動電影框架 + 碎裂區** ✅：`src/lib/scrollCinema.ts` 單例 boot（Lenis 平滑捲動 + GSAP/ScrollTrigger 同步 + 錨點平滑捲動）；碎裂區 `Shattering.astro`（#world）pin+scrub 讓種子化殘片由凝聚向虛空四散＋淡出＋去飽和（招牌「褪色」溶解），招牌句「碎裂不是天罰，是天地最後一次自救」。reduced-motion 全程降級為靜態。`npm run build` 綠（Lenis/GSAP 動態 chunk）。
- **Phase 4 — 玩法 + 英雄** ✅（**待視覺簽核**）：玩法四柱 `Gameplay.astro`（#gameplay）＝棋類策略/RPG 成長/MOBA 技能/開放探索 scroll-reveal grid，各帶程序化 inline-SVG 母題（蜂巢六邊形/成長條/技能環/地景）＋元素色頂線＋hover 浮起；英雄卡 `Characters.astro`（#characters）＝白棠/暗影/赤焰/青蘿，元素徽記（❄☾❂❦）＋種子化星座佔位＝**換裝槽**（日後疊 `.hero-card__art` 立繪）＋元素 tag/漸層名/題詞/玩法幻想＋桌機指標微傾。三語文案（`gameplay.*`/`char.*`）蒸餾自遊戲角色 lore 與玩法規則。reduced-motion/觸控全降級、無新增首屏重 JS。`npm run build` 綠。
- **Phase 5 — 主題曲 / 碎界樹** ✅（**待視覺簽核**）：`WorldTree.tsx`（React island，改編自遊戲 `ui/meta/Entry.tsx`）複用 spring-damper 物理（拖曳拋擲＋彎曲擺動枝條＋盤根 tendril＋formation 耦合），改進為官網版——去後端/store 依賴自足吃 i18n、**seed 決定性佈局**（SSR hydration 安全）、**響應式**（viewBox 設計座標＋節點 %／拖曳以 stage 實寬換算）、**章節氛圍 morph**（hover/選取節點→`--wt-accent` 冰藍↔星紫過場）、reduced-motion 靜態、觸控可拖。3 節點碎界◈（起源）→風雪過境❄（第一章/已上線）→星痕紀元✶（第二章/即將）＋章節詳情卡。`Chapters.astro`（#chapters）殼＋`WorldTree.css`（wt- 前綴）。三語文案源自 `theme.json`＋遊戲 `theme.*.story`。`npm run build` 綠、SSR 靜態樹無 FOUC、島 8.2KB gz client:visible。
- **Phase 6 — Play 啟動器 + media 換裝槽** ✅（**待視覺簽核**）：原始 mock 流程已於 2026-08-03 遷移為 hoshi-svc 通用 RouteDecision；具嚴格驗證、匿名黏著 key、TTL/stale cache、不可用與重試 UI。選節點不預載，按 Enter 才 iframe 嵌入原始 web endpoint；另開新頁同樣不改 URL。靜態 `/api/play.json`、`/play/session/` 與只供 mock 使用的 `HexField` 已移除。`Play.astro` 保留三格程序化截圖換裝槽。
- **Phase 7 — 打磨** ✅（**待視覺簽核**）：SEO——手捲 `sitemap.xml`（三語系＋hreflang）＋`robots.txt`＋完整社群 meta。a11y／行動——Header 可存取行動選單、Play 節點 `role=group`＋`aria-pressed`、不可用狀態與重試。效能——Hero `VoidField` 於分頁隱藏或離開視窗時暫停 Pixi ticker；Play iframe 只在使用者明確進入後載入。品牌化 `404.astro`。

---

## 驗證方式（端到端）

1. 每階段 `npm run build`（Astro / strict TS）綠燈。
2. `npm run dev` 實跑：Hero 渲染、捲動電影 scrub、Play 通用路由成功／失敗／stale／重試與 iframe 進入、章節氛圍 morph、角色 reveal。
3. 視覺回歸：預裝 Chromium/Playwright 截圖比對（helper 於代理 scratchpad `shot.mjs`）。
4. 無障礙：DevTools 開 `prefers-reduced-motion` → 每效果有靜態 fallback。
5. Lighthouse：桌機 perf ≥ 90、SEO/a11y 達標；island 晚注水無 CLS。
6. 行動裝置：手機視窗 + 觸控，捲動順滑、WebGL 優雅降級。
7. 最終視覺驗收由使用者手動確認。

---

## 風險 / 待決

- ~~字標是否加 display web font~~ —— **已定（Phase 1）**：**不加**。維持 `system-ui` + 漸層字標，避免二進位資產與字型載入成本、保留效能預算給動效；字標的識別力來自漸層 + ◈ 標記。日後若要 display font 再於局部區塊評估。
- ~~英文章節名~~ —— **已定**：以 `theme.json` 統一為 `Snowbound Passage` / `Age of Starmarks`，已寫入 `src/i18n/ui.ts`。
- ~~Play 採 **iframe** vs **redirect**~~ —— **已定（Phase 6）：iframe 嵌入**；只在使用者按下進入後載入 hoshi-svc 提供的原始 web endpoint，並將 `https://sr.hoshivel.com` 加入遊戲後端允許來源。
- **Phase 2 前置門檻**：Hero 為視覺定調關鍵；依計畫應**先交付 Hero 預覽供簽核**再往下（Phase 3+）。

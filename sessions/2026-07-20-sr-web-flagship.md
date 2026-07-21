# Session：sr-web 旗艦官網（Astro + 程序化動效）

- 建立：2026-07-20
- 狀態：進行中
- 進度摘要：**Phase 1 品牌基元完成並 push**（tokens／SVG 標記＋字標／字符系統／OG 圖／動效工具／Header・Footer／三語 i18n＋語言切換＋locale 路由；`npm run build` 綠）。下一步 Phase 2 Hero（計畫要求先交付 Hero 預覽供視覺簽核）。
- 相關：branch `claude/sr-web-plan-continue-od8l0n`（前身 `claude/sr-web-animation-planning-u1vujx` 已併入 main）
- **權威計畫（倉庫內、可冷接手）**：`docs/plan.md`（外部 plan 目錄副本屬臨時性，勿依賴）
- Runtime: cloud（每階段 commit + push 到遠端）

## 如何冷接手（Cold Resume）
1. 讀本檔（目標 / 進度 / 待辦 / `Editing`）與 `docs/plan.md`（完整計畫）。
2. `Editing = idle` → 工作區一致、無半編輯檔；可直接從「待辦」最上面一項開始。
3. `npm install` → `npm run build` 應綠燈；`npm run dev` 起本地開發。
4. 下一步：**Phase 2 Hero**（Pixi 程序化虛空 + Starfield 移植 + CTA；見 `docs/plan.md`）。依計畫應**先交付 Hero 預覽供視覺簽核**再進 Phase 3+。

## 目標 / 需求
（實時更新；新增需求往下追加並標註時間）
1. 建置《碎界 / Shattered Realms》官方門面網站 sr-web，部署目標 `sr.oha.li`。
2. **旗艦級動效**，不是普通 HTML+JS —— 配得上門面。
3. 已定案決策：
   - 技術棧 **Astro + React islands**（strict TS）
   - 動效 **旗艦級 WebGL 捲動電影**（Pixi + GSAP/ScrollTrigger + Lenis）
   - 素材 **程序化即美術，預留換裝槽**（日後正式立繪/截圖可換上）
   - 範圍 **前端動效站 + 假 Play 流程**（真後端本次不做，但定義 API 契約）
4. 關鍵事實：遊戲 repo **無任何二進位美術資產** → 程序化動態即視覺識別。
5. 沿用 ShatteredRealms 家族慣例：正體中文文件、sessions/ 日誌、雲端每階段推送。
6. （2026-07-20）驗證只用 `npm run build`，暫不啟動 preview 伺服器/截圖（使用者要求）。

## 進度
### 待辦
- [ ] **Phase 2 Hero**（Pixi 程序化虛空 + Starfield 移植 + CTA）→ **先交付預覽供視覺簽核**
- [ ] Phase 3 捲動電影框架 + 碎裂區（褪色溶解 set-piece）
- [ ] Phase 4 玩法四合一 + 英雄卡
- [ ] Phase 5 主題曲 / World Tree + 章節氛圍 morph
- [ ] Phase 6 Play 啟動器（mock）+ 即時 Pixi 展示 + media 換裝槽
- [ ] Phase 7 打磨（效能 / a11y / 行動 / SEO / 部署）

### 進行中
- [ ]（無 —— Phase 1 全數完成並 push，停在 Phase 1/2 里程碑邊界）

### Phase 2 冷接手備忘（下次起手用）
- Starfield 可移植源：`ShatteredRealms/frontend/src/ui/Starfield.tsx`（canvas 星場＋游標星座，已支援 reduced-motion；stars `rgba(206,218,255)`、links `rgba(122,162,255)`、DPR≤2）→ 做成 React island，`client:visible` 注水。
- 已就緒接口：`src/lib/motion.ts` 的 `useReducedMotion`（島內判降級）、`initSmoothScroll`/`registerScrollTrigger`（Phase 3 捲動電影）；`.sr-btn --primary/--ghost` 供 Hero CTA；`Home.astro` 即 Hero 容器（用 locale prop）。
- Hero 錨點/CTA 已備：header/footer 導覽指向 `#world`/`#gameplay`/`#chapters`/`#characters`/`#play`——Phase 2+ 區塊接上這些 id。

### 已完成（精簡摘要）
- [x] Phase 1d 程序化 OG 圖：`public/og.svg`（1200×630 native SVG，seeded 星場＋雙徑向輝光＋◈ 標記發光＋漸層字標 碎界／SHATTERED REALMS／標語／sr.oha.li，自成一體可縮放）＝可編輯源；以預裝 headless Chromium 經零邊距 HTML 包裹頁光柵化為 `public/og.png`（RGB、無底部裁切）。CJK 由容器內 WenQuanYi Zen Hei 渲染，實測無 tofu。Layout meta（1b 已接）引用 `/og.png`＋twitter:image；三路由 build 綠、assets 落 dist。（生成器 `make-og.mjs` 留暫存區，非倉庫產物。）
- [x] Phase 1c Header/Footer/語言切換/locale 路由：global.css 加 `.sr-btn`/`--primary`/`--ghost` 按鈕基元。`LanguageSwitcher.astro`（純 SSR 連結、繁/简/EN、aria-current、連同頁各語言 URL）。`Header.astro`（sticky 毛玻璃、brand 連首頁、section 錨點導覽含 hover 底線、Play CTA、skip link；窄視窗收起 nav）。`Footer.astro`（Wordmark full、nav、語言、致謝、年份）。Layout 接入 Header/Footer 並傳 logicalPath。新增 `/zh-cn`、`/en` 平行路由。build 綠、三路由各自 lang/文案/切換器 active 皆正確。註：#world/#play 等錨點目標待 Phase 2–6 區塊長出。
- [x] Phase 1b 品牌元件 + i18n 基礎：`src/i18n/ui.ts`（三語字典，鍵型別強制完整；含 LOCALES/LOCALE_PATH/HTML_LANG/OG_LOCALE/LABEL）＋`utils.ts`（`getLocaleFromPath`/`useTranslations`/`localizedPath`/`stripLocalePrefix`）。SVG 品牌 `Mark.astro`（◈ 向量、獨立漸層 id、可選發光、a11y）＋`Wordmark.astro`（mark/compact/full 鎖定組）。首屏抽成 `Home.astro`（吃 locale、改用 Mark＋字典文案、hero 元素掛 data-reveal）。`Layout.astro` 升級為 locale-aware：`<html lang>`／og:locale／hreflang 交替連結（含 x-default）／og:image 預接 `/og.png`。踩雷：ui.ts 頂部註解含 glob `*​/` 會提前關閉 `/* */` → 改 `<id>`。build 綠。
- [x] Phase 1a 品牌基元（tokens/動效工具/字符系統）：`tokens.css` 加間距/字級/陰影/backdrop/glyph 尺度與 spring ease、reveal token；`global.css` 加 `.sr-section`/`.sr-eyebrow`/字符系統偽元素類/`[data-reveal]` 進場基線（`html.sr-js` 守衛→無 JS 不藏內容；reduced-motion 強制呈現）。新增 `src/lib/motion.ts`（`prefersReducedMotion`/`initScrollReveal` stagger/`initSmoothScroll` Lenis 動態載入/`registerScrollTrigger` GSAP 動態載入）＋`src/lib/useReducedMotion.ts`（React hook，初值對齊 SSR 免注水不一致）。Layout 加 `sr-js` inline flag ＋ reveal boot。`npm run build` 綠；reveal 腳本 tree-shake 後 ~1KB 內聯、Lenis/GSAP 未進首屏。
- [x] Phase 0 骨架：Astro5 + @astrojs/react + strict TS；裝 GSAP/Lenis/Pixi.js（422 pkgs）。
- [x] 設計 tokens：`src/styles/tokens.css`（色盤蒸餾自遊戲 styles.css，語意變數化）+ `global.css`（reset、utilities、reduced-motion 基線）。
- [x] `src/layouts/Layout.astro`（SEO/OG meta、lang=zh-Hant）、`src/pages/index.astro`（佔位字標 Hero）、`public/favicon.svg`（◈ 標記）。
- [x] `npm run build`（astro check && astro build）綠燈：0 errors、靜態輸出、佔位頁 0 JS（islands 架構驗證）。

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。
> 狀態 = editing 代表可能有半編輯檔；idle 代表工作區一致。

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—（Phase 1c 已落地並 build 綠；下一步 1d OG 圖）

## 筆記 / 決策
- 色盤語意變數見 `tokens.css`；章節氛圍用 `[data-chapter="snowpass|starseal"]` 覆寫 `--sr-chapter`。
- 字標漸層沿用遊戲：`linear-gradient(120deg, #cdd7ff, #8fa9ff 45%, #b89bff)`。
- 可直接移植的遊戲程式（在 ShatteredRealms/frontend/src/）：
  - `ui/Starfield.tsx` —— 星場 + 游標星座（reduced-motion 已支援）→ Phase 2 React island。
  - `ui/meta/Entry.tsx` —— 碎界樹 spring-damper 物理 → Phase 5。
  - `ui/TunnelTransition.tsx` + styles.css `.scene-transition` —— warp 轉場。
- 三語文案來源：ShatteredRealms `frontend/src/i18n/translations.ts`（`start.tagline`、`entry.hubTitle`、`theme.*.tagline`）。
- 待解：英文章節名以 `theme.json` 為準統一（Snowbound Passage / Age of Starmarks）。
- 驗收方式：`npm run build` 綠燈；日後由使用者以 `npm run dev` 實機檢視動效與捲動電影。

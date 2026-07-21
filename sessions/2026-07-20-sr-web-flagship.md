# Session：sr-web 旗艦官網（Astro + 程序化動效）

- 建立：2026-07-20
- 狀態：進行中
- 進度摘要：Phase 0 骨架完成、`npm run build` 綠燈；下一步 Phase 1 品牌基元。
- 相關：branch `claude/sr-web-animation-planning-u1vujx`；計畫 `/root/.claude/plans/sr-web-html-js-gentle-newt.md`
- Runtime: cloud（每階段 commit + push 到遠端）

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
- [ ] Phase 1 品牌基元：tokens 完善、SVG 字標、字符系統、OG 圖、動效工具、header/footer、語言切換
- [ ] Phase 2 Hero（Pixi 程序化虛空 + Starfield 移植 + 字標 + CTA）
- [ ] Phase 3 捲動電影框架 + 碎裂區（褪色溶解 set-piece）
- [ ] Phase 4 玩法四合一 + 英雄卡
- [ ] Phase 5 主題曲 / World Tree + 章節氛圍 morph
- [ ] Phase 6 Play 啟動器（mock）+ 即時 Pixi 展示 + media 換裝槽
- [ ] Phase 7 打磨（效能 / a11y / 行動 / SEO / 部署）

### 進行中
- [ ] （無，Phase 0 已收尾）

### 已完成（精簡摘要）
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
- 半完成 / 風險：—

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

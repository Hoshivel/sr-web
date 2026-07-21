# Session：sr-web 旗艦官網（Astro + 程序化動效）

- 建立：2026-07-20
- 狀態：進行中
- 進度摘要：**Phase 3 捲動電影 + 碎裂區完成並 push、build 綠**（Lenis 平滑捲動＋錨點平滑＋GSAP ScrollTrigger 框架；碎裂區「褪色」pin/scrub 溶解電影）。Phase 2 Hero 已簽核。下一步 Phase 4 玩法四合一 + 英雄卡。
- 相關：branch `claude/sr-web-plan-continue-od8l0n`（前身 `claude/sr-web-animation-planning-u1vujx` 已併入 main）
- **權威計畫（倉庫內、可冷接手）**：`docs/plan.md`（外部 plan 目錄副本屬臨時性，勿依賴）
- Runtime: cloud（每階段 commit + push 到遠端）

## 如何冷接手（Cold Resume）
1. 讀本檔（目標 / 進度 / 待辦 / `Editing`）與 `docs/plan.md`（完整計畫）。
2. `Editing = idle` → 工作區一致、無半編輯檔；可直接從「待辦」最上面一項開始。
3. `npm install` → `npm run build` 應綠燈；`npm run dev` 起本地開發。
4. 下一步：**Phase 4 玩法四合一 + 英雄卡**（見 `docs/plan.md`）。Phase 1–3 已完成並簽核/推送。

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
- [ ] **Phase 4 玩法四合一 + 英雄卡**（棋類策略/RPG/MOBA/開放探索 scroll-reveal；白棠/暗影/赤焰/青蘿卡片＋換裝槽）
- [ ] Phase 5 主題曲 / World Tree + 章節氛圍 morph
- [ ] Phase 6 Play 啟動器（mock）+ 即時 Pixi 展示 + media 換裝槽
- [ ] Phase 7 打磨（效能 / a11y / 行動 / SEO / 部署）

### 進行中
- [ ]（無 —— Phase 3 全數完成並 push，停在 Phase 3/4 邊界）

### 驗收方式（Hero + 碎裂區，`npm run dev` → `/`、`/zh-cn`、`/en`）
- **Hero**：漂浮發光碎片＋星雲（Pixi）；游標星座＋光暈（Starfield）；◈ 脈動、漸層字標、Play/Learn **磁吸** CTA。
- **碎裂區**（往下捲）：區塊 pin 住，殘片隨捲動向虛空**四散＋褪色**（去飽和淡出），招牌句「碎裂不是天罰，是天地最後一次自救」。導覽/CTA 錨點**平滑捲動**（Lenis）。
- **降級**：開「減少動態」→ 全站靜態（無虛空/無 scrub/原生捲動）；**手機（≤720px）不載入 Pixi**。

### Phase 4 冷接手備忘（下次起手）
- 目標：玩法四合一 scroll-reveal（棋類策略/RPG 成長/MOBA 技能/開放探索）＋英雄卡（白棠/暗影/赤焰/青蘿，程序化佔位＋換裝槽）。接於 `Home.astro` 碎裂區之後，`id="gameplay"`、`id="characters"`（header/footer 已指向）。
- 文案源（遊戲 i18n）：`char.hakuto/shadow/sekien/aoiro.name`＋`.lore`（三語，見 `frontend/src/i18n/translations.ts` 行 ~1538/3199/4946）；玩法四支柱說明見 line ~451/2108/3760。→ 新增 `gameplay.*`、`char.*` 到 `src/i18n/ui.ts`。
- 已就緒接口：`[data-reveal]`（stagger 進場）、`.sr-section`/`.sr-eyebrow`/`.sr-btn`、`bootScrollCinema`（如需 scroll 綁定）、glyph 系統（元素光暈）。換裝槽＝角色卡預留 `media` 區位（日後換立繪）。

### 已完成（精簡摘要）
- [x] Phase 3c 打磨/文件：`bootScrollCinema` 內接 Lenis 錨點平滑捲動（攔截 `a[href^="#"]`→`lenis.scrollTo`、pushState；目標不存在則退回原生）→ header/footer 導覽與 hero 捲動提示皆平滑。plan/README 標 Phase 3 完成。build 綠。
- [x] Phase 3b 碎裂溶解電影：Shattering `<script>` 呼叫 `bootScrollCinema` → pin(#world)+scrub(140%) 時間軸：殘片 `xPercent/yPercent` 補置中、由凝聚態 scrub 至四散（讀 inline `--dx/--dy/--r1`）＋淡出至 opacity 0.04，殘片層 `grayscale(0.7)`（褪色）。文案維持可讀。reduced-motion→boot 回 null 略過。Lenis(5.3KB gz)/GSAP+ScrollTrigger(~46KB gz) 動態 chunk；smooth scroll 於 Phase 3 起上線。三路由引用 script、build 綠。
- [x] Phase 3a 捲動框架 + 碎裂區靜態：三語 `world.*` 文案（招牌句「碎裂不是天罰，是天地最後一次自救」＋lead/body，源自遊戲碎界 lore）。`src/lib/scrollCinema.ts` 單例 boot（Lenis+ScrollTrigger 各一、與 Lenis 同步；reduced-motion 回 null；Lenis/GSAP 動態載入）。`src/components/sections/Shattering.astro`（id=world、`data-scroll-cinema`）：種子化 34 片殘片（凝聚態＋各自四散目標 `--dx/--dy/--r1`）＋眉標/雙行招牌句(漸層)/lead/body（含 `::before` 底襯保可讀）。Home 掛於 Hero 後。三路由 SSR 出 #world＋殘片＋在地文案、build 綠。
- [x] Phase 2d 整合打磨：Hero 中央可讀性 `.hero__veil`（徑向壓暗、z 介於 scrim 與 content）＋字標 `drop-shadow` 輝光；plan/README 標 Phase 2 完成（待簽核）。build 綠。
- [x] Phase 2c Pixi 程序化虛空：`src/components/hero/VoidField.tsx`——漂浮發光菱形碎片（additive、深度→大小/亮度/速度/視差、閃爍、邊界環繞）＋星雲柔光（離屏徑向漸層貼圖、additive、緩脈動）＋游標視差（僅 `pointer:fine`、lerp 平移碎片場）。Pixi 動態 import → 獨立 chunk（~247KB gz，僅 client:visible 注水時抓取）。降級：reduced-motion 完全不啟用；**窄視窗（≤720px）完全不載入 Pixi**（省整包，保留 CSS 底＋Starfield）；WebGL 失敗 try/catch 靜默退場；離開時 destroy app＋自建貼圖。Home 掛載於 Starfield 下方、`.sr-voidfield` 宿主填滿背景層。Pixi v8 API（async init/`app.canvas`/`blendMode="add"`/`generateTexture`/`Texture.from(canvas)`/Ticker 回呼/`destroy`）全 typecheck 過、三路由 SSR 出宿主、build 綠。
- [x] Phase 2b Starfield island：移植遊戲 `Starfield.tsx` → `src/components/hero/Starfield.tsx`（standalone、改用共用 `prefersReducedMotion`、星/連線色沿用品牌、DPR≤2、游標星座＋光暈、邊界環繞、reduced-motion 只畫靜態單幀）。Hero `.hero__bg` 內 `client:visible` 掛載、SSR 出 `<canvas>`（版面穩定）、指標穿透。首次為站點引入 React runtime（~44KB gz，僅此島注水）＋Starfield chunk 1.76KB gz。三路由皆含、build 綠。
- [x] Phase 2a Hero 結構/CTA/磁吸：`Home.astro` 改寫為分層 Hero（`.hero__bg` 徑向虛空＋預留 canvas 注入點/`:global(canvas)` 鋪滿指標穿透、`.hero__scrim` 底部漸隱、content 層）；◈ CSS 脈動、漸層字標、標語、Play(primary)＋Learn(ghost) CTA（`data-magnetic`）、捲動指示點。`motion.ts` 加 `initMagnetic`（reduced-motion＋`pointer:fine` 守衛、位移夾限、ease-back 交 CSS）；Layout boot 併入 reveal＋magnetic（仍 tree-shake 內聯、0 重 JS）。build 綠、三路由 CTA/文案正確。
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
- 半完成 / 風險：—（Phase 3 全數完成並 push、build 綠；下一步 Phase 4）

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

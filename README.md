該專案是 sr ShatteredRealms 的網頁服務。
sr 是一個架空世界觀的 2D 六角格回合制策略遊戲：**手牌 + 走棋 + MOBA 技能與對抗 + SRPG**
四者合一——不屬於目前市面上任何一種主流類型。

這個專案做什麼？
它做： sr官網，介紹，play，about，API/SVC服務。

1. 靜態網頁，前端，官方網站主頁。**正式上線於 `sr.hoshivel.com`（純靜態部署）**。
2. 官網介紹，管理遊戲入口，嵌入遊戲網頁。**遊戲節點：`play.sr.hoshivel.com`（目前單節點）**。
3. 專案後端服務： 分流，探活，動態調整提供外部連接的遊戲服務鏈接。
   官網是純靜態的、沒有反向代理，所以這個服務**掛在獨立的網域**
   （如 `api.hoshivel.com` / `svc.hoshivel.com`），由前端跨源呼叫。

具體來說：
遊戲服務器像是： play.sr.hoshivel.com（日後可再加 hk1/jp1 之類的節點）或者ip，其就是一個url。
這個後端測活，分流，負載均衡。 實時管理和提供。

前端官網訪問 -> 點擊play -> 請求後端服務 -> 提供一個可用的遊戲url -> 前端接收，嵌入顯示該url。

---

## 開發 / 冷接手

- **前端技術棧**：Astro + React islands（strict TS）、GSAP + ScrollTrigger + Lenis、Pixi.js。程序化動態即視覺識別。
- **前端工具鏈**：Astro 7／Vite 8，需 Node.js `>=22.12.0`；lockfile 已固定通過零漏洞稽核的相依版本。
- **後端**（第 3 點的分流服務）：Go 1.24、零第三方相依，位於 [`backend/`](./backend/)。對遊戲節點探活 / 分流 / 負載均衡，於 `GET /api/play.json` 回傳與 `src/lib/play.ts` 同形狀的節點回應。**後端主導分流**：依用戶 IP 地理位置就近收斂為 2~3 個候選＋建議入點（不全敞開所有節點），每位玩家的入點由後端決定。節點與設定的管理經 hoshi-admin 統一管理平臺（控制平面）進行，免重啟即時生效。詳見 [`backend/README.md`](./backend/README.md)。
  - 官網純靜態、**沒有反向代理可把 `/api/` 導給它**，因此它部署在獨立網域，前端以跨源方式呼叫：建置時設 `PUBLIC_SR_API_BASE`（見 [`.env.example`](./.env.example)），後端 `allowedOrigins` 填 `https://sr.hoshivel.com`。
- **權威計畫**：[`docs/plan.md`](./docs/plan.md)（完整實作計畫、網站結構、分階段里程碑、API 介面約定）。
- **會話日誌 / 進度**：[`sessions/`](./sessions/)（目標、待辦、`Editing` 狀態；沿用 ShatteredRealms 家族的 AGENTS.md 慣例）。

```bash
# 前端（官網靜態站）
npm install      # 安裝相依
npm run dev      # 本地開發（Astro）
npm run build    # astro check && astro build（strict TS，驗收門檻）
npm run preview  # 預覽已建置的靜態站

# 後端（Play 分流服務）
cd backend && go run ./cmd/router   # 首次執行產生 config.json；聽 :8090
```

目前進度：**Phase 1–7 全數完成（計畫功能齊備）**，`npm run build` 綠燈。Phase 1 品牌基元、Phase 2 Hero（Pixi 虛空＋Starfield 星座＋磁吸 CTA，已簽核）、Phase 3（Lenis 平滑捲動＋GSAP ScrollTrigger 框架；碎裂區「褪色」pin/scrub 溶解電影）、Phase 4（玩法四柱＋程序化 SVG 母題；四英雄卡＋換裝槽＋指標微傾）、Phase 5（碎界樹——複用遊戲 Entry.tsx spring-damper 物理的官網版 island：拖曳拋擲、章節詳情卡、章節氛圍 morph）、Phase 6（Play 分流啟動器——mock 節點清單 ← 靜態 `/api/play.json`；選節點→iframe 嵌入同源對戰頁＝即時 Pixi 六角戰場＋遙測 HUD；截圖換裝槽）、Phase 7 打磨（sitemap＋robots、OG 補全、品牌化 404、可存取行動選單、Play 節點 aria-pressed、Pixi ticker 於分頁隱藏/離開視窗時暫停）。全站動效均 reduced-motion / 行動降級。**請以 `npm run dev` 目視各區並實測 Play 選點→進入戰場（iframe 即時 Pixi）與行動選單**（Phase 3–7 待視覺簽核）。

## 部署（sr.hoshivel.com —— 純靜態）

- **建置產物**：`npm run build` → `dist/`（純靜態：HTML／JS chunk／CSS／`og.png`／`sitemap.xml`／`robots.txt`／後備 `/api/play.json`）。上傳 `dist/` 到任何靜態主機（或 CDN）即可，站點網域為 `sr.hoshivel.com`（`astro.config.mjs` 的 `site` 已指定，供 canonical／hreflang／sitemap 產生絕對 URL）。**不需要 Node 執行期，也不需要反向代理。**
- **分流 API 走獨立網域**：正因為官網是純靜態的，`/api/` 沒有東西可以轉給後端。前端改為跨源呼叫 `PUBLIC_SR_API_BASE`（預設 `https://api.hoshivel.com`，見 [`.env.example`](./.env.example)）；後端 `allowedOrigins` 必須包含 `https://sr.hoshivel.com`。細節見 [`backend/README.md`](./backend/README.md)〈部署 / 與前端整合〉。
  - 前端有**三層後備**：跨源後端 → 同源預渲染 `/api/play.json` → 內建常數（單節點 `play.sr.hoshivel.com`）。分流服務短暫不可用時，玩家仍進得去遊戲。
  - 仍想同源部署（自備反向代理）也可以：把 `PUBLIC_SR_API_BASE` 設為空字串即恢復同源呼叫。
- **CORS / iframe**：官網以 iframe 嵌入 `play.sr.hoshivel.com`，需把 `https://sr.hoshivel.com` 加入**遊戲後端** `allowedOrigins`（見 ShatteredRealms `docs/deployment.md §7`），否則 `/ws` 403；遊戲主機也不得以 `X-Frame-Options: DENY` / `frame-ancestors` 拒絕被官網嵌入。
- **CI**：沿用家族慣例——若日後加 CI，以 branch 過濾只在 `main` 觸發（工作分支頻繁推送不付 CI 成本）。

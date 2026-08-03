該專案是 sr ShatteredRealms 的網頁服務。
sr 是一個架空世界觀的 2D 六角格回合制策略遊戲：**手牌 + 走棋 + MOBA 技能與對抗 + SRPG**
四者合一——不屬於目前市面上任何一種主流類型。

這個專案做什麼？
它是 SR 官網：介紹世界與玩法，並透過 Hoshivel 的通用路由服務取得遊戲入口。

1. 靜態網頁，前端，官方網站主頁。**正式上線於 `sr.hoshivel.com`（純靜態部署）**。
2. 官網的 Play 啟動器查詢 `hoshi-svc`，取得已探活、已套用路由政策的 SR 遊戲節點，
   再由使用者選擇 iframe 嵌入或另開新分頁。
3. 服務目錄、探活與分流屬於獨立的 `hoshi-svc`，不在這個靜態網站的部署物內。

具體流程：官網 Play → `GET https://svc.hoshivel.com/v1/services/sr-game/route?endpoint=web`
→ 取得建議與候選節點 → 使用者進入後才載入該節點原始 `web` endpoint。

---

## 開發 / 冷接手

- **前端技術棧**：Astro + React islands（strict TS）、GSAP + ScrollTrigger + Lenis、Pixi.js。程序化動態即視覺識別。
- **前端工具鏈**：Astro 7／Vite 8，需 Node.js `>=22.12.0`；lockfile 已固定通過零漏洞稽核的相依版本。
- **Play 路由**：建置時可用 `PUBLIC_HOSHI_SVC_BASE` 指定 hoshi-svc 公開網域（預設
  `https://svc.hoshivel.com`）。瀏覽器保存匿名 routing key，且只經
  `X-Hoshi-Routing-Key` 標頭送出；詳見 [`.env.example`](./.env.example) 與
  [`src/lib/play.ts`](./src/lib/play.ts)。
- **遷移完成**：原本的 SR 專用 `backend/` 已在 hoshi-svc 通過驗證後移除；本倉庫
  現在只包含可靜態建置與部署的官網前端。
- **權威計畫**：[`docs/plan.md`](./docs/plan.md)（網站結構、里程碑與遷移紀錄）。

```bash
# 前端（官網靜態站）
npm install      # 安裝相依
npm run dev      # 本地開發（Astro）
hoshi-build build  # 出貨產物（設定在 .hoshi-build.yaml）
npm run build    # astro check && astro build（strict TS，驗收門檻）
npm run preview  # 預覽已建置的靜態站
```

目前進度：**Phase 1–7 與 hoshi-svc 前端遷移完成**。Play 直接消費通用 RouteDecision，
嚴格驗證回應；路由服務逾時、503 或回傳畸形資料時，只能在服務端指定的
`expiresAt + staleIfError` 期限內使用最近成功結果，否則顯示不可用。前端不再包含靜態
節點清單或假健康後備。請以 `npm run dev` 目視各區並實測 Play、劇場模式與行動選單。

## 部署（sr.hoshivel.com —— 純靜態）

- **建置產物**：`npm run build` → `dist/`（純靜態 HTML／JS／CSS／資產、sitemap、
  robots）。上傳 `dist/` 到靜態主機或 CDN 即可。**不需要 Node 執行期、網站後端或
  `/api` 反向代理。**
- **hoshi-svc**：前端跨源呼叫 `PUBLIC_HOSHI_SVC_BASE`（預設
  `https://svc.hoshivel.com`）。資料平面 CORS 必須允許 `https://sr.hoshivel.com`、
  `GET` 與 `X-Hoshi-Routing-Key`；routing key 不得放進 URL 或日誌。
- **CORS / iframe**：官網以 iframe 嵌入 `play.sr.hoshivel.com`，需把 `https://sr.hoshivel.com` 加入**遊戲後端** `allowedOrigins`（見 ShatteredRealms `docs/deployment.md §7`），否則 `/ws` 403；遊戲主機也不得以 `X-Frame-Options: DENY` / `frame-ancestors` 拒絕被官網嵌入。
- **CI**：沿用家族慣例——若日後加 CI，以 branch 過濾只在 `main` 觸發（工作分支頻繁推送不付 CI 成本）。

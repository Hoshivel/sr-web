# sr-web — Shattered Realms 官網

《碎界 Shattered Realms》的純靜態官網與 Play launcher。網站介紹世界與玩法；
Play 透過 hoshi-svc 取得可用遊戲節點，不保存節點清單或健康 fallback。

## 分流鏈

```text
sr-web Play
  → GET <hoshi-svc>/v1/services/sr-game/route?endpoint=web
  → RouteDecision
  → 使用者選擇 iframe 或新分頁
  → 載入選定節點的 web endpoint
```

hoshi-svc 管理服務目錄、探活與路由政策；本倉庫沒有後端。

偏好 Cookie 使用 `hoshi_cookie_consent` 與 `.hoshivel.com` 的 `hoshi_lang`，不承載
追蹤資料，也不控制登入或安全 Cookie。

## 技術與開發

- Astro 7、React islands、strict TypeScript。
- GSAP／ScrollTrigger、Lenis、Pixi.js。
- Node `>=22.12.0`；相依由 lockfile、Dependabot 與 security workflow 管理。
- `PUBLIC_HOSHI_SVC_BASE` 指定公開 route API，預設 `https://svc.hoshivel.com`。
- routing key 只放 `X-Hoshi-Routing-Key`，不得進 URL 或日誌。

```sh
hoshi test
hoshi dev -open
npm run preview
```

本機完整分流鏈需使用三個終端機：

```powershell
Set-Location ../hoshi-svc
Copy-Item config.example.json config.json
hoshi dev
```

```powershell
Set-Location ../ShatteredRealms
hoshi dev
```

```powershell
Set-Location ../sr-web
Set-Content -LiteralPath .env 'PUBLIC_HOSHI_SVC_BASE=http://localhost:26710'
hoshi dev -open
```

只有當 `PUBLIC_HOSHI_SVC_BASE` 本身是 loopback 時，launcher 才接受 HTTP node URL。

RouteDecision 會嚴格驗證；route API 失敗時，只能在 `expiresAt + staleIfError` 期限內
使用最近成功結果。

## 部署

**Cloudflare Workers（僅靜態資產），生產分支 `main`。** 推上 `main` 由
Cloudflare 建置：`npm run build` → `npx wrangler deploy`。建置設定在 Cloudflare
主控臺，不在本倉庫；CI 不部署。

- Workers 與 Pages 已整合為同一流程。本站只部署靜態資產，兩者無差異。
- `wrangler.jsonc` 供 `npx wrangler deploy` 讀取，在 Cloudflare 的建置環境執行。
  本機不需要 wrangler，因此不在 dependencies，也沒有 `deploy` script。
- 本站不落在任何節點上：不進 hoshi-deploy inventory，origin 憑證不含 `sr.hoshivel.com`。

`hoshi build` 產生 `dist/` 靜態檔，不需 Node runtime、網站後端或 `/api` proxy。

部署要求：

- hoshi-svc CORS 允許 `https://sr.hoshivel.com`、GET 與
  `X-Hoshi-Routing-Key`。
- ShatteredRealms `allowedOrigins` 包含 `https://sr.hoshivel.com`，否則 iframe
  WebSocket 回 403。
- 遊戲與 Hoshi ID 不得以 `X-Frame-Options: DENY` 阻擋嵌入。
- Hoshi ID `frame-ancestors` 精確允許 SR 官網與 Play origin。
- iframe sandbox 保留 form submit，WebAuthn delegation 只授權遊戲 origin 與
  `id.hoshivel.com`。

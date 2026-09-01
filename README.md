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

**本站不落在任何 Hoshivel 節點上，由 Cloudflare 建置並服務。**
`hoshi build`（＝`npm run build`）產生的 `dist/` 就是全部產物；不需 Node
runtime、網站後端或 `/api` proxy。

倉庫這一側**沒有任何一步會推送產物**：CI 只驗建置過不過，`wrangler`
不在相依裡，`wrangler.jsonc` 的 `assets.directory: ./dist` 是給 Cloudflare
那一側讀的。所以「這個 commit 上線了沒有」不由本倉庫回答，也不由
`hoshi-deploy` 的節點清單回答——它在 Cloudflare 專案那裡。

> **註**：`sr.hoshivel.com` 因此不在任何節點的 vhost 裡，也不在 origin 憑證的
> SAN 集合裡；只有遊戲後端的 `play.sr.hoshivel.com` 在。這是刻意的，理由與
> 誰負責見 workspace 的
> `decisions/infrastructure/兩個公開前端由-Cloudflare-服務.md`。

部署要求：

- hoshi-svc CORS 允許 `https://sr.hoshivel.com`、GET 與
  `X-Hoshi-Routing-Key`。
- ShatteredRealms `allowedOrigins` 包含 `https://sr.hoshivel.com`，否則 iframe
  WebSocket 回 403。
- 遊戲與 Hoshi ID 不得以 `X-Frame-Options: DENY` 阻擋嵌入。
- Hoshi ID `frame-ancestors` 精確允許 SR 官網與 Play origin。
- iframe sandbox 保留 form submit，WebAuthn delegation 只授權遊戲 origin 與
  `id.hoshivel.com`。

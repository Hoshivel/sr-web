# Session：sr-web 後端（Play 分流 / 探活 / 負載均衡）

- 建立：2026-07-21
- 狀態：進行中
- 進度摘要：新焦點——實作真實 Go 後端，替換 mock `/api/play.json`；規劃完成、開始搭骨架。
- 相關：branch `claude/sr-web-backend-xrgz06`；契約 `src/lib/play.ts`；計畫 `docs/plan.md §Play 流程`；前身前端旗艦站 `sessions/2026-07-20-sr-web-flagship.md`
- Runtime: cloud（每階段 commit + push 到遠端）

## 如何冷接手（Cold Resume）
1. 讀本檔（目標 / 進度 / 待辦 / `Editing`）＋ `README.md` 第 3 點（後端職責）＋ `src/lib/play.ts`（契約）。
2. 後端在 `backend/`（Go module，獨立於前端 Astro 站）。`cd backend && go build ./... && go test -race ./...` 應綠。
3. `Editing = idle` → 工作區一致、無半編輯檔。

## 目標 / 需求
（實時更新；新增需求往下追加並標註時間）
1. 實作 sr-web **後端服務**（README 第 3 點）：對遊戲伺服器做**探活 / 分流 / 負載均衡**，即時提供可用遊戲 URL。
2. **無痛替換 mock**：後端在同路徑 `GET /api/play.json` 回傳與 `src/lib/play.ts` 完全同形狀的 `PlayResponse`，前端不改（`iframe.src = region.url`）。
3. 遊戲伺服器＝一個 URL（如 `hk1.svc.oha.li` / `jp1.svc.oha.li` 或 IP）；已有 `GET /healthz`（純文字 `ok`）供輪詢。
4. 沿用 ShatteredRealms 家族 Go 後端慣例：config 檔（JSON）＋ flags、`/healthz`、CORS `allowedOrigins`、`go build/vet/gofmt/test -race` 為驗收門檻。
5. 盡量**零第三方相依**（純標準庫），Go 1.24（本機工具鏈）。

## 進度
### 待辦
- [ ] backend/ Go module 骨架 + config 套件（JSON 檔 + flags + regions 清單）
- [ ] internal/play：契約型別 + 背景探活 prober（RTT 延遲 / healthy / 可選 load 解析）+ router 快照 + recommend
- [ ] internal/server：/healthz、GET /api/play.json（+ /api/play alias）、CORS
- [ ] cmd/router/main.go 進入點
- [ ] 測試（config / probe / router / server）+ 驗證綠燈
- [ ] backend/README + 更新 root README / plan / 本日誌；每階段 push

### 進行中
- [ ] 建立本日誌（本步）

### 已完成（精簡摘要）
-（無）

## 設計要點
- **契約（不可改，前端依賴）**：`PlayResponse = { regions: PlayRegion[]; updatedAt: string }`；
  `PlayRegion = { id, host, url, healthy, latencyMs, load }`（見 `src/lib/play.ts`）。
- **探活**：背景 goroutine 週期性 `GET <region.healthURL>`（預設遊戲 `/healthz`）；量測 RTT → `latencyMs`；
  200 → `healthy=true`。body 若為 JSON（`{load|players/capacity}`）則解析 `load`，純文字 `ok` 則 `load` 未知（0），向前相容遊戲未來的富健康端點。
- **分流 / 負載均衡**：後端計算建議節點（healthy 優先，延遲最低，load 次之）；回應維持契約形狀，額外附 `recommendedId`（additive、前端可忽略）。
- **快照**：`sync.RWMutex` 保護；啟動時先同步探一輪，避免首個回應為空。
- **CORS**：`allowedOrigins` 空＝放行任意來源（dev）；設定則只放行清單（prod 收斂），對齊遊戲後端 `cors` 慣例。
- **部署**：反向代理把 `/api/*` 導到本後端、其餘導到靜態 `dist/`；前端同源 fetch `/api/play.json` 不變。
- **模組路徑**：`github.com/moehoshio/sr-web/backend`。

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。
> 狀態 = editing 代表可能有半編輯檔；idle 代表工作區一致。

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—

## 筆記 / 決策
- 遊戲 `/healthz` 目前只回純文字 `ok`（見 ShatteredRealms `internal/server/server.go` `handleHealth`）→ load 目前無真實訊號，探活以 healthy/latency 為準；load 解析為向前相容設計，遊戲端日後可於健康端點附 `load` 即自動生效。
- go.mod 目標 `go 1.24`（本機為 1.24.7），避免觸發 1.25 工具鏈下載；與遊戲後端（1.25）分屬不同 module、不衝突。
- 驗收方式：`cd backend && go build ./... && go vet ./... && gofmt -l . && go test -race ./...` 全綠。

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
- [ ] 測試（config / probe / router / server / play.Recommend）+ `go test -race` 驗證綠燈
- [ ] backend/README + 更新 root README / plan / 本日誌

### 進行中
- [ ] 撰寫測試（下一批）

### 已完成（精簡摘要）
- [x] backend/ Go module 骨架（module `github.com/moehoshio/sr-web/backend`、go 1.24、**零第三方相依**）＋ `.gitignore`（忽略維運 config.json / 二進位）＋ `config.example.json`（prod 範例：allowedOrigins=sr.oha.li、三節點 healthUrl）。
- [x] `internal/config`：JSON 設定檔（缺檔自動產生預設）＋ flags（--config/--ip/--port）；`Region{id,host,url,healthUrl}`、探活週期/逾時、allowedOrigins。
- [x] `internal/play`：契約型別 `Region`/`Response`（JSON 欄位逐一對齊前端 `src/lib/play.ts`）＋ `Recommend`（健康>延遲>負載）＋ additive `recommendedId`。
- [x] `internal/router`：背景探活 prober（並行、RTT 延遲、HTTP 200＝healthy、body 可選 JSON 解析 load／players+capacity，純文字 ok＝load 未知 0）＋不可變快照（RWMutex 原子替換，-race 安全）＋啟動先探一輪＋初始種子快照（首個回應不空）。
- [x] `internal/server`：`/healthz`（純文字 ok）＋ `GET /api/play.json`（＋ `/api/play` alias，`Cache-Control: no-store`）＋ CORS（allowlist 空=放行任意；設定則收斂，對齊遊戲後端）。`cmd/router/main.go` 進入點（訊號取消＋優雅關閉＋ReadHeaderTimeout）。
- [x] 驗證：`go build/vet ./...`＋`gofmt -l` 全綠；smoke（`-port 8099`）——`/healthz`＝ok、`/api/play.json` 回正確契約形狀、CORS `*`/OPTIONS 204/no-store、config 自動產生皆確認。
- [x] 建立本日誌。

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

- 狀態：editing
- 目標檔案：`backend/internal/**/*_test.go`（config / play / router[probe] / server 測試）
- 預計變更：加表格測試；`go test -race ./...` 綠。不改 source（除非測試揭露問題）。
- 半完成 / 風險：source 已全數落地並 build/vet/gofmt/smoke 綠——目前工作區為一致可建置快照；僅缺自動化測試。

## 筆記 / 決策
- 遊戲 `/healthz` 目前只回純文字 `ok`（見 ShatteredRealms `internal/server/server.go` `handleHealth`）→ load 目前無真實訊號，探活以 healthy/latency 為準；load 解析為向前相容設計，遊戲端日後可於健康端點附 `load` 即自動生效。
- go.mod 目標 `go 1.24`（本機為 1.24.7），避免觸發 1.25 工具鏈下載；與遊戲後端（1.25）分屬不同 module、不衝突。
- 驗收方式：`cd backend && go build ./... && go vet ./... && gofmt -l . && go test -race ./...` 全綠。

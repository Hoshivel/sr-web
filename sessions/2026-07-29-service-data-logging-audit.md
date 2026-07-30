# Session：補記「過了就再也取不到」的時點數據（本倉庫部分）

- 建立：2026-07-29
- 狀態：進行中
- 進度摘要：節點的 `createdAt` / `disabledAt` 已落地，後端四層驗證全綠。
- 相關：分支 `claude/service-data-logging-audit-15ky5u`（六個倉庫同名）
  - **主日誌在 `hoshi-api-spec/sessions/2026-07-29-service-data-logging-audit.md`**
    （此焦點橫跨六個倉庫；本檔只記本倉庫的部分，完整審計結果見主日誌）
- Runtime：**cloud**（每階段 commit + push）

## 目標 / 需求（本倉庫部分）

`config.Region`（後臺動態管理的節點清單）**完全沒有時間欄位**：

1. `createdAt` —— 節點是什麼時候登錄進來的。探活結果每輪覆寫，設定檔也沒有別的
   時間欄位，這一刻不記就永遠取不回來。
2. `disabledAt` —— 只有 bool `Disabled`，答不出停用多久。

## 進度

### 待辦
- [ ]（無）

### 已完成（精簡摘要）
- [x] `Region` 新增 `CreatedAt` / `DisabledAt`（RFC3339 字串，與 `play.Response.UpdatedAt`
      同格式；`omitempty`，本欄位之前的節點為空）。
- [x] `UpsertRegion`：新節點蓋 `CreatedAt`；**更新既有節點時忽略呼叫端送來的
      `CreatedAt`/`DisabledAt`**，一律沿用既存值——否則一次後臺編輯就能把登錄時間改成今天。
- [x] `stampDisabled()` 統一維護 `DisabledAt`：轉入停用蓋章、轉出清空、狀態未變保留原值。
      `UpsertRegion` 與 `SetRegionDisabled` 共用，兩個欄位不會各說各話。
- [x] 後臺「節點」資源新增「登錄時間」欄；停用中的節點探活欄顯示「已停用（YYYY-MM-DD 起）」。
- [x] 測試（新檔 `internal/config/store_moments_test.go`）：登錄時點只寫一次且編輯不移動、
      停用蓋章／無關編輯不移動／啟用清空、建立即停用也有時點。共 3 個。
- [x] `go build` / `go vet` / `gofmt -l`（無輸出）/ `go test -race ./...` 全綠。

## 驗收方式

- 後端：`cd backend && go build ./... && go vet ./... && gofmt -l . && go test -race ./...`（已跑，全綠）。
- **前端（Astro）未受影響**：`/api/play.json` 回傳的是 `play.Region`（id/host/url/healthy/
  latencyMs/load），本次未動；改的是後臺管理用的 `config.Region`。前端契約
  `src/lib/play.ts` 無需改動，亦未改動。
  （本環境 `node_modules` 不存在，無法跑 `npm run build`；但本次沒有任何前端檔案變更。）

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—（後端全數落地並驗證綠；前端無變更）

## 筆記 / 決策

- **時點欄位不接受呼叫端輸入**：`createdAt` 是「這一刻發生了什麼」的紀錄，不是可編輯的設定。
  由 store 自己蓋章、更新時強制沿用舊值，這樣它就不可能被 API 呼叫改寫。
- **空字串代表「當時沒記」，不代表「沒有」**：後臺對舊節點顯示空白。

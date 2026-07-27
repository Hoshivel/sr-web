# Session：接入 hoshi-admin 統一管理平臺

- 建立：2026-07-27
- 狀態：待驗收
- 進度摘要：控制平面已實作並測試綠燈；待使用者以實機驗收（見下方驗收方式）。
- 相關：分支 `claude/hoshi-admin-platform-m7vyeg`（四個倉庫同名）
- Runtime：**cloud**

## 目標 / 需求

1. 讓 sr-web 的分流後端能被 **hoshi-admin 統一管理平臺**調度
   （與 Hoshi ID、Shattered Realms 同一個後臺）。
2. **不移除既有 `/admin` 網頁後臺**——它是本服務可獨立運作的證明。

## 進度

### 已完成
- [x] 複製 Hoshi Control Plane Contract v1 三檔到 `internal/controlplane/`
      （contract / sign / agent；零第三方相依，與本倉庫慣例一致）。
- [x] `internal/adminplane/`：把 `config.Store` 與 `router` 投影成契約形狀
      —— 分流／網站／地理三個設定分區、節點資源 CRUD、立即重新探活動作、
      合併即時探活結果的健康檢視。
- [x] `config.json` 新增 `control` 區塊（addr / keyId / secret），
      未設定即完全不啟用；控制平面監聽於**獨立位址**。
- [x] `writeConfig` 權限由 0644 收緊為 **0600**——本檔現含明文共享簽章密鑰。
- [x] 測試：描述可算繪、設定往返與驗證、**樂觀併發**、
      **不因局部 patch 清空 geo.countryCoords**（`UpdateSettings` 是整份覆蓋，此為陷阱）、
      節點 CRUD 與驗證、**更新以路徑 id 為準**、列表合併即時探活、健康四種狀態、重新探活。
- [x] `go build` / `go vet` / `gofmt` / `go test ./...` 全綠。

## Editing（編輯狀態）
- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—

## 驗收方式

1. 在 `config.json` 加入 `control` 區塊（addr `127.0.0.1:8092`、secret 至少 32 字元），啟動 `go run ./cmd/router`。
   啟動日誌應出現「控制平面監聽於 …」。
2. 在 hoshi-admin 後臺「服務登錄」新增本服務（位址填分流後端的 **control.addr**、密鑰填同一字串）。
3. 儀表板應出現「SR 官網分流」與節點健康／延遲；開啟後可改分流參數、增刪節點、按「立即重新探活」。
4. 既有 `/admin` 網頁後臺應完全不受影響。

## 筆記 / 決策

- **既有 `/admin` 保留**：控制平面是額外的機器介面，不是替代品。
- 密鑰放 `config.json` 而非環境變數：本倉庫明文規定「刻意不讀環境變數」，
  沿用該慣例；代價是設定檔含明文密鑰，故一併把寫檔權限收緊為 0600。

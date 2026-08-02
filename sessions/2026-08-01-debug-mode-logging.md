# Session：Debug 模式與日誌記錄（位置 / 保留 / 層級）

- 建立：2026-08-01
- 狀態：待驗收
- 進度摘要：本倉庫已完成；後端 `go build` / `vet` / `gofmt` / `go test -race` 全綠
- 相關：分支 `claude/debug-mode-logging-8vrnfg`

## 目標 / 需求
（使用者於 2026-08-01 提出，跨五個倉庫同一批需求）
1. 為所有程式加入 **Debug 模式**、**日誌記錄**與**相關選項**：
   日誌位置、保留時間、預設顯示的日誌層級等。
2. 為**關機動作 / 操作 / 錯誤**記錄**原因與上下文**，使其可被除錯。
3. Hoshi ID 另行實作，本批次不動該倉庫。
4. （2026-08-02 追加）先 pull 遠端——發現 Hoshi ID 的日誌工作**已合併到它的 main**
   （commit `ca1f9ef`），故改以它的形狀為準，見〈筆記 / 決策〉。

## 進度
### 待辦
- （本倉庫已無待辦；等待使用者驗收）

### 已完成（精簡摘要）
- [x] `internal/logging`（五個服務同一份設計）：層級（可執行期切換）、`text`/`json`、
      檔案輪替（大小 ＋ 每日）、保留天數與份數上限、敏感屬性遮蔽、
      request id 走 context、`Shutdown` / `Operation` 紀錄器、
      記得訊號名稱的 `NotifySignals`
- [x] `internal/config`：`debug` ＋ `log.*` 八個鍵（config.json ＋ 同名 flag），
      啟動時驗證；`LogAttrs()`（不含密鑰）供 debug 模式印出完整生效設定
- [x] `cmd/router/main.go`：改為 `run() error` 形式；`logging.Setup` 安裝 slog 預設
      logger 並接管標準庫 `log`；啟動摘要；關機記錄原因（訊號名／listener 錯誤）
      與逐步驟結果
- [x] `internal/server/observe.go`：panic 復原（含請求與堆疊）、
      5xx error／4xx warn／其餘 debug、`X-Request-Id`
- [x] `internal/router`：**探活失敗現在記得下原因**（`probeResult.reason` / `status`）——
      DNS、TLS、連線被拒、非 200 原本在快照裡全都長成同一個 `healthy=false`；
      並只在健康狀態**變化**時寫一行（debug 模式才逐次寫）
- [x] `internal/adminplane`：descriptor 新增「診斷與日誌」區，
      hoshi-admin 可不重啟改層級 / debug（執行期，不寫回 config.json）；
      `OnAudit` / `OnReject` 改為結構化紀錄
- [x] 文件：README 設定表 ＋ `log` 子欄位表 ＋ flags；`config.example.json`

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—

## 筆記 / 決策
- **以 Hoshi ID 已合併的形狀為準**：鍵語意與預設值與其一致
  （`level` / `format` / `file` / `stderr` / `maxSizeMB` / `retainDays` / `maxFiles`
  ＋ 頂層 `debug`；預設 `text`、寫 stderr、32MB / 14 天 / 14 份）。
- **大小寫跟著本倉庫走**：`config.json` 其他鍵全是 camelCase
  （`probeIntervalSeconds`…），夾一段 snake_case 進來會被下一個人當成筆誤修掉。
  慣例是「鍵路徑與語意」，不是字面大小寫——已寫進 hoshi-api-spec `docs/conventions.md` §7。
- **刻意保留的三項超集**（Hoshi ID 目前沒有）：按日輪替（否則安靜的服務永遠不輪替，
  `retainDays` 設了也不會生效）、敏感屬性自動遮蔽、控制平面即時切換層級／debug。
- **探活原因是本倉庫最有價值的一項**：節點無聲掉出候選池是這個服務最難事後查的故障
  ——玩家被安靜地導去別處，從外面看什麼都沒壞。
- 前端（Astro）未改動，故未跑 `npm run build`（此環境亦未安裝相依）。

## 驗收方式
1. `cd backend && go build ./... && go vet ./... && gofmt -l . && go test -race ./...` —— 應全綠。
2. `go run ./cmd/router -debug` —— 啟動第一行應有 `logging=level=debug …`，
   接著一筆 `configuration in effect`；之後每輪探活每個節點一行 `msg="probed a node"`，
   每個 API 請求一行 `msg=request`。
3. 把某個 region 的 `healthUrl` 改成打不通的位址 —— 應出現一行
   `a node dropped out of the pool`，且 `reason=` 講得出是連不上、憑證錯還是非 200。
4. `go run ./cmd/router -log.file .data/router.log -log.max_size_mb 1`
   —— `.data/` 下應出現 `router.log`，寫滿後出現 `router.log.<時間戳>`。
5. Ctrl-C —— 應看到 `shutting down reason=signal signal=interrupt`、
   數筆 `shutdown step`、最後 `stopped cleanly … took=…`。
6. hoshi-admin →本服務→設定→「診斷與日誌」：把 Debug 模式打開，
   日誌應立刻多出探活與請求追蹤，且出現一筆 `logging changed from the control plane`。

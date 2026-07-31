# Session：發佈前檢查 —— module 路徑正名為 hoshivel

- 建立：2026-07-31
- 狀態：待驗收
- 進度摘要：module 路徑已由 `moehoshio` 改為 `hoshivel`，全套件測試綠燈；等待使用者驗收
- 相關：分支 `claude/pre-release-checklist-620v1k`；`backend/go.mod`

## 目標 / 需求
1. 發佈前檢查：找出仍需改進 / 變更、或需要注意的事項（使用者於 2026-07-31 提出）。
2. （2026-07-31 追加）module 路徑是舊的問題，一併修正。

## 背景：問題描述

`backend/go.mod` 的 module 路徑是 `github.com/moehoshio/sr-web/backend`，
但倉庫實際位於 `hoshivel/sr-web`，與其餘四個服務（皆為 `github.com/hoshivel/…`）不一致。

因為這是獨立 module、不被任何其他倉庫 import，所以純屬命名遺留，
不影響建置——但發佈前留著會讓「倉庫位置」與「module 身分」對不上。

## 進度
### 待辦
- （本倉庫已無待辦；等待使用者驗收）

### 已完成（精簡摘要）
- [x] 發佈前掃描：`go build` / `vet` / `gofmt` / `go test -race` 全綠；Astro build 綠燈
- [x] 確認 `backend/.gitignore` 已涵蓋含密鑰的 `config.json`（不會誤入版控）
- [x] module 路徑 `moehoshio` → `hoshivel`：`go.mod` 與 12 個檔案的 import 一併更新
- [x] 確認無跨倉庫引用殘留；hoshi-api-spec 的協定合規檢查仍為「全部合規」

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—

## 筆記 / 決策
- 純機械式改名，無行為變更：module path 只影響 import 字串，不影響建置產物或執行期。
- 文件（README / docs/plan.md）未出現舊路徑，無需同步修改。

## 驗收方式
1. `cd backend && go build ./... && go test -race ./...` —— 應全綠。
2. `head -1 backend/go.mod` —— 應為 `module github.com/hoshivel/sr-web/backend`。

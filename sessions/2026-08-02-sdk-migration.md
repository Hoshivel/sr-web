# Session：改依賴 hoshi-sdk（hoshi-api-spec 拆分）

- 建立：2026-08-02
- 狀態：待驗收
- 進度摘要：已改指向 hoshi-sdk，build / vet / gofmt / test -race 全綠
- 相關：分支 `claude/hoshivel-sdk-migration-2p3onl`（八個倉庫同名）

## 目標 / 需求

1. `hoshi-api-spec` 拆成 **hoshi-standards**（規範：協定、慣例、工程標準）
   與 **hoshi-sdk**（實作：可 import 的 runtime）。
2. 本倉庫改為依賴 `github.com/hoshivel/hoshi-sdk/go`。

## 進度

### 已完成（精簡摘要）
- [x] import 由 `hoshi-api-spec/hoshi-client-go/controlplane` 改為
      `hoshi-sdk/go/controlplane`
- [x] `go.mod` 改 require `github.com/hoshivel/hoshi-sdk/go`（pseudo-version，
      待 SDK 合併並打 `go/v1.0.0` 後升上去）
- [x] 刪除 `internal/logging/`，改用 SDK 的 `go/kit/logging`——三個倉庫原本
      各有一份副本（sr-web 與 SR 逐位元組相同，本倉庫是缺了除錯模式的舊變體），
      現在收成一份
- [x] 文件內對 hoshi-api-spec / hoshi-client-go 的指涉全部改正
- [x] 驗證：`go build ./...`、`go vet ./...`、`gofmt -l .`（無輸出）、
      `go test -race ./...` 全綠

### 驗收方式
```sh
export GOPRIVATE='github.com/hoshivel/*'
go build ./... && go vet ./... && gofmt -l . && go test -race ./...
```
另在 hoshi-standards 執行 `tools/check-protocol-conformance.py`，本服務應為「合規」。

## Editing（編輯狀態）

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—

## 筆記 / 決策
- SDK 尚未合併回 main，所以 require 的是 pseudo-version。合併並打上
  `go/v1.0.0` 之後，各服務 `go get github.com/hoshivel/hoshi-sdk/go@v1.0.0` 即可。

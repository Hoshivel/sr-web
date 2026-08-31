<!-- hoshivel:agent-rules v1 -> https://github.com/Hoshivel/workspace -->

# AGENTS.md — sr-web（Shattered Realms 官網）

> 共通流程以 [workspace](https://github.com/Hoshivel/workspace) 的 `AGENTS.md`
> 為準；本檔只列本倉庫規則。

## 0. 開工前

1. 確認 `../workspace` 在場；缺少時執行
   `git clone https://github.com/Hoshivel/workspace.git ../workspace`。
2. 讀 `../workspace/focus.md` 與 `../workspace/AGENTS.md`；取不到就停止並說明。
3. 待辦與日誌分別放在 `workspace/todo/sr-web/`、
   `workspace/logs/sr-web/`；不得在本倉庫另建副本。
4. 續接事項時沿用其分支與 PR。

## 1. 入場閱讀順序

1. `README.md`：定位與分流鏈。
2. `src/`：路由、layout、component、i18n、工具與樣式。
3. `../hoshi-svc/docs/api.md`：Play 使用的 route API。

## 2. 驗證

```sh
hoshi test
hoshi dev -open
```

`hoshi test` 必須包含 route contract test、`astro check` 與 `astro build`；
不得只跑 build。

## 3. 特殊規則

- 本站是無後端的靜態站；分流由 hoshi-svc route API 處理，不得恢復 `backend/`。
- 直接使用 `RouteDecision`，不保留 `/api/play.json` 相容層。
- 全倉庫禁用容器產物，包括 Dockerfile 與 compose.yaml。
- 文件用正體中文，程式碼註解用英文。

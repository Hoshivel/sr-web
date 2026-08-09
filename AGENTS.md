<!-- hoshivel:agent-rules v1 -> https://github.com/Hoshivel/workspace -->

# AGENTS.md — sr-web（Shattered Realms 官網）

> **代理執行規範的正本不在這裡**，在
> [workspace](https://github.com/Hoshivel/workspace) 的 `AGENTS.md`：
> 四層記錄（焦點／todo／logs／decisions）、中斷復原流程、跨倉庫協作流程、
> 分支與 PR 規則全在那裡。
> 本檔只補上**這個倉庫自己的**東西。

## 0. 開工前

**先取得 workspace，讀它的 `focus.md` 與 `AGENTS.md`。**

```sh
cat ../workspace/focus.md                                          # 本機：就在旁邊
git clone https://github.com/Hoshivel/workspace.git ../workspace   # 雲端：自己補上
```

- 取不到就**停下來告訴使用者**，不要退回在本倉庫自建 `TODO.md` 或工作記錄。
- **本倉庫的待辦在 `workspace/todo/sr-web/`**，工作日誌在 `workspace/logs/sr-web/`。
  **不得**自建 `TODO.md`／`logs/`，也不得記錄領取、分支或 `Status: Editing`
  （workspace `AGENTS.md` §4.4、§5）。
- 續接既有任務時**沿用該事項記的分支與 PR**，不要另開新分支
  （workspace `AGENTS.md` §4.3）。

## 1. 入場閱讀順序

1. `README.md` —— 本站的定位與它在分流鏈上的位置。
2. `README.md` 的〈分流鏈〉一節 —— 本站與 hoshi-svc 的分工。
3. `src/` 的結構：`pages/`（路由）、`layouts/`、`components/`、`i18n/`、
   `lib/`、`styles/`。
4. 相鄰的 [hoshi-svc](https://github.com/Hoshivel/hoshi-svc) `docs/api.md` ——
   本站的 Play 分流走它的通用 route API。

## 2. 驗證

改動後執行；綠燈再更新該事項的 `Status:`（`Editing` → `待驗證`）：

```sh
hoshi test         # ＝ npm run build ＝ astro check && astro build
hoshi dev -open    # 本機開發（astro dev，:4321）
```

`astro check` 是這個倉庫唯一的型別關卡，不要用 `astro build` 跳過它——
`test.scripts` 之所以是 `build` 而不是 `preview` 就是為了這個。
流程的正本在 hoshi-platform-standards `engineering/build.md` §3、§6。

## 3. 這個倉庫的特殊規則

- **靜態站，沒有後端**。舊的分流 `backend/` 已於 2026-08-03 整個移除，
  分流改由 [hoshi-svc](https://github.com/Hoshivel/hoshi-svc) 的通用 route API 負責。
  **不得**把後端邏輯加回本倉庫——那正是被收斂掉的東西。
- **直接消費通用 `RouteDecision`**，不保留 `/api/play.json` 相容層。
- **部署是靜態產物**，依 hoshi-platform-standards `engineering/deployment.md`。
  `tools/check-deploy-conformance.py` 曾回報本倉庫有容器產物不合規
  （Dockerfile、compose.yaml 等）——**全倉庫禁用容器**，這些應該清掉。
- **平臺規範的位置**：**被 import 的**進 hoshi-platform-sdk，**被遵守的**進 hoshi-platform-standards，
  **會過期的**（待辦、工作日誌、代理規範）進
  [workspace](https://github.com/Hoshivel/workspace)。
- 文件與註解沿用倉庫既有風格：**正體中文為主**（程式碼註解英文），
  狀態關鍵字（`Status:` 的那幾個值）保持原樣以利機器辨識。

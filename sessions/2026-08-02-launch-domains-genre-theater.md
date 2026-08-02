# Session：正式上線調整——網域正名 / 劇場模式 / 類型定位 / 靜態部署接外部 API

- 建立：2026-08-02
- 狀態：待驗收
- 進度摘要：四項需求全數落地（前端 + 後端 + 文件），`npm run build` 與 Go 四項驗證全綠；
  另有一個待使用者決定的架構問題（分流服務是否搬到 `hoshi-svc`）
- 相關：分支 `claude/sr-website-improvements-njx1qf`
- Runtime：cloud（未附 Runtime 行 → fail-safe 視為 cloud：每階段 commit + push）

## 目標 / 需求

使用者於 2026-08-02 提出四項：

1. **網域正名**：官網正式上線於 `sr.hoshivel.com`，遊戲為 `play.sr.hoshivel.com`。
   目前**僅單節點**，後續可再補充節點。
2. **劇場模式寬度**：劇場模式「還沒正常的寬」——目前只變高、沒有變寬。
3. **類型定位改寫**：不是「RPG 成長」。實際上是
   **手牌 + 走棋 + MOBA 技能與對抗 + SRPG**，不屬於目前市面任意主流派。
4. **靜態部署**：`sr.hoshivel.com` 需要**純靜態部署**，因此後端服務要透過其他網域的
   API 提供（如 `api.hoshivel.com` / `svc.hoshivel.com`）——前端改為跨源呼叫。

## 進度

### 待辦
- [ ] 架構決策：分流服務是否搬出 sr-web → 新倉庫 `hoshi-svc`（使用者 2026-08-02 追加提問，
      待回覆；見〈筆記 / 決策〉）。四項需求本身已全數落地。

### 已完成（精簡摘要）
- [x] 盤點：`oha.li` 出現在 16 個檔；劇場模式僅設 `height`，寬度仍受
      `.sr-container`（`--sr-maxw`）限制；玩法四柱 id 為
      `tactics/growth/skills/explore`；前端 fetch 寫死同源 `/api/play.json`。
- [x] **1 前端網域正名**：`astro.config` site／`package.json`／`robots.txt`／sitemap 後備 origin
      ／`og.svg` 網域字 → `sr.hoshivel.com`；`og.png` 由 `og.svg` 重新光柵化（舊 PNG 是加上
      網域行之前的版本，內容已對不上 SVG）。
- [x] **2 劇場模式滿幅**：`.size-theater` 以 `width/max-width/margin-inline` 跳出容器撐滿視窗，
      `--play-bleed-w` 由 island 以 `clientWidth` 校正捲軸；舞台高度改 `min(72svh,860px)`
      讓節點列＋控制列一屏內看得完。實測 1440／768／390 三種寬度：滿幅且無橫向溢出。
- [x] **3 類型定位**：四柱改為 **手牌 / 走棋 / MOBA 技能與對抗 / SRPG**（三語齊備），
      標題與新增的 `gameplay.claim` 直接寫明「不屬於任何一種主流類型」；新增手牌母題、
      走棋母題（蜂巢＋棋子），移除已無對應柱的地景母題；`site.summary` 三語同步改寫。
- [x] **4 跨源 API（前端側）**：新增 `PUBLIC_SR_API_BASE`（預設 `https://api.hoshivel.com`）
      與 `fetchPlay()` 三層後備（跨源後端 → 同源預渲染 JSON → 內建常數），逾時 4s；
      單節點 `sr1 → play.sr.hoshivel.com`；節點卡無量測值時顯示「—」而非謊報 `0ms`。
- [x] 驗證：`npm run build` 綠（astro check 0 errors）；Playwright 實跑截圖確認玩法四柱與
      劇場模式版面。
- [x] **1 後端網域正名 / 單節點**：`defaultFile()` 與 `config.example.json` 收斂為
      `sr1 → play.sr.hoshivel.com`；`allowedOrigins` 範例改 `https://sr.hoshivel.com`；
      控制平面欄位說明的示例主機一併更新（會顯示在 hoshi-admin 後臺）；測試夾具同步改名。
- [x] **4 靜態部署文件**：`backend/README.md`〈部署 / 與前端整合〉改寫為「官網純靜態 +
      分流 API 掛獨立網域 + 上線兩件事（allowedOrigins / PUBLIC_SR_API_BASE）」；
      根 `README.md` 與 `docs/plan.md` 同步（plan.md 保留原規劃敘述並加 2026-08-02 註記）。
- [x] 後端驗證：`go build` / `go vet` / `gofmt -l`（無輸出）/ `go test -race` **四者全綠**。
      私有 module `hoshi-client-go` 以 `GOPRIVATE=github.com/hoshivel/*` 經 session git proxy 取得。

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。

- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—（四項需求皆已落地並通過驗證；唯一未決的是「分流服務要不要搬到
  `hoshi-svc`」這個架構決策，那是**新的一批工作**，不是半完成的編輯）

## 筆記 / 決策

- **單節點**：保留多節點資料結構（後端分流邏輯不動），只是預設 / 後備清單收斂成
  一個 `sr1 → play.sr.hoshivel.com`。日後補節點只需改後端 `config.json`，前端零改動。
- **跨源 API**：靜態站沒有反向代理可把 `/api/` 導到後端，因此前端改讀
  `PUBLIC_SR_API_BASE`（建置期注入，預設 `https://api.hoshivel.com`）。三層後備：
  跨源端點 → 同源預渲染 JSON → 內建常數，任何一層失敗都不會讓 Play 區塊卡在骨架。
- **劇場模式**：採「滿幅跳出容器」（YouTube theater 慣例）。`100vw` 會含捲軸寬度，
  故以 CSS 變數 `--play-bleed-w` 預設 `100vw`、由 island 以
  `document.documentElement.clientWidth` 修正（扣掉捲軸），避免橫向溢出。
- **（2026-08-02 追加）架構提問**：使用者提出「分流服務也許該搬到 `hoshi-svc`，
  sr 官網純靜態」。查 org 現有倉庫：ShatteredRealms / sr-web / hoshi-identity /
  hoshi-mail / hoshi-admin / hoshi-api-spec / hoshivel-web / hoshi-standards——
  **`hoshi-svc` 尚不存在**，等於要新建倉庫（需使用者確認才動）。
  本次前端改動與該決策**無關**：前端讀 `PUBLIC_SR_API_BASE`，服務放哪個倉庫都一樣。
  受影響的只有「`backend/` 要不要留在 sr-web」與文件敘述。

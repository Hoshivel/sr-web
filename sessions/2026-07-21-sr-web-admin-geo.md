# Session：sr-web 後端後臺（可視化配置 / 登入 / 動態管理）＋ 後端主導分流（IP 地理 / 候選收斂）＋ 角色立繪接入

- 建立：2026-07-21
- 狀態：待驗收（Phase A–F 全數完成、backend `go build/vet/gofmt/test -race` 全綠、frontend `npm run build` 綠；剩「使用者部署端到端 + 視覺簽核」）
- 進度摘要：**全六階段完成**。後端主導地理分流（收斂候選）＋即時 Store＋後臺（登入/動態管理）＋文件；前端採用後端建議入點＋白棠立繪＋Play 版面重排（尺寸模式/新分頁）。ShatteredRealms 已 pull，僅 hakuto 立繪到位（shadow/sekien/aoiro 未推送）。
- 相關：branch `claude/session-qo9e4e`（cloud，每階段 push）；契約 `src/lib/play.ts`；後端 `backend/`；立繪來源 ShatteredRealms `frontend/public/art/portraits/*.png`
- Runtime: cloud（每階段 commit + push 到遠端 origin）

## 如何冷接手（Cold Resume）
1. 讀本檔（目標 / 進度 / 待辦 / `Editing`）＋ `backend/README.md`＋ `src/lib/play.ts`（前端契約）。
2. 後端在 `backend/`（Go module，零第三方相依，go 1.24）。`cd backend && go build ./... && go vet ./... && gofmt -l . && go test -race ./...` 應綠。
3. 前端 Astro：`npm install && npm run build`（strict TS）應綠。
4. `Editing = idle` → 工作區一致、無半編輯檔。

## 目標 / 需求
（實時更新；新增需求往下追加並標註時間）

1. **後臺可視化配置 / 登入 / 動態管理**（Part 1）：後端提供有登入保護的網頁後臺，可視化檢視即時節點狀態、動態增刪改節點與設定（免重啟、持久化到 config.json）。
2. **後端主導分流**（Part 2）：後端承擔測活（已有）＋**動態分配**——每位玩家最終 play 入點由後端決定。
   - 不再全敞開返回所有節點；改為**依 IP 地理位置**回傳 **2~3 個**較近 / 對該使用者可能延遲更低的候選。
   - 仍回「列表」，但列表為後端計算後的收斂候選＋後端建議入點（`recommendedId`）。前端優先採用後端建議。
3. **角色立繪接入**（Part 3）：sr 原始倉庫（ShatteredRealms）已補上立繪 `portraits/<charId>.png`；接入 sr-web 英雄卡換裝槽。
   - 目前僅 `hakuto` 立繪已推送；其餘（shadow/sekien/aoiro）**在其他任務完成後 pull 一次**，有則接入、無則結束任務。
   - 角色 slug 對照：白棠=`hakuto`❄、暗影=`shadow`☾、赤焰=`sekien`❂、青蘿=`aoiro`❦（源 `design/characters/portrait-prompts.md`）。
4. **（2026-07-21 新增）Play iframe 可調整尺寸與版面重排**（Part 4）：
   - 嵌入視窗尺寸可切換：**正常 / 寬屏（劇場模式）/ 全屏**；可選支援使用者拖拽調整（非必須）。
   - 新增「**在新分頁打開**」按鈕：直接開新頁訪問目標節點 URL。
   - 版面：**節點改為橫向可滑動卡片**置於嵌入視窗**上方**；嵌入視窗**下方**放模式切換與 NewTab 等按鈕。

## 進度
### 待辦
- [ ] Phase A：後端地理分流收斂（geo 選點、候選上限、per-request 計算、`recommendedId`）＋測試
- [ ] Phase B：config 即時 Store（thread-safe、持久化、變更通知）＋ router/server 改讀 Store
- [ ] Phase C：後臺 admin（PBKDF2 登入 / session cookie / setup 引導）＋ 動態管理 API（節點 CRUD、設定）＋內嵌後臺 UI
- [ ] Phase D：文件（backend/README、config.example、root README）
- [ ] Phase E：前端——(a) 採用 `recommendedId`（後端主導入點）；(b) 英雄卡立繪換裝槽接 `hakuto.png`；(c) Play 版面重排（節點橫向卡片置頂）＋iframe 尺寸模式（正常/劇場/全屏）＋新分頁開啟按鈕
- [ ] Phase F：pull ShatteredRealms，接入新到的立繪（shadow/sekien/aoiro），若無則結束

### 進行中
- [ ]（無 —— Phase A–F 全數完成，待使用者驗收）

### 驗收方式（使用者端）
1. **後端自動化（已綠）**：`cd backend && go build ./... && go vet ./... && gofmt -l . && go test -race ./...`。
2. **前端建置（已綠）**：`npm run build`（astro check 0 errors）。**視覺簽核**：`npm run dev` 目視——英雄區白棠卡已換上立繪（其餘三位程序化佔位）；Play 區節點橫向卡片置頂、嵌入視窗、下方尺寸模式（正常/劇場/全屏）＋新分頁按鈕，可拖拽把手調高度。
3. **後臺實跑**：`cd backend && go run ./cmd/router`（loopback：`-ip 127.0.0.1`）→ 啟動日誌印 setup token → 開 `/admin` 建立帳密 → 動態增刪改節點 / 改設定（即時持久化 config.json + 重探）。
4. **地理分流**：設 `geo.trustProxyHeaders=true`（部署於可信 CDN 後）→ 帶 `CF-IPCountry` / `CF-IPLatitude`+`CF-IPLongitude` 請求 `/api/play.json` → 回就近前 N 候選 + `recommendedId`。
5. **上線**：`region.url` 指真實遊戲主機；`allowedOrigins` 設 `sr.oha.li`；後臺置於可信網路 + TLS。

### 已完成（精簡摘要）
- [x] **Phase F：pull ShatteredRealms**。fetch origin/main（仍 `7e922c5` Add Hakuto resources）；shadow/sekien/aoiro 立繪尚未推送 → 依指示結束立繪任務（hakuto 已於 Phase E 接入）。
- [x] **Phase E：前端**。(a) 契約 `play.ts` 加 `recommendedId?`＋`pickEntryId`（**優先採用後端建議入點**）；`PlayLauncher` fetch 後以 `pickEntryId` 預選。(b) 英雄卡換裝槽接 `hakuto` 立繪：sharp 由 ShatteredRealms 原圖（1024×1536 透明）生成 `public/art/portraits/hakuto.webp`（720w，151KB）；`Characters.astro` 有 art 者疊 `<img class="hero-card__art">`（object-fit contain、置底、元素光暈 drop-shadow、hover 微放），無 art 者維持程序化佔位＋slotNote。(c) Play 版面重排：節點改**橫向可滑動卡片**置頂 → 嵌入視窗 → 控制列（進入/離線 + 尺寸模式**正常/劇場/全屏** + **新分頁開啟**）；劇場＝高身沉浸舞台、全屏＝原生 Fullscreen API（Esc 還原）、另加**拖拽把手調整高度**；i18n 三語補 `play.viewSize/size.*/newTab`。`npm run build`（astro check + build）綠、5 頁、PlayLauncher chunk 5KB。**待使用者視覺簽核**。
- [x] **Phase D：文件**。backend/README 更新（地理分流收斂 + 後臺章節 + 設定表 + 結構）＋root README 後端 bullet。
- [x] **Phase C：後臺（可視化配置 / 登入 / 動態管理）**。新增 `internal/admin`：PBKDF2-SHA256 密碼雜湊（stdlib）＋記憶體 session（隨機 token、HttpOnly/SameSite=Strict cookie、滑動續期）；首次未設定→啟動印一次性 setup token 引導建立帳密。路由（同源、不經 CORS、Go1.22 method-mux）：session/setup/login/logout＋state（即時節點狀態合併）＋節點 CRUD（新增/更新/刪除/停用）＋settings＋改密碼＋reprobe，皆經 Store 持久化並即時套用（router 重探）。變更請求做同源檢查（縱深防禦）。內嵌品牌化單頁後臺 `ui.html`（零外部資源、深色 sr 主題、節點表＋即時健康點＋表單，5s 自動刷新）。main 掛入 `Handler(admin)`。測試：auth（雜湊/驗證/session/過期）＋端到端 HTTP（setup 403/400/200、登入、CRUD、停用、設定、改密碼、登出 401、跨源 403、頁面）全綠、`-race` 綠。live smoke（loopback）：setup→動態加節點（router 即時納入）→cap3/4→401→持久化，全數確認。
- [x] **Phase B：即時設定 Store（持久化＋節點變動通知）＋ router 動態重載**。`config.Store` 包住 File，讀取回副本、變更於鎖內套用→驗證→持久化→原子替換＋節點變動通知；`UpsertRegion/DeleteRegion/SetRegionDisabled/UpdateSettings/SetAdmin`。router 加 `SetRegions`（即時替換探活清單、保留既有健康、觸發重探）＋`Reprobe`。server 改持 `*config.Store`，CORS/geo/候選上限 per-request 讀取。全綠。
- [x] **Phase A：後端主導地理分流（收斂候選）**。新增 `internal/geo`（Coord/haversine/內建~50國質心/`Resolve` 反代標頭解析，僅 TrustProxyHeaders 時採信；100% cov）＋`internal/dispatch`（`Select`：健康→就近→負載排序、候選上限、`recommendedId`；90.7% cov）。config 加 `Region.Lat/Lon/Country/Disabled`＋`Coord()`、`GeoConfig`＋`Settings()`、`MaxCandidates`(預設3)、`Admin`(欄位＋`Configured()`，供 Phase C)。router 存 `[]dispatch.Node`（配座標）、過濾 Disabled、加 `DispatchNodes()`；`Snapshot()` 仍回全部（供後臺）。server `handlePlay` 改 per-request：`geo.Resolve`→`dispatch.Select`→只回前 N。`config.example.json` 補 geo/coords/maxCandidates。全綠（`go build/vet/gofmt/test -race`）；smoke 驗證 SG→[sg1,hk1,jp1]、US→[jp1,hk1,sg1]、cap 生效。
- [x] 通盤閱讀後端（config/play/router/server）＋前端（play.ts/PlayLauncher/Characters）＋立繪來源與 manifest；基準 build/test 綠；規劃六階段。

## 設計要點
- **契約相容**：`PlayResponse = { regions: PlayRegion[]; updatedAt; recommendedId? }`；回傳收斂為 2~3 個候選，形狀不變、前端不需大改（僅新增「優先採用 recommendedId」）。
- **地理分流（零第三方相依）**：
  - 節點設定新增 `lat`/`lon`（+ 可選 `country`）。
  - 用戶座標解析：信任反代/CDN geo 標頭（預設 Cloudflare `CF-IPLatitude`/`CF-IPLongitude`/`CF-IPCountry`，可設定）；只有國別時以內建國家質心表近似；皆無 → 退回後端量測延遲排序。
  - 排序：健康優先 → 地理距離（haversine）→ 負載；取前 `maxCandidates`（預設 3）。
  - `recommendedId` = 首位；per-request 計算（快照仍為背景探活結果）。
- **後臺 admin**：`/admin`（同源、不經 CORS）。首次未設定 → 以啟動日誌印出的 setup token 引導建立帳密；之後登入。PBKDF2-SHA256（stdlib，go1.24）雜湊＋隨機鹽，session token（crypto/rand）存記憶體、HttpOnly cookie。
- **動態管理**：admin 改動經 `config.Store` 原子更新 + 持久化 config.json + 通知 router 立即重探。

## Editing（編輯狀態）
> 動手改碼前先更新；落地並驗證後改回 idle。
- 狀態：idle
- 目標檔案：—
- 預計變更：—
- 半完成 / 風險：—（Phase A 全數落地、測試綠、smoke 驗證；工作區一致）

## 筆記 / 決策
- go 1.24.7 → `crypto/pbkdf2` 已入 stdlib，可零第三方相依做密碼雜湊。
- 立繪尺寸：`portraits/hakuto.png` 1024×1536（≈2:3），英雄卡換裝槽為 3:4，`object-fit: cover` 可容。
- 後端量測延遲＝「後端→節點」RTT，非玩家延遲；地理距離作玩家就近的主排序訊號，延遲/負載為次要與可用性訊號（文件註明）。

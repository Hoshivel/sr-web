# Session：sr-web 後端後臺（可視化配置 / 登入 / 動態管理）＋ 後端主導分流（IP 地理 / 候選收斂）＋ 角色立繪接入

- 建立：2026-07-21
- 狀態：進行中
- 進度摘要：規劃完成、基準綠（backend `go build/vet/test` 綠、frontend 待 build）；開始實作 Phase A（後端地理分流收斂）。
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

## 進度
### 待辦
- [ ] Phase A：後端地理分流收斂（geo 選點、候選上限、per-request 計算、`recommendedId`）＋測試
- [ ] Phase B：config 即時 Store（thread-safe、持久化、變更通知）＋ router/server 改讀 Store
- [ ] Phase C：後臺 admin（PBKDF2 登入 / session cookie / setup 引導）＋ 動態管理 API（節點 CRUD、設定）＋內嵌後臺 UI
- [ ] Phase D：文件（backend/README、config.example、root README）
- [ ] Phase E：前端——採用 `recommendedId`（後端主導入點）＋ 英雄卡立繪換裝槽接 `hakuto.png`
- [ ] Phase F：pull ShatteredRealms，接入新到的立繪（shadow/sekien/aoiro），若無則結束

### 進行中
- [ ] Phase A

### 已完成（精簡摘要）
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
- 半完成 / 風險：—

## 筆記 / 決策
- go 1.24.7 → `crypto/pbkdf2` 已入 stdlib，可零第三方相依做密碼雜湊。
- 立繪尺寸：`portraits/hakuto.png` 1024×1536（≈2:3），英雄卡換裝槽為 3:4，`object-fit: cover` 可容。
- 後端量測延遲＝「後端→節點」RTT，非玩家延遲；地理距離作玩家就近的主排序訊號，延遲/負載為次要與可用性訊號（文件註明）。

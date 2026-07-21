# sr-web 後端（Play 分流服務）

《碎界 / Shattered Realms》官網 sr-web 的**後端服務**：對遊戲伺服器節點做**探活
（health probe）／分流／負載均衡**，並由**後端主導**為每位玩家決定可用的遊戲入點
（見倉庫根 `README.md` 第 3 點）。

```
前端官網 → 點 Play → GET /api/play.json →
本後端依「用戶地理位置 + 即時探活」計算 → 只回傳收斂的 2~3 個較近候選 + 建議入點 →
前端採用建議入點（或於候選中選）→ iframe.src = region.url 嵌入 / 新分頁開啟
```

**後端主導分流**：不再全敞開回傳所有節點讓前端自行測試，而是依用戶 IP 地理位置就近
排序、**只回傳前 N 個候選**（預設 3）＋後端建議的入點 `recommendedId`。另提供有登入
保護的**網頁後臺**（`/admin`）可視化管理節點與設定、免重啟即時生效。

- **語言 / 工具鏈**：Go 1.24，**零第三方相依**（純標準庫）。
- **契約**：`GET /api/play.json` 回傳的 JSON 與前端 `src/lib/play.ts` 的 `PlayResponse`
  **完全同形狀**。因此本後端可**無痛替換**前端原本預渲染的 mock 靜態檔——前端不需
  改任何一行（`iframe.src = region.url` 照舊）。

---

## 快速開始

```bash
cd backend
go run ./cmd/router            # 首次執行會產生 config.json（預設值）
# 或指定設定檔 / 埠：
go run ./cmd/router -config ./config.json -port 8090
```

驗證：

```bash
curl -s localhost:8090/healthz        # → ok
curl -s localhost:8090/api/play.json  # → {"regions":[...],"updatedAt":"...","recommendedId":"..."}
```

> 預設節點是 `hk1/jp1/sg1.svc.oha.li`；若這些主機當下不可達，回應會如實顯示
> `healthy:false`（探活如實反映真實狀態，不是 mock）。把 `config.json` 的 `regions`
> 指向實際可達的遊戲主機即可看到 `healthy:true` 與量得的 `latencyMs`。

---

## 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/healthz` | 後端自身存活探針（純文字 `ok`）。 |
| GET | `/api/play.json` | **為此用戶收斂**後的候選節點（依地理就近，前 N 個）＋建議入點。`Cache-Control: no-store`。 |
| GET | `/api/play` | 同上的別名。 |
| ·   | `/admin`、`/admin/api/*` | 網頁後臺（登入保護、動態管理）。見下方「後臺」。 |

`/api/play.json` 回應（欄位對齊 `src/lib/play.ts`，`regions` 已收斂為前 `maxCandidates` 個）：

```jsonc
{
  "regions": [
    { "id": "hk1", "host": "hk1.svc.oha.li", "url": "https://hk1.svc.oha.li/",
      "healthy": true, "latencyMs": 42, "load": 0.38 }
  ],
  "updatedAt": "2026-07-21T07:19:10Z",
  "recommendedId": "hk1"        // 後端為此用戶選定的最終入點；前端優先採用
}
```

> 節點座標（`lat`/`lon`/`country`）為後端內部資訊，**不出現在回應**中——回應只含前端
> 嵌入 / 顯示所需的欄位，且已收斂為少數候選（不暴露完整節點清單）。

---

## 設定（`config.json`）

首次執行自動產生；範例見 [`config.example.json`](./config.example.json)。只讀設定檔與
CLI flags（**不讀環境變數**，對齊遊戲後端慣例）。

| 欄位 | 說明 |
|------|------|
| `listen.ip` / `listen.port` | 監聽位址；ip 留空＝所有介面。預設埠 `8090`。 |
| `allowedOrigins` | CORS 允許的來源清單。**空＝放行任意來源（dev）**；設定則只放行清單（prod 收斂），例如 `["https://sr.oha.li"]`。 |
| `probeIntervalSeconds` | 背景探活週期（預設 10）。 |
| `probeTimeoutSeconds` | 單次探活逾時（預設 3）。 |
| `maxCandidates` | 每次分流回傳給前端的候選節點上限（預設 3；收斂，不全敞開）。 |
| `geo` | 地理分流設定（見下）。 |
| `regions[]` | 遊戲節點：`id`／`host`／`url`（嵌入 / 新分頁目標）／`healthUrl`（探活端點，留空＝`https://<host>/healthz`）／`lat`＋`lon`（座標）或 `country`（ISO 國別碼，缺座標時以國家質心近似）／`disabled`（停用）。 |
| `admin` | 後臺憑證（PBKDF2 雜湊，由後臺 setup 流程寫入；**勿手改**）。 |

`geo` 子欄位：

| 欄位 | 說明 |
|------|------|
| `trustProxyHeaders` | 是否採信反代 / CDN 的地理標頭。**預設 `false`＝不做地理判斷、退回以後端量測延遲排序**。僅在部署於會覆寫 / 剝除用戶偽造值的可信反代 / CDN 之後才可設 `true`。 |
| `latHeader` / `lonHeader` / `countryHeader` | 攜帶用戶地理資訊的標頭名（預設 Cloudflare `CF-IPLatitude` / `CF-IPLongitude` / `CF-IPCountry`）。 |
| `countryCoords` | 額外 / 覆寫的國家質心 `{ "XX": [lat, lon] }`（內建約 50 國）。 |

CLI flags（優先序高於檔）：`-config <path>`、`-ip <ip>`、`-port <port>`。

---

## 探活 / 分流 / 負載均衡

- **探活**：背景 goroutine 每 `probeIntervalSeconds` 並行 `GET <healthUrl>`，量測往返
  延遲填 `latencyMs`，HTTP 200 判定 `healthy`。任何錯誤 / 逾時 / 非 200 ＝ `healthy:false`。
- **負載訊號**：遊戲後端目前的 `/healthz` 只回純文字 `ok`（無負載訊號）→ `load` 為 `0`
  （未知）。本後端**向前相容**：若健康端點日後改回傳 JSON
  （`{"load":0.4}` 或 `{"players":30,"capacity":100}`），`load` 會自動反映，**無需改動
  本後端或前端契約**。
- **地理分流（後端主導）**：`/api/play.json` 為**每次請求**計算候選：
  1. 由反代 / CDN 的地理標頭解析用戶座標（`trustProxyHeaders` 開啟時；精確緯經度優先，
     否則以國別碼近似為國家質心）。
  2. 以「健康優先 → 就近（haversine 大圓距離）→ 負載低」排序；無地理訊號時退回以
     後端量測延遲排序。
  3. **只取前 `maxCandidates` 個**回傳，首位即 `recommendedId`（後端為此用戶選定的入點）。
  → 前端拿到的是收斂後的少數候選，不再是完整節點清單；每位玩家的入點由後端決定。
- **快照一致性**：每輪探活以全新的不可變節點檢視原子替換，讀寫以 `RWMutex` 保護
  （`go test -race` 綠）。啟動即先探一輪，並種下初始檢視，使首個回應不為空。

---

## 後臺（可視化配置 / 登入 / 動態管理）

`/admin` 提供有登入保護的網頁後臺（同源、**不經 CORS**、內嵌單頁、零外部資源）。

- **首次設定**：後臺尚未設定帳密時，**啟動日誌會印出一次性 setup token**；開啟
  `/admin`，貼上 token 並建立管理員帳密（PBKDF2-SHA256 雜湊持久化，永不明文儲存）。
- **登入 / session**：登入後以 HttpOnly、`SameSite=Strict` cookie 維持 session；變更請求
  另做同源檢查（縱深防禦）。
- **動態管理**（皆即時持久化到 `config.json` 並套用，**免重啟**）：
  - **節點**：新增 / 編輯 / 刪除 / 停用；改動即時替換探活清單並觸發重探。
  - **設定**：候選上限、CORS 來源、地理標頭、探活週期 / 逾時（週期 / 逾時於下次重啟生效）。
  - **即時狀態**：節點健康點 / 延遲 / 負載 / 後端建議入點，5 秒自動刷新。
  - 變更管理員密碼、立即重探。

> 後臺為維運介面，請置於可信網路 / 反代之後，並以 TLS 提供（cookie 於 https 下自動加
> `Secure`）。setup token 只印於伺服器日誌，僅維運者可見。

---

## 部署 / 與前端整合

前端 `dist/` 是純靜態站，本後端只提供 `/api/*`。以反向代理（Nginx/Caddy 等）在
`sr.oha.li` 同源下：

```
location /api/     → 反向代理到本後端（如 127.0.0.1:8090）
location /         → 靜態 dist/
```

如此前端同源 `fetch('/api/play.json')` 即命中本後端，取代原本預渲染的 mock 靜態檔，
前端程式碼零改動。跨源部署（前端直接打不同網域的後端）時，把前端 origin 加入
`allowedOrigins` 即可。

> 註：`region.url` 指向真實遊戲主機、且以 iframe 跨源嵌入遊戲時，需另把 `sr.oha.li`
> 加入**遊戲後端**的 `allowedOrigins`（見 ShatteredRealms `docs/deployment.md §7`），否則
> 遊戲的 `/ws` 會 403。此為遊戲後端設定，與本後端無關。

---

## 開發 / 驗證

```bash
cd backend
go build ./...
go vet ./...
gofmt -l .
go test -race ./...
```

四者皆綠為驗收門檻（沿用 ShatteredRealms 家族 `AGENTS.md §4`）。

## 結構

```
backend/
  cmd/router/main.go        進入點（訊號取消 + 優雅關閉 + 掛載後臺）
  internal/config/          設定檔（JSON）+ flags；即時 Store（持久化 + 變更通知）
  internal/play/            契約型別（對齊前端）+ Recommend 挑選
  internal/geo/             座標 / haversine / 國家質心 / 反代地理標頭解析
  internal/dispatch/        後端主導分流：健康→就近→負載排序、候選收斂
  internal/router/          背景探活 prober + 節點檢視 + 動態重載
  internal/server/          HTTP 路由 + CORS（per-request 讀 Store）
  internal/admin/           後臺：PBKDF2 登入 / session / 動態管理 API + 內嵌 UI
  config.example.json       設定範例
```

# sr-web 後端（Play 分流服務）

《碎界 / Shattered Realms》官網 sr-web 的**後端服務**：對遊戲伺服器節點做**探活
（health probe）／分流／負載均衡**，即時提供一個可用的遊戲 URL 給前端 Play 啟動器
嵌入顯示（見倉庫根 `README.md` 第 3 點）。

```
前端官網 → 點 Play → GET /api/play.json → 本後端回傳即時節點清單 →
前端挑一個健康節點 → iframe.src = region.url 嵌入該遊戲頁
```

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
| GET | `/api/play.json` | 即時節點快照（前端 fetch 目標）。`Cache-Control: no-store`。 |
| GET | `/api/play` | 同上的別名。 |

`/api/play.json` 回應（欄位對齊 `src/lib/play.ts`）：

```jsonc
{
  "regions": [
    { "id": "hk1", "host": "hk1.svc.oha.li", "url": "https://hk1.svc.oha.li/",
      "healthy": true, "latencyMs": 42, "load": 0.38 }
  ],
  "updatedAt": "2026-07-21T07:19:10Z",
  "recommendedId": "hk1"        // additive：後端分流建議；前端可忽略（現行前端自行挑選）
}
```

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
| `regions[]` | 遊戲節點：`id`／`host`／`url`（iframe 嵌入目標）／`healthUrl`（探活端點，留空＝`https://<host>/healthz`）。 |

CLI flags（優先序高於檔）：`-config <path>`、`-ip <ip>`、`-port <port>`。

---

## 探活 / 分流 / 負載均衡

- **探活**：背景 goroutine 每 `probeIntervalSeconds` 並行 `GET <healthUrl>`，量測往返
  延遲填 `latencyMs`，HTTP 200 判定 `healthy`。任何錯誤 / 逾時 / 非 200 ＝ `healthy:false`。
- **負載訊號**：遊戲後端目前的 `/healthz` 只回純文字 `ok`（無負載訊號）→ `load` 為 `0`
  （未知）。本後端**向前相容**：若健康端點日後改回傳 JSON
  （`{"load":0.4}` 或 `{"players":30,"capacity":100}`），`load` 會自動反映，**無需改動
  本後端或前端契約**。
- **分流建議**：`recommendedId` 以「健康優先 → 延遲最低 → 負載最低」挑選（與前端
  `recommendRegion` 一致，並多一層負載 tie-break）。回應維持契約形狀，此欄為 additive。
- **快照一致性**：每輪探活以全新的不可變快照原子替換，讀寫以 `RWMutex` 保護
  （`go test -race` 綠）。啟動即先探一輪，並種下初始快照，使首個回應不為空。

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
  cmd/router/main.go        進入點（訊號取消 + 優雅關閉）
  internal/config/          設定檔（JSON）+ flags
  internal/play/            契約型別（對齊前端）+ Recommend 挑選
  internal/router/          背景探活 prober + 不可變快照
  internal/server/          HTTP 路由 + CORS
  config.example.json       設定範例
```

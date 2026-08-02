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
排序、**只回傳前 N 個候選**（預設 3）＋後端建議的入點 `recommendedId`。節點與設定的
管理一律經 hoshi-admin 的控制平面，免重啟即時生效（見下方「控制平面」）。

- **語言 / 工具鏈**：Go 1.24，**零第三方相依**（純標準庫）。
- **介面約定**：`GET /api/play.json` 回傳的 JSON 與前端 `src/lib/play.ts` 的 `PlayResponse`
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

> 預設節點是目前唯一的正式節點 `play.sr.hoshivel.com`；若它當下不可達，回應會如實顯示
> `healthy:false`（探活如實反映真實狀態，不是 mock）。增設節點時在 `config.json` 的
> `regions` 追加即可——就近排序與候選收斂本來就是多節點邏輯，單節點只是它的退化情形。

---

## 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/healthz` | 後端自身存活探針（純文字 `ok`）。 |
| GET | `/api/play.json` | **為此用戶收斂**後的候選節點（依地理就近，前 N 個）＋建議入點。`Cache-Control: no-store`。 |
| GET | `/api/play` | 同上的別名。 |

`/api/play.json` 回應（欄位對齊 `src/lib/play.ts`，`regions` 已收斂為前 `maxCandidates` 個）：

```jsonc
{
  "regions": [
    { "id": "sr1", "host": "play.sr.hoshivel.com", "url": "https://play.sr.hoshivel.com/",
      "healthy": true, "latencyMs": 42, "load": 0.38 }
  ],
  "updatedAt": "2026-08-02T07:19:10Z",
  "recommendedId": "sr1"        // 後端為此用戶選定的最終入點；前端優先採用
}
```

> 節點座標（`lat`/`lon`/`country`）為後端內部資訊，**不出現在回應**中——回應只含前端
> 嵌入 / 顯示所需的欄位，且已收斂為少數候選（不暴露完整節點清單）。

---

## 設定（`config.json`）

首次執行自動產生；範例見 [`config.example.json`](./config.example.json)。只讀設定檔與
CLI flags（**不讀環境變數**，對齊遊戲後端慣例）。每次持久化都在同目錄建立 `0600`
暫存檔、完整寫入並 `fsync`，再原子替換 `config.json`；程序或主機在寫入中斷電不會留下
半份 JSON，成功替換後也不殘留暫存檔。

| 欄位 | 說明 |
|------|------|
| `listen.ip` / `listen.port` | 監聽位址；ip 留空＝所有介面。預設埠 `8090`。 |
| `allowedOrigins` | CORS 允許的來源清單。**空＝放行任意來源（dev）**；設定則只放行清單（prod 收斂），例如 `["https://sr.hoshivel.com"]`。官網為跨源呼叫，**這一項是上線必填**。 |
| `probeIntervalSeconds` | 背景探活週期（預設 10）。 |
| `probeTimeoutSeconds` | 單次探活逾時（預設 3）。 |
| `maxCandidates` | 每次分流回傳給前端的候選節點上限（預設 3；收斂，不全敞開）。 |
| `geo` | 地理分流設定（見下）。 |
| `regions[]` | 遊戲節點：`id`／`host`／`url`（嵌入 / 新分頁目標）／`healthUrl`（探活端點，留空＝`https://<host>/healthz`）／`lat`＋`lon`（座標）或 `country`（ISO 國別碼，缺座標時以國家質心近似）／`disabled`（停用）。 |
| `control` | 控制平面（供 hoshi-admin 統一管理）。見下方「控制平面」。 |

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
  本後端或前端介面約定**。
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

---

## 部署 / 與前端整合

**官網是純靜態部署**：`sr.hoshivel.com` 只有 `dist/` 的 HTML／JS／CSS，沒有 Node
執行期、也沒有可以把 `/api/` 轉給本後端的反向代理。因此本後端**掛在獨立的服務網域**
（如 `api.hoshivel.com` / `svc.hoshivel.com`），前端以**跨源** fetch 呼叫：

```
https://sr.hoshivel.com/          靜態主機 / CDN（dist/）
https://api.hoshivel.com/api/play.json   → 本後端（如 127.0.0.1:8090）
```

上線兩件事：

1. **本後端**的 `allowedOrigins` 填 `["https://sr.hoshivel.com"]`——跨源呼叫沒有這一項
   就會被瀏覽器擋下（同源部署時可以留空，跨源不行）。
2. **前端**建置時設 `PUBLIC_SR_API_BASE=https://api.hoshivel.com`（見倉庫根
   `.env.example`）。前端有三層後備：跨源後端 → 同源預渲染 JSON → 內建常數，
   所以本後端短暫不可用時玩家仍進得去遊戲，只是少了就近與探活的加值。

> 仍想同源部署（自備反向代理把 `location /api/` 導到本後端、`location /` 給 `dist/`）
> 也可以：把 `PUBLIC_SR_API_BASE` 設為空字串即恢復同源呼叫。

> 註：`region.url` 指向真實遊戲主機、且以 iframe 跨源嵌入遊戲時，需另把
> `https://sr.hoshivel.com` 加入**遊戲後端**的 `allowedOrigins`（見 ShatteredRealms
> `docs/deployment.md §7`），否則遊戲的 `/ws` 會 403；遊戲主機也不得以
> `X-Frame-Options: DENY` / `frame-ancestors` 拒絕被官網嵌入。此為遊戲後端設定，
> 與本後端無關。

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
  internal/play/            介面約定型別（對齊前端）+ Recommend 挑選
  internal/geo/             座標 / haversine / 國家質心 / 反代地理標頭解析
  internal/dispatch/        後端主導分流：健康→就近→負載排序、候選收斂
  internal/router/          背景探活 prober + 節點檢視 + 動態重載
  internal/server/          HTTP 路由 + CORS（per-request 讀 Store）
  internal/adminplane/      控制平面配接：把 Store / router 投影成標準協定的形狀
  config.example.json       設定範例
```

---

## 控制平面（供 hoshi-admin 統一管理）

本服務實作 **Hoshi Control Plane Protocol v1**，讓
[hoshi-admin](https://github.com/hoshivel/hoshi-admin) 統一管理平臺能與
Hoshi ID、Shattered Realms 一起在**同一個後臺**調度分流。

**這是本服務唯一的管理入口。** 早期版本另外在 `/admin` 掛了一套本地帳密後臺
（PBKDF2 + session），那是平臺化之前的遺留：它是唯一一條繞過 Hoshi ID 的登入路徑，
不受平臺的密碼策略、工作階段撤銷與稽核涵蓋，已於正式釋出前移除。操作者的身分
一律由 Hoshi ID 認證，再由管理平臺以簽章呼叫本服務。

在 `config.json` 加上：

```json
"control": {
  "addr": "127.0.0.1:8092",
  "keyId": "hoshi-admin",
  "secret": "<至少 32 字元，與管理平臺登錄的密鑰一致>"
}
```

- **未設定 `addr` 或 `secret` 即完全不啟用**——不會開埠，本服務也不會出現在管理平臺上。
- 控制平面**監聽在獨立於公開埠的位址**，預設請綁 loopback：這個介面能重新配置分流節點。
- 認證為 HMAC-SHA256 請求簽章，**密鑰不上線路**；反向代理必須保留請求路徑。
- `config.json` 現在含明文共享密鑰；所有建立與更新都以 **0600** 權限、同目錄暫存檔、
  `fsync` 與原子替換完成。既有檔案請自行 `chmod 600`。

管理平臺可經此：**節點增刪改**（含座標、國別、停用切換）、**分流參數**
（探活週期／逾時、候選上限）、**CORS 來源**、**地理標頭設定**、**立即重新探活**，
以及節點健康與延遲的即時檢視。所有變更即時生效並持久化到 `config.json`。

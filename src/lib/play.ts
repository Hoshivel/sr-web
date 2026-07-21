/*
  碎界 sr-web —— Play 分流契約（本次 mock，寫死型別供未來後端無痛替換）。

  Play 島呼叫 `GET /api/play.json`（見 `src/pages/api/play.json.ts`，靜態站預渲染為
  靜態檔）。本次由此回傳 mock 節點；未來由 Go「分流 / 探活 / 負載均衡」後端提供同一
  形狀的回應，前端不需改動——選定節點後一律 `iframe.src = region.url` 嵌入。

  真實後端替換要點（見 docs/plan.md §Play 流程）：
  - `region.url` 改為真實遊戲主機（如 `https://hk1.svc.oha.li/`）；mock 期間指向同源
    `/play/session/` 展示頁，讓 iframe 嵌入流程可實跑。
  - 遊戲伺服器已有 `GET /healthz`（純文字 `ok`）可供後端輪詢填 `healthy` / `latencyMs`。
  - 若 `sr.oha.li` 跨源嵌入遊戲後端，需把其 https origin 加入遊戲後端 `allowedOrigins`。
*/

export interface PlayRegion {
  /** 節點代號（如 `hk1`）。 */
  id: string;
  /** 顯示用主機名（未來真實後端主機）。 */
  host: string;
  /** iframe 嵌入目標。mock：同源展示頁；真實：遊戲主機 URL。 */
  url: string;
  /** 探活結果：false＝壅塞 / 不可用。 */
  healthy: boolean;
  /** 往返延遲（ms）。 */
  latencyMs: number;
  /** 負載 0..1。 */
  load: number;
}

export interface PlayResponse {
  regions: PlayRegion[];
  /** 回應產生時間（ISO）；真實後端為即時，mock 為建置時。 */
  updatedAt: string;
}

// mock：三個節點（含一個壅塞節點以展示探活/負載差異）。url 指向同源展示頁，
// 讓「選節點 → iframe 嵌入」流程可實跑；真實後端只需把 url 換成遊戲主機。
export const MOCK_PLAY: PlayResponse = {
  regions: [
    { id: "hk1", host: "hk1.svc.oha.li", url: "/play/session/", healthy: true, latencyMs: 42, load: 0.38 },
    { id: "jp1", host: "jp1.svc.oha.li", url: "/play/session/", healthy: true, latencyMs: 61, load: 0.56 },
    { id: "sg1", host: "sg1.svc.oha.li", url: "/play/session/", healthy: false, latencyMs: 128, load: 0.86 },
  ],
  updatedAt: new Date().toISOString(),
};

/** 建議節點：健康節點中延遲最低者（前端預選、後端亦可標記）。 */
export function recommendRegion(regions: PlayRegion[]): PlayRegion | null {
  const healthy = regions.filter((r) => r.healthy);
  const pool = healthy.length > 0 ? healthy : regions;
  return pool.reduce<PlayRegion | null>((best, r) => (!best || r.latencyMs < best.latencyMs ? r : best), null);
}

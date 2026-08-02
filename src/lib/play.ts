/*
  碎界 sr-web —— Play 分流契約（前端消費端）。

  官網（sr.hoshivel.com）是**純靜態部署**：沒有 Node 執行期、也沒有可以把 `/api/`
  轉給後端的反向代理。因此分流 API 由**獨立網域**提供（如 api.hoshivel.com /
  svc.hoshivel.com），前端以**跨源** fetch 呼叫，後端以 CORS allowlist 放行本站 origin
  （見 `backend/README.md`〈部署 / 與前端整合〉）。

  端點優先序（見 `PLAY_ENDPOINTS`）：
  1. `PUBLIC_SR_API_BASE` 指向的跨源分流後端 —— 即時探活 / 就近分流的真實回應。
  2. 同源 `/api/play.json` —— 建置期預渲染的靜態後備（跨源端點不可用時）。
  3. 內建 `FALLBACK_PLAY` 常數 —— 連靜態檔都取不到時的最後防線。
  三層都回傳同一形狀（`PlayResponse`），選定節點後一律 `iframe.src = region.url`。

  遊戲節點：目前僅單節點 `play.sr.hoshivel.com`。多節點的資料結構與分流邏輯已就緒，
  日後補節點只需改後端 `config.json`，前端零改動。
*/

export interface PlayRegion {
  /** 節點代號（如 `sr1`）。 */
  id: string;
  /** 顯示用主機名（遊戲節點主機）。 */
  host: string;
  /** iframe 嵌入目標＝遊戲節點 URL。 */
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
  /** 回應產生時間（ISO）；真實後端為即時，靜態後備為建置時。 */
  updatedAt: string;
  /**
   * 後端為此用戶選定的最終入點 id（分流決策）。真實後端依 IP 就近＋探活計算後回傳
   * 收斂的候選清單（regions）＋此建議入點；前端**優先採用**此入點作預選。
   */
  recommendedId?: string;
}

/**
 * 分流 API 的來源網域。建置期以 `PUBLIC_SR_API_BASE` 覆寫（見 `.env.example`）；
 * 設為空字串＝同源（例如自行以反向代理把 `/api/` 導到後端的部署）。
 */
export const API_BASE = (import.meta.env.PUBLIC_SR_API_BASE ?? "https://api.hoshivel.com").replace(
  /\/+$/,
  "",
);

/** 同源後備：建置期預渲染的靜態 JSON（見 `src/pages/api/play.json.ts`）。 */
export const STATIC_PLAY_PATH = "/api/play.json";

/** 依序嘗試的端點（去重：API_BASE 為空時兩者相同）。 */
export const PLAY_ENDPOINTS: string[] = [
  ...new Set([`${API_BASE}${STATIC_PLAY_PATH}`, STATIC_PLAY_PATH]),
];

/** 遊戲節點主機（單節點；後端會以自身設定覆寫此後備）。 */
export const GAME_HOST = "play.sr.hoshivel.com";

/**
 * 內建後備節點：分流後端與靜態後備都取不到時使用。指向正式遊戲節點——分流服務掛了
 * 不該連帶讓玩家進不了遊戲，只是少了「就近 / 探活」的加值。
 */
export const FALLBACK_PLAY: PlayResponse = {
  regions: [{ id: "sr1", host: GAME_HOST, url: `https://${GAME_HOST}/`, healthy: true, latencyMs: 0, load: 0 }],
  updatedAt: new Date().toISOString(),
  recommendedId: "sr1",
};

/** 建議節點：健康節點中延遲最低者（前端後備挑選；後端未給 recommendedId 時採用）。 */
export function recommendRegion(regions: PlayRegion[]): PlayRegion | null {
  const healthy = regions.filter((r) => r.healthy);
  const pool = healthy.length > 0 ? healthy : regions;
  return pool.reduce<PlayRegion | null>((best, r) => (!best || r.latencyMs < best.latencyMs ? r : best), null);
}

/**
 * 決定預選入點：**優先採用後端的 `recommendedId`**（後端主導分流），其次前端後備
 * `recommendRegion`，再退回第一個節點。回傳選定節點的 id（無節點則 null）。
 */
export function pickEntryId(res: PlayResponse): string | null {
  if (res.recommendedId && res.regions.some((r) => r.id === res.recommendedId)) {
    return res.recommendedId;
  }
  return recommendRegion(res.regions)?.id ?? res.regions[0]?.id ?? null;
}

/** 回應形狀守衛：後備鏈只在拿到「至少一個節點」時才採用該層。 */
export function isPlayResponse(v: unknown): v is PlayResponse {
  if (typeof v !== "object" || v === null) return false;
  const { regions } = v as { regions?: unknown };
  return (
    Array.isArray(regions) &&
    regions.length > 0 &&
    regions.every((r) => typeof r === "object" && r !== null && typeof (r as PlayRegion).id === "string")
  );
}

/**
 * 依序嘗試各端點取回分流回應；全部失敗則回傳內建後備。
 * @param timeoutMs 單一端點的逾時（避免跨源端點吊住時 Play 區塊卡在骨架）。
 */
export async function fetchPlay(timeoutMs = 4000): Promise<PlayResponse> {
  for (const endpoint of PLAY_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, { signal: ctrl.signal, credentials: "omit" });
        if (!res.ok) continue;
        const data: unknown = await res.json();
        if (isPlayResponse(data)) return data;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // 該端點不可用（網路 / CORS / 逾時 / 非 JSON）→ 試下一層。
    }
  }
  return FALLBACK_PLAY;
}

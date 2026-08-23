/*
  碎界 sr-web —— hoshi-svc 通用路由 API 的前端消費端。

  官網是純靜態站；Play island 直接跨源查詢 hoshi-svc，將通用 RouteDecision 轉為
  畫面需要的 PlayResponse。前端不再提供靜態／內建節點後備：沒有通過驗證的路由結果
  就不載入遊戲。唯一允許的降級是 hoshi-svc 先前成功回傳、且仍在
  expiresAt + staleIfError 容錯期限內的決策。
*/

export interface PlayRegion {
  id: string;
  region: string;
  country: string;
  /** 從 web endpoint URL 安全派生的顯示主機名。 */
  host: string;
  /** iframe／新分頁使用的原始 web endpoint；不得附加查詢參數。 */
  url: string;
  healthy: boolean;
  degraded: boolean;
  latencyMs: number;
  load: number;
}

export interface PlayResponse {
  regions: PlayRegion[];
  recommendedId: string;
  generatedAt: string;
  expiresAt: string;
  /** true 代表網路查詢失敗後使用仍在 staleIfError 期限內的最近成功決策。 */
  stale: boolean;
}

interface RouteNode {
  id: string;
  region: string;
  /** Optional for compatibility with route responses produced before the key was always emitted. */
  country?: string;
  healthy: boolean;
  degraded?: boolean;
  load: number;
  latencyMs: number;
  endpoints: { web: string };
}

interface RouteDecision {
  service: "sr-game";
  recommended: RouteNode;
  candidates: RouteNode[];
  generatedAt: string;
  expiresAt: string;
  ttl: number;
  staleIfError: number;
  decisionId: string;
  configVersion: number;
}

interface CacheEnvelope {
  endpoint: string;
  decision: RouteDecision;
}

type FailureKind = "timeout" | "unavailable" | "invalid" | "network";

export class PlayUnavailableError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;

  constructor(kind: FailureKind, message: string, status?: number) {
    super(message);
    this.name = "PlayUnavailableError";
    this.kind = kind;
    this.status = status;
  }
}

export const HOSHI_SVC_BASE = (import.meta.env?.PUBLIC_HOSHI_SVC_BASE ?? "https://svc.hoshivel.com").replace(
  /\/+$/,
  "",
);
export const ROUTE_ENDPOINT = `${HOSHI_SVC_BASE}/v1/services/sr-game/route?endpoint=web`;

/** localhost / 127.0.0.1 / ::1 —— 只有這三個算本機。 */
function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

/*
  節點 URL 是否放行 `http:`。

  **判準是這份建置指向哪一個 hoshi-svc，不是它跑在哪裡。** 只有當
  `PUBLIC_HOSHI_SVC_BASE` 自己就是 loopback 時才放行——那種建置只可能是
  某個人的開發機，而它拿到的節點也只可能是那臺機器上的 SR。正式建置指的是
  `https://svc.hoshivel.com`，於是這個常數是 false，`http:` 的節點照樣被拒絕。

  綁在**建置期的來源位址**而不是 `location.hostname` 是刻意的：後者在正式站
  被人用 hosts 檔或代理指成 localhost 時會跟著翻成 true，而那正是要擋的情況。
*/
const ALLOW_LOOPBACK_NODES = (() => {
  try {
    return isLoopbackHost(new URL(HOSHI_SVC_BASE).hostname);
  } catch {
    return false;
  }
})();

const ROUTING_KEY_STORAGE = "sr.play.routing-key.v1";
const ROUTE_CACHE_STORAGE = "sr.play.route-decision.v1";
const ROUTING_KEY_RE = /^[A-Za-z0-9._~-]{16,128}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown, min: number, max = Number.POSITIVE_INFINITY): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validWebURL(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    // https 一律可以；http 只在本機建置（見 ALLOW_LOOPBACK_NODES）且節點本身
    // 也是 loopback 時放行——放寬的是 protocol，不是「連去哪裡」。
    const schemeOK =
      url.protocol === "https:" ||
      (ALLOW_LOOPBACK_NODES && url.protocol === "http:" && isLoopbackHost(url.hostname));
    return (
      schemeOK &&
      url.host.length > 0 &&
      url.username === "" &&
      url.password === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

function isRouteNode(value: unknown): value is RouteNode {
  if (!isRecord(value) || !isRecord(value.endpoints)) return false;
  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.region === "string" &&
    // Older route responses omitted country for nodes without a geographic country.
    // Rejecting that optional key would discard every otherwise healthy candidate.
    (value.country === undefined || typeof value.country === "string") &&
    typeof value.healthy === "boolean" &&
    (value.degraded === undefined || typeof value.degraded === "boolean") &&
    isFiniteNumber(value.load, 0, 1) &&
    isFiniteNumber(value.latencyMs, 0) &&
    validWebURL(value.endpoints.web)
  );
}

/** 嚴格驗證通用路由回應；未知欄位可共存，但所有既定欄位與語意都必須有效。 */
export function isRouteDecision(value: unknown): value is RouteDecision {
  if (!isRecord(value) || value.service !== "sr-game") return false;
  if (!isRouteNode(value.recommended) || !Array.isArray(value.candidates) || value.candidates.length === 0) {
    return false;
  }
  const recommendedNode = value.recommended;
  if (!value.candidates.every(isRouteNode)) return false;

  const generatedAt = parseTimestamp(value.generatedAt);
  const expiresAt = parseTimestamp(value.expiresAt);
  if (generatedAt === null || expiresAt === null || expiresAt < generatedAt) return false;
  if (!isNonNegativeInteger(value.ttl) || !isNonNegativeInteger(value.staleIfError)) return false;
  if (typeof value.decisionId !== "string" || value.decisionId.trim().length === 0) return false;
  if (!isNonNegativeInteger(value.configVersion)) return false;

  const ids = new Set<string>();
  for (const node of value.candidates) {
    if (!node.healthy && node.degraded !== true) return false;
    if (ids.has(node.id)) return false;
    ids.add(node.id);
  }
  const recommended = value.candidates.find((node) => node.id === recommendedNode.id);
  return (
    recommended !== undefined &&
    (recommendedNode.healthy || recommendedNode.degraded === true) &&
    (recommended.healthy || recommended.degraded === true) &&
    recommended.endpoints.web === recommendedNode.endpoints.web &&
    recommended.region === recommendedNode.region &&
    (recommended.country ?? "") === (recommendedNode.country ?? "") &&
    recommended.healthy === recommendedNode.healthy &&
    (recommended.degraded === true) === (recommendedNode.degraded === true) &&
    recommended.load === recommendedNode.load &&
    recommended.latencyMs === recommendedNode.latencyMs
  );
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function generateRoutingKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `anon_${globalThis.crypto.randomUUID()}`;
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
    return `anon_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  // 舊瀏覽器的最後退化；不含使用者資料，仍只作穩定分配而非身分或認證。
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function routingKey(): string {
  const storage = getStorage();
  if (storage) {
    try {
      const existing = storage.getItem(ROUTING_KEY_STORAGE);
      if (existing && ROUTING_KEY_RE.test(existing)) return existing;
    } catch {
      // localStorage 被瀏覽器封鎖時，這次頁面仍可用一個匿名 key 查詢。
    }
  }

  const generated = generateRoutingKey();
  if (storage) {
    try {
      storage.setItem(ROUTING_KEY_STORAGE, generated);
    } catch {
      // 無持久化能力時只影響跨頁黏著，不影響這次路由查詢。
    }
  }
  return generated;
}

function staleDeadline(decision: RouteDecision): number | null {
  const expiresAt = parseTimestamp(decision.expiresAt);
  if (expiresAt === null) return null;
  const deadline = expiresAt + decision.staleIfError * 1000;
  return Number.isFinite(deadline) ? deadline : null;
}

function readCachedDecision(now = Date.now()): { decision: RouteDecision; fresh: boolean } | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(ROUTE_CACHE_STORAGE);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.endpoint !== ROUTE_ENDPOINT || !isRouteDecision(value.decision)) {
      storage.removeItem(ROUTE_CACHE_STORAGE);
      return null;
    }
    const deadline = staleDeadline(value.decision);
    if (deadline === null || now > deadline) {
      storage.removeItem(ROUTE_CACHE_STORAGE);
      return null;
    }
    return { decision: value.decision, fresh: now <= Date.parse(value.decision.expiresAt) };
  } catch {
    try {
      storage.removeItem(ROUTE_CACHE_STORAGE);
    } catch {
      // ignore
    }
    return null;
  }
}

function cacheDecision(decision: RouteDecision): void {
  const storage = getStorage();
  if (!storage) return;
  const envelope: CacheEnvelope = { endpoint: ROUTE_ENDPOINT, decision };
  try {
    storage.setItem(ROUTE_CACHE_STORAGE, JSON.stringify(envelope));
  } catch {
    // 容量不足或隱私模式只會失去 stale fallback，不得讓成功的線上結果失效。
  }
}

function toPlayResponse(decision: RouteDecision, stale: boolean): PlayResponse {
  return {
    regions: decision.candidates.map((node) => ({
      id: node.id,
      region: node.region,
      country: node.country ?? "",
      host: new URL(node.endpoints.web).host,
      url: node.endpoints.web,
      healthy: node.healthy,
      degraded: node.degraded === true || !node.healthy,
      latencyMs: node.latencyMs,
      load: node.load,
    })),
    recommendedId: decision.recommended.id,
    generatedAt: decision.generatedAt,
    expiresAt: decision.expiresAt,
    stale,
  };
}

export function pickEntryId(response: PlayResponse): string | null {
  return response.regions.some((region) => region.id === response.recommendedId) ? response.recommendedId : null;
}

/**
 * 讀取 sr-game 的 web route。TTL 內直接重用成功快取；線上請求失敗時，只在服務端
 * 指定的 staleIfError 期限內使用最近成功結果。逾期、503 或畸形回應且無可用快取時
 * 一律拋出 PlayUnavailableError，絕不自行捏造可用節點。
 */
export async function fetchPlay(timeoutMs = 4000): Promise<PlayResponse> {
  const cached = readCachedDecision();
  if (cached?.fresh) return toPlayResponse(cached.decision, false);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let failure: PlayUnavailableError;
  try {
    const response = await fetch(ROUTE_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Hoshi-Routing-Key": routingKey(),
      },
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new PlayUnavailableError("unavailable", `route endpoint returned HTTP ${response.status}`, response.status);
    }
    const value: unknown = await response.json();
    if (!isRouteDecision(value)) {
      throw new PlayUnavailableError("invalid", "route endpoint returned an invalid decision");
    }
    const deadline = staleDeadline(value);
    if (deadline === null || Date.now() > deadline) {
      throw new PlayUnavailableError("invalid", "route endpoint returned an expired decision");
    }
    cacheDecision(value);
    return toPlayResponse(value, false);
  } catch (error) {
    if (error instanceof PlayUnavailableError) {
      failure = error;
    } else if (timedOut) {
      failure = new PlayUnavailableError("timeout", "route request timed out");
    } else if (error instanceof SyntaxError) {
      failure = new PlayUnavailableError("invalid", "route endpoint returned malformed JSON");
    } else {
      failure = new PlayUnavailableError("network", "route request failed");
    }
  } finally {
    clearTimeout(timer);
  }

  const stale = readCachedDecision();
  if (stale) return toPlayResponse(stale.decision, true);
  throw failure;
}

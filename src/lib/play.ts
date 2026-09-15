/*
  Shattered Realms sr-web -- the frontend consumer of hoshi-svc's generic routing API.

  The site is purely static; the Play island queries hoshi-svc cross-origin and
  turns the generic RouteDecision into the PlayResponse the UI needs. The frontend
  offers no static or built-in node fallback: without a routing result that passes
  validation, the game is not loaded. The only permitted degradation is a decision
  hoshi-svc returned successfully before, still within its
  expiresAt + staleIfError grace window.
*/

export interface PlayRegion {
  id: string;
  region: string;
  country: string;
  /** Display hostname, safely derived from the web endpoint URL. */
  host: string;
  /** The raw web endpoint used by the iframe or a new tab; query parameters must not be appended. */
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
  /** true means the network query failed and the most recent successful decision, still within staleIfError, is being used. */
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

const DEFAULT_HOSHI_SVC_BASE = import.meta.env?.DEV ? "/__hoshi_svc" : "https://svc.hoshivel.com";
export const HOSHI_SVC_BASE = (import.meta.env?.PUBLIC_HOSHI_SVC_BASE ?? DEFAULT_HOSHI_SVC_BASE).replace(/\/+$/, "");
export const ROUTE_ENDPOINT = `${HOSHI_SVC_BASE}/v1/services/sr-game/route?endpoint=web`;

/** localhost / 127.0.0.1 / ::1 -- only these three count as local. */
function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

/*
  Whether a node URL may use `http:`.

  **The test is which hoshi-svc this build points at, not where it runs.** It is
  allowed only when `PUBLIC_HOSHI_SVC_BASE` is itself a loopback address -- such a
  build can only be somebody's development machine, and the nodes it receives can
  only be the SR on that same machine. A production build points at
  `https://svc.hoshivel.com`, so this constant is false and an `http:` node is
  still rejected.

  Binding this to **the build-time origin** rather than `location.hostname` is
  deliberate: the latter flips to true whenever someone points the production site
  at localhost through a hosts file or a proxy, which is exactly the case this is
  here to block.
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
    // https is always fine; http is allowed only for a local build (see
    // ALLOW_LOOPBACK_NODES) whose node is itself loopback -- what is relaxed is
    // the protocol, not where the connection may go.
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

/** Validate a generic routing response strictly; unknown fields may coexist, but every defined field and its semantics must be valid. */
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
  // Last-resort degradation for old browsers; it carries no user data and still only provides stable assignment, never identity or authentication.
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function routingKey(): string {
  const storage = getStorage();
  if (storage) {
    try {
      const existing = storage.getItem(ROUTING_KEY_STORAGE);
      if (existing && ROUTING_KEY_RE.test(existing)) return existing;
    } catch {
      // When the browser blocks localStorage, this page can still query with an anonymous key.
    }
  }

  const generated = generateRoutingKey();
  if (storage) {
    try {
      storage.setItem(ROUTING_KEY_STORAGE, generated);
    } catch {
      // Without persistence only cross-page stickiness is lost; this routing query is unaffected.
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
    // A full quota or private mode only costs the stale fallback; it must never invalidate a successful online result.
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
 * Read sr-game's web route. Within the TTL a successful cache entry is reused
 * directly; when the online request fails, the most recent successful result is
 * used only within the staleIfError window the server specified. Once expired, or
 * on a 503 or a malformed response with no usable cache, this always throws
 * PlayUnavailableError and never invents an available node.
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

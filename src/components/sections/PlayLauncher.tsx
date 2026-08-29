import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations, type Locale } from "@/i18n/utils";
import type { UIKey } from "@/i18n/ui";
import { fetchPlay, pickEntryId, type PlayRegion, type PlayResponse } from "@/lib/play";
import "./PlayLauncher.css";

/*
  Play 啟動器（island）—— 官網版分流器。
  以 hoshi-svc 的通用 sr-game route API 取得已探活、已收斂的 web endpoints。只有按下
  「進入戰場」後才建立 iframe，且 iframe／新分頁一律使用服務回傳的原始 URL，不附加
  前端自造的 query。沒有有效線上或 stale 路由時顯示不可用，不猜測遊戲節點。
*/

type SizeMode = "normal" | "theater" | "fullscreen";
type LoadState = "loading" | "ready" | "unavailable";
const MIN_H = 260;
const MAX_H = 1000;
// The frame starts on the selected game origin and may navigate to Hoshi ID.
// Naming both through 'src' + the exact identity origin keeps WebAuthn usable
// after that navigation without delegating credential access to arbitrary
// content. The feature identifiers are the WebAuthn Level 3 Permissions Policy
// contract; allow-forms in the sandbox below is separately required for login.
const FRAME_CREDENTIAL_POLICY =
  "publickey-credentials-get 'src' https://id.hoshivel.com; " +
  "publickey-credentials-create 'src' https://id.hoshivel.com";

// Native fullscreen, spelled two ways. WebKit (which is every browser on
// iPadOS, not only Safari) still ships only the webkit-prefixed methods on some
// versions, and the unprefixed-only call above used to fail silently there:
// `el.requestFullscreen` was undefined, so nothing happened at all while the
// component had already switched itself into the fullscreen layout.
type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const doc = document as FullscreenCapableDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

// There is deliberately no separate "does this browser support fullscreen?"
// predicate. The layout does not depend on the answer — `.size-fullscreen` fills
// the viewport on its own and the native layer is a bonus (see the effect that
// calls this) — so a capability check has nowhere useful to gate: refusing the
// MODE when the API is missing would take fullscreen away from exactly the
// browsers the layout fix was written for, and gating the CALL is what the
// rejection below already does. The one caller catches it and carries on.
function enterFullscreen(el: HTMLElement): Promise<void> {
  const target = el as FullscreenCapableElement;
  const request = target.requestFullscreen ?? target.webkitRequestFullscreen;
  if (!request) return Promise.reject(new Error("fullscreen unsupported"));
  return Promise.resolve(request.call(target)).then(() => undefined);
}

function leaveFullscreen(): void {
  const doc = document as FullscreenCapableDocument;
  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
  if (exit) Promise.resolve(exit.call(doc)).catch(() => {});
}

function SizeIcon({ mode }: { mode: SizeMode }) {
  if (mode === "normal") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="6" width="14" height="12" rx="1.5" />
      </svg>
    );
  }
  if (mode === "theater") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
        <path d="M6 9.5h12" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
    </svg>
  );
}

export default function PlayLauncher({ locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const [regions, setRegions] = useState<PlayRegion[] | null>(null);
  const [recId, setRecId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [usingStale, setUsingStale] = useState(false);
  const [connected, setConnected] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [size, setSize] = useState<SizeMode>("normal");
  const [dragH, setDragH] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const frameAttemptRef = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoadState("loading");
    setRegions(null);
    setRecId(null);
    setSelId(null);
    setUsingStale(false);
    frameAttemptRef.current += 1;
    setFrameReady(false);
    setConnected(false);
    try {
      const data: PlayResponse = await fetchPlay();
      if (request !== requestRef.current) return;
      const entry = pickEntryId(data);
      if (!entry) {
        setLoadState("unavailable");
        return;
      }
      setRegions(data.regions);
      setRecId(data.recommendedId);
      setSelId(entry);
      setUsingStale(data.stale);
      setLoadState("ready");
    } catch {
      if (request !== requestRef.current) return;
      setLoadState("unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      requestRef.current += 1;
      frameAttemptRef.current += 1;
    };
  }, [refresh]);

  // 劇場模式滿幅：以 documentElement.clientWidth（已扣掉捲軸寬）校正 100vw。
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (size !== "theater") {
      el.style.removeProperty("--play-bleed-w");
      return;
    }
    const apply = () => el.style.setProperty("--play-bleed-w", `${document.documentElement.clientWidth}px`);
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, [size]);

  const selected = regions?.find((region) => region.id === selId) ?? null;

  // 全螢幕由**本元件自己的版面**負責（`.size-fullscreen` 讓 `.play-view` 蓋滿
  // 視窗），原生 Fullscreen API 只是加分項——它成功就順便把瀏覽器的介面也收掉。
  //
  // 反過來寫（把版面交給 `:fullscreen`）的代價實測過：iPad 上的 Firefox 進了
  // 原生全螢幕卻沒有把那一層畫出來，於是 `.play-view` 從版面裡消失、頁面上留
  // 一塊空白，而唯一能退出的按鈕在 `.play-view` 外面——沒有 Esc 鍵的裝置就
  // 回不來了。現在最差的情況只是「瀏覽器介面沒收掉」，畫面照樣是滿的。
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    if (size !== "fullscreen") {
      if (fullscreenElement() === el) leaveFullscreen();
      return;
    }
    if (fullscreenElement() === el) return;
    enterFullscreen(el).catch(() => {
      // 原生那一層要不到就算了：版面已經是滿版的，不必把模式退掉。
    });
  }, [size]);

  // 使用者用瀏覽器自己的方式離開原生全螢幕（Esc、系統手勢）時把模式同步回來。
  // 兩個事件名都要收：WebKit 只送前綴的那一個，少了它狀態會停在 fullscreen。
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!fullscreenElement() && size === "fullscreen") setSize("normal");
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [size]);

  // 只有明確進入後才把 URL 交給 iframe，避免節點卡片一出現就建立遊戲連線。
  const selectedAvailable = selected !== null && (selected.healthy || selected.degraded === true);
  const frameURL = connected && selectedAvailable && selected ? selected.url : undefined;
  const frameLoading = Boolean(frameURL && !frameReady);

  const pick = (id: string) => {
    frameAttemptRef.current += 1;
    setFrameReady(false);
    setSelId(id);
    setConnected(false);
  };
  const regionLabel = (region: PlayRegion) => {
    // `default` asks the edge to choose a region; it is not a geographic code.
    if (region.region.trim().toLowerCase() === "default") return t("play.defaultRegion");
    const label = region.region.trim() || region.country.trim();
    return label ? label.toUpperCase() : t("play.unknownRegion");
  };
  const chooseSize = (mode: SizeMode) => {
    setDragH(null);
    setSize(mode);
  };
  const openNewTab = () => {
    if (selectedAvailable && selected) window.open(selected.url, "_blank", "noopener,noreferrer");
  };
  const connect = () => {
    frameAttemptRef.current += 1;
    setFrameReady(false);
    setConnected(true);
  };
  const disconnect = () => {
    frameAttemptRef.current += 1;
    setFrameReady(false);
    setConnected(false);
  };
  const onFrameLoad = () => {
    const attempt = frameAttemptRef.current;
    // `load` fires after the document and its eager resources are ready. Two
    // paint frames let the cross-origin page draw once before we fade it in,
    // so the browser's initial white canvas never leaks through the launcher.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (frameAttemptRef.current === attempt) setFrameReady(true);
      });
    });
  };

  const onHandleDown = (event: ReactPointerEvent) => {
    if (size === "fullscreen" || !viewRef.current) return;
    event.preventDefault();
    const startY = event.clientY;
    const startH = viewRef.current.getBoundingClientRect().height;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setDragging(true);
    const onMove = (moveEvent: PointerEvent) => {
      const height = Math.min(MAX_H, Math.max(MIN_H, startH + (moveEvent.clientY - startY)));
      setDragH(height);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const viewStyle = dragH != null && size !== "fullscreen" ? { height: `${dragH}px`, aspectRatio: "auto" as const } : undefined;

  return (
    <div className={`play-launcher size-${size}${dragging ? " is-dragging" : ""}`} ref={rootRef}>
      <div
        className="play-nodes-bar"
        role="group"
        aria-label={t("play.serversTitle")}
        aria-busy={loadState === "loading"}
      >
        {loadState === "loading" && <div className="play-ncard play-ncard--skeleton" aria-hidden="true" />}
        {loadState === "unavailable" && (
          <div className="play-route-state" role="status">
            <span className="play-route-state__mark" aria-hidden="true">◈</span>
            <span>
              <strong>{t("play.unavailable")}</strong>
              <small>{t("play.unavailableHint")}</small>
            </span>
            <button type="button" className="sr-btn sr-btn--ghost" onClick={() => void refresh()}>
              {t("play.retry")}
            </button>
          </div>
        )}
        {regions?.map((region) => {
          const degraded = region.degraded || !region.healthy;
          return (
            <button
              key={region.id}
              type="button"
              aria-pressed={selId === region.id}
              className={`play-ncard${selId === region.id ? " is-selected" : ""}${degraded ? " is-degraded" : ""}`}
              onClick={() => pick(region.id)}
            >
              <span className="play-ncard__top">
                <span className={`play-ncard__dot${degraded ? " is-degraded" : ""}`} aria-hidden="true" />
                <b>{regionLabel(region)}</b>
                {recId === region.id && <span className="play-ncard__rec">{t("play.recommended")}</span>}
              </span>
              <span className="play-ncard__stat">
                <span className="play-ncard__ping">
                  {region.latencyMs > 0 ? (
                    <>
                      {Math.round(region.latencyMs)}
                      <i>ms</i>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="play-ncard__load" aria-hidden="true">
                  <span style={{ width: `${Math.round(region.load * 100)}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`play-view${connected ? " is-connected" : ""}${frameLoading ? " is-loading" : ""}`}
        ref={viewRef}
        style={viewStyle}
        aria-busy={frameLoading}
      >
        {frameURL ? (
          <iframe
            className={`play-frame play-frame--game${frameReady ? " is-ready" : ""}`}
            title={selected ? `${t("play.frameTitle")} · ${regionLabel(selected)}` : t("play.frameTitle")}
            src={frameURL}
            allow={FRAME_CREDENTIAL_POLICY}
            allowFullScreen
            sandbox="allow-forms allow-scripts allow-same-origin"
            aria-hidden={!frameReady}
            tabIndex={frameReady ? 0 : -1}
            onLoad={onFrameLoad}
          />
        ) : (
          <div className="play-frame play-frame--empty" aria-hidden="true" />
        )}
        {frameLoading && (
          <div className="play-view__loading" role="status" aria-live="polite">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <polygon points="40,10 66,25 66,55 40,70 14,55 14,25" />
              <circle cx="40" cy="40" r="5" />
              <path d="M40 21v14M56 49l-12-7M24 49l12-7" />
            </svg>
            <span>{t("play.loading")}</span>
          </div>
        )}
        {size === "fullscreen" && (
          // 退出鈕必須在 .play-view **裡面**：原生全螢幕只呈現這個元素，
          // 而控制列是它的兄弟節點。平板沒有 Esc 鍵，外面那一顆等於不存在。
          <button
            type="button"
            className="play-view__exit"
            onClick={() => chooseSize("normal")}
            aria-label={t("play.size.normal")}
            title={t("play.size.normal")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            </svg>
          </button>
        )}
        {loadState === "ready" && !connected && selected && (
          <div className="play-view__ready" aria-hidden="true">
            <svg viewBox="0 0 80 80">
              <polygon points="40,10 66,25 66,55 40,70 14,55 14,25" />
              <circle cx="40" cy="40" r="5" />
              <path d="M40 21v14M56 49l-12-7M24 49l12-7" />
            </svg>
          </div>
        )}
      </div>

      {size !== "fullscreen" && (
        <div
          className="play-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label={t("play.viewSize")}
          onPointerDown={onHandleDown}
        >
          <span className="play-resize__grip" aria-hidden="true" />
        </div>
      )}

      <div className="play-controls">
        {!connected && (
          <button
            type="button"
            className="sr-btn sr-btn--primary play-enter"
            disabled={!selectedAvailable}
            onClick={connect}
          >
            {t("play.enter")}
          </button>
        )}
        {connected && (
          <button type="button" className="sr-btn sr-btn--ghost" onClick={disconnect}>
            {t("play.disconnect")}
          </button>
        )}

        <span className="play-controls__spacer" />

        <div className="play-sizes" role="group" aria-label={t("play.viewSize")}>
          {(["normal", "theater", "fullscreen"] as SizeMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`play-size-btn${size === mode ? " is-active" : ""}`}
              aria-pressed={size === mode}
              aria-label={t(`play.size.${mode}` as UIKey)}
              title={t(`play.size.${mode}` as UIKey)}
              onClick={() => chooseSize(mode)}
            >
              <SizeIcon mode={mode} />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="sr-btn sr-btn--ghost play-newtab"
          disabled={!selectedAvailable}
          aria-label={t("play.newTab")}
          title={t("play.newTab")}
          onClick={openNewTab}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 5h5v5M19 5l-8 8M17 13v5H6V7h5" />
          </svg>
        </button>
      </div>

      {usingStale && <p className="play-route-stale" role="status">{t("play.stale")}</p>}
    </div>
  );
}

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

export default function PlayLauncher({ locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const [regions, setRegions] = useState<PlayRegion[] | null>(null);
  const [recId, setRecId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [usingStale, setUsingStale] = useState(false);
  const [connected, setConnected] = useState(false);
  const [size, setSize] = useState<SizeMode>("normal");
  const [dragH, setDragH] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoadState("loading");
    setRegions(null);
    setRecId(null);
    setSelId(null);
    setUsingStale(false);
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

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    if (size === "fullscreen") {
      if (el.requestFullscreen && document.fullscreenElement !== el) el.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement === el) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [size]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && size === "fullscreen") setSize("normal");
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [size]);

  // 只有明確進入後才把 URL 交給 iframe，避免節點卡片一出現就建立遊戲連線。
  const selectedAvailable = selected !== null && (selected.healthy || selected.degraded === true);
  const frameURL = connected && selectedAvailable && selected ? selected.url : undefined;

  const pick = (id: string) => {
    setSelId(id);
    setConnected(false);
  };
  const regionLabel = (region: PlayRegion) => {
    const label = region.region.trim() || region.country.trim();
    return label ? label.toUpperCase() : region.host;
  };
  const chooseSize = (mode: SizeMode) => {
    setDragH(null);
    setSize(mode);
  };
  const openNewTab = () => {
    if (selectedAvailable && selected) window.open(selected.url, "_blank", "noopener,noreferrer");
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
              <small className="play-ncard__host">{region.host}</small>
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

      <div className={`play-view${connected ? " is-connected" : ""}`} ref={viewRef} style={viewStyle}>
        {frameURL ? (
          <iframe
            className="play-frame"
            title={selected ? `${regionLabel(selected)} · ${selected.host}` : "session"}
            src={frameURL}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="play-frame play-frame--empty" aria-hidden="true" />
        )}
        {loadState === "ready" && !connected && selected && (
          <div className="play-view__idle">
            <span className="play-view__idle-tag">{t("play.idleHint")}</span>
          </div>
        )}
        {loadState === "unavailable" && (
          <div className="play-view__message" role="status">{t("play.unavailable")}</div>
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
        <button
          type="button"
          className="sr-btn sr-btn--primary play-enter"
          disabled={!selectedAvailable}
          onClick={() => setConnected(true)}
        >
          {t("play.enter")}
        </button>
        {connected && (
          <button type="button" className="sr-btn sr-btn--ghost" onClick={() => setConnected(false)}>
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
              onClick={() => chooseSize(mode)}
            >
              {t(`play.size.${mode}` as UIKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="sr-btn sr-btn--ghost play-newtab"
          disabled={!selectedAvailable}
          onClick={openNewTab}
        >
          {t("play.newTab")} ↗
        </button>
      </div>

      {usingStale && <p className="play-route-stale" role="status">{t("play.stale")}</p>}
    </div>
  );
}

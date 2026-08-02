import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations, type Locale } from "@/i18n/utils";
import type { UIKey } from "@/i18n/ui";
import { FALLBACK_PLAY, fetchPlay, pickEntryId, type PlayRegion, type PlayResponse } from "@/lib/play";
import "./PlayLauncher.css";

/*
  Play 啟動器（island）—— 官網版分流器。
  版面（由上而下）：橫向可滑動節點卡片 → 嵌入視窗（iframe）→ 控制列（進入 / 尺寸模式 /
  新分頁）。以 `fetchPlay()` 向**跨源分流後端**（api.hoshivel.com；靜態站沒有反代可用）
  取得後端**就近收斂**的候選＋建議入點，失敗則逐層退回同源靜態 JSON / 內建常數；
  預選**優先採用後端 `recommendedId`**（後端主導分流），選定即以 iframe 嵌入該節點。
  嵌入視窗尺寸可切換：正常 / 劇場（滿幅）/ 全屏（原生 Fullscreen API），並可拖拽調整高度。
*/

type SizeMode = "normal" | "theater" | "fullscreen";
const MIN_H = 260;
const MAX_H = 1000;

export default function PlayLauncher({ locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const [regions, setRegions] = useState<PlayRegion[] | null>(null);
  const [recId, setRecId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [size, setSize] = useState<SizeMode>("normal");
  const [dragH, setDragH] = useState<number | null>(null); // 拖拽覆寫的高度（px）；null＝依模式預設
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // 取回後端收斂候選；預選優先採用後端建議入點。三層端點皆不可用 → 內建後備節點。
  useEffect(() => {
    let alive = true;
    const apply = (data: PlayResponse) => {
      if (!alive) return;
      setRegions(data.regions);
      setRecId(data.recommendedId ?? null);
      setSelId(pickEntryId(data));
    };
    fetchPlay()
      .then(apply)
      .catch(() => apply(FALLBACK_PLAY));
    return () => {
      alive = false;
    };
  }, []);

  // 劇場模式滿幅：以 documentElement.clientWidth（已扣掉捲軸寬）覆寫 CSS 的 100vw 後備，
  // 避免滿幅舞台比可視區寬出一條捲軸而被裁切。JS 未執行時 CSS 仍以 100vw 生效。
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

  const sel = regions?.find((r) => r.id === selId) ?? null;

  // 全屏：優先原生 Fullscreen API（跨出版面覆蓋整個螢幕）。
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    if (size === "fullscreen") {
      if (el.requestFullscreen && document.fullscreenElement !== el) el.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement === el) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [size]);

  // 使用者按 Esc 退出原生全屏 → 還原為正常模式。
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && size === "fullscreen") setSize("normal");
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [size]);

  const src = sel
    ? `${sel.url}?region=${encodeURIComponent(sel.id)}&host=${encodeURIComponent(sel.host)}&ping=${sel.latencyMs}&load=${Math.round(sel.load * 100)}${connected ? "&connect=1" : ""}`
    : undefined;

  const pick = (id: string) => {
    setSelId(id);
    setConnected(false); // 換節點回到待命
  };
  const regionLabel = (r: PlayRegion) => t(`play.region.${r.id}` as UIKey) || r.host;
  const chooseSize = (m: SizeMode) => {
    setDragH(null); // 切換模式時清除拖拽覆寫，套用該模式預設尺寸
    setSize(m);
  };
  const openNewTab = () => {
    if (src) window.open(src, "_blank", "noopener,noreferrer");
  };

  // 拖拽把手：調整嵌入視窗高度（全屏模式不適用）。
  const onHandleDown = (e: ReactPointerEvent) => {
    if (size === "fullscreen" || !viewRef.current) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = viewRef.current.getBoundingClientRect().height;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    const onMove = (ev: PointerEvent) => {
      const h = Math.min(MAX_H, Math.max(MIN_H, startH + (ev.clientY - startY)));
      setDragH(h);
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
      {/* 節點：橫向可滑動卡片（置於嵌入視窗上方） */}
      <div className="play-nodes-bar" role="group" aria-label={t("play.serversTitle")}>
        {!regions && <div className="play-ncard play-ncard--skeleton" aria-hidden="true" />}
        {regions?.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={selId === r.id}
            className={`play-ncard${selId === r.id ? " is-selected" : ""}${r.healthy ? "" : " is-degraded"}`}
            onClick={() => pick(r.id)}
          >
            <span className="play-ncard__top">
              <span className={`play-ncard__dot${r.healthy ? "" : " is-degraded"}`} aria-hidden="true" />
              <b>{regionLabel(r)}</b>
              {recId === r.id && <span className="play-ncard__rec">{t("play.recommended")}</span>}
            </span>
            <small className="play-ncard__host">{r.host}</small>
            <span className="play-ncard__stat">
              {/* 後備節點沒有量測值（latencyMs 0）→ 顯示破折號，不謊報 0ms */}
              <span className="play-ncard__ping">
                {r.latencyMs > 0 ? (
                  <>
                    {r.latencyMs}
                    <i>ms</i>
                  </>
                ) : (
                  "—"
                )}
              </span>
              <span className="play-ncard__load" aria-hidden="true">
                <span style={{ width: `${Math.round(r.load * 100)}%` }} />
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* 嵌入視窗 */}
      <div className={`play-view${connected ? " is-connected" : ""}`} ref={viewRef} style={viewStyle}>
        {src ? (
          <iframe
            className="play-frame"
            title={sel ? `${regionLabel(sel)} · ${sel.host}` : "session"}
            src={src}
            loading="lazy"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="play-frame play-frame--empty" aria-hidden="true" />
        )}
        {!connected && sel && (
          <div className="play-view__idle">
            <span className="play-view__idle-tag">{t("play.idleHint")}</span>
          </div>
        )}
      </div>

      {/* 拖拽把手（調整高度；全屏模式隱藏） */}
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

      {/* 控制列（置於嵌入視窗下方） */}
      <div className="play-controls">
        <button
          type="button"
          className="sr-btn sr-btn--primary play-enter"
          disabled={!sel || !sel.healthy}
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
          {(["normal", "theater", "fullscreen"] as SizeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`play-size-btn${size === m ? " is-active" : ""}`}
              aria-pressed={size === m}
              onClick={() => chooseSize(m)}
            >
              {t(`play.size.${m}` as UIKey)}
            </button>
          ))}
        </div>

        <button type="button" className="sr-btn sr-btn--ghost play-newtab" disabled={!sel} onClick={openNewTab}>
          {t("play.newTab")} ↗
        </button>
      </div>

      <p className="play-note">{t("play.nodeNote")}</p>
    </div>
  );
}

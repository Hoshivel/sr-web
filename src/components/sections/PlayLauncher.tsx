import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations, type Locale } from "@/i18n/utils";
import type { UIKey } from "@/i18n/ui";
import { fetchPlay, pickEntryId, type PlayRegion, type PlayResponse } from "@/lib/play";
import {
  FULLSCREEN_CHANGE_EVENTS,
  exitFullscreen,
  fullscreenElement,
  requestFullscreen,
} from "@/lib/fullscreen";
import "./PlayLauncher.css";

/*
  Play launcher (island) -- the site's routing front end.
  It fetches probed, settled web endpoints through hoshi-svc's generic sr-game
  route API. The iframe is only created once the enter button is pressed, and both
  the iframe and a new tab always use the raw URL the service returned, with no
  frontend-invented query appended. With no valid online or stale route it shows
  unavailable rather than guessing a game node.
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

// The native layer is asked for on <html>, not on the view element, for two
// reasons that both outlive whichever browser is in front of us:
//
//   - The view element does not survive the switch. Going fullscreen moves it
//     into a portal (see renderView), and element → portal is a different fiber
//     type, so React drops that DOM node and builds a new one. Fullscreen on a
//     node that is about to leave the document is dropped with it.
//   - <html> is the element most likely to be granted where element fullscreen
//     is only partly implemented, and it is the same element the browser would
//     have shown anyway: our own layout is what fills the viewport, so the
//     native layer's whole job is hiding the browser's chrome around it.
//
// Nothing else changes with the target, because nothing depends on WHICH
// element the browser considers fullscreen — `.is-fullscreen` carries the
// layout either way.
const NATIVE_FULLSCREEN_TARGET = () => document.documentElement;

// renderView puts the embedded view where `position: fixed` still means "the
// viewport".
//
// The full-bleed fallback is `position: fixed; inset: 0`, and in place that is
// not enough: `.play__stage` — the wrapper the reveal-on-scroll animation acts
// on — carries `transform` and `will-change: transform`, and either of those
// makes an element the containing block for the fixed-position elements inside
// it. So the overlay filled a box anchored to that wrapper instead of to the
// window, and `.play { overflow: hidden }` clipped whatever hung outside the
// section. Measured on this page: an otherwise identical `position: fixed;
// inset: 0` div lands at (0, 0) appended to <body> and at (0, 1792) appended
// inside `.play__stage`.
//
// It never showed up in Chrome because there the native Fullscreen API
// succeeds and the browser promotes the element to the top layer, where no
// ancestor's containing block applies. On iPadOS every browser is WebKit and
// Firefox has no element fullscreen at all, so it is the only place that ever
// ran the fallback — and there the overlay was off-screen entirely, which is
// the "the whole block disappears" report.
//
// `will-change` is the half worth remembering: `[data-reveal].is-visible` sets
// `transform: none`, but the `will-change` declaration stays, so the containing
// block outlives the animation. Waiting for the reveal to finish would not have
// helped.
//
// A portal is used rather than removing those properties from the wrapper: the
// animation is not this component's to change, the next component to want a
// full-bleed layer would hit the same wall, and "which of my ancestors is
// transformed" is not a question a leaf component can keep answering correctly.
function renderView(fullscreen: boolean, view: ReactNode): ReactNode {
  if (!fullscreen || typeof document === "undefined") return view;
  return createPortal(view, document.body);
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

  // Theater mode full bleed: correct 100vw with documentElement.clientWidth (which already excludes the scrollbar).
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

  // Fullscreen is **this component's own layout** (`.play-view.is-fullscreen`
  // covers the viewport); the native Fullscreen API is a bonus on top -- when it
  // succeeds it also hides the browser's own chrome.
  //
  // The cost of doing it the other way round (letting `:fullscreen` own the
  // layout) was measured: Firefox on iPad cannot enter native fullscreen, so
  // `.play-view` vanished from the layout leaving a blank area, while the only
  // button that could exit sat outside `.play-view` -- on a device with no Esc
  // key there was no way back.
  //
  // But "cover the viewport ourselves" needs one more step, and this component
  // cannot take it in place: see the portal in renderView below.
  //
  // The request to enter native fullscreen is sent in chooseSize, not here: that
  // request has to stay inside the gesture's own event handler (see there).
  // Exiting stays in an effect, because leaving fullscreen is not only the
  // button -- when the browser dismisses it itself, it arrives as the
  // fullscreenchange below.
  useEffect(() => {
    if (size === "fullscreen") return;
    // Only handle the one this component asked for. The game iframe may also
    // request fullscreen for itself (allowFullScreen), which is none of this
    // component's business.
    if (fullscreenElement() === NATIVE_FULLSCREEN_TARGET()) {
      void exitFullscreen().catch(() => {});
    }
  }, [size]);

  // Lock the page behind while covering the viewport. Native fullscreen does this
  // itself, but in a browser without that layer the background keeps scrolling
  // under the overlay -- a finger swipe leaves the game on top still while the
  // site beneath moves, which reads like a broken screen.
  useEffect(() => {
    if (size !== "fullscreen") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [size]);

  // When the user leaves native fullscreen the browser's own way (Esc, a system
  // gesture), sync the mode back.
  // Both event names must be handled: WebKit only sends the prefixed one, and
  // without it the state would stay stuck on fullscreen.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!fullscreenElement() && size === "fullscreen") setSize("normal");
    };
    for (const name of FULLSCREEN_CHANGE_EVENTS) {
      document.addEventListener(name, onFullscreenChange);
    }
    return () => {
      for (const name of FULLSCREEN_CHANGE_EVENTS) {
        document.removeEventListener(name, onFullscreenChange);
      }
    };
  }, [size]);

  // Hand the URL to the iframe only after an explicit enter, so a game connection is not opened the moment the node cards appear.
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
    // The native request is sent here -- **synchronously**, inside the gesture's
    // own event handler.
    //
    // It used to be sent from the `size` effect, but React schedules a passive
    // effect in a separate task after paint, and WebKit only grants fullscreen
    // while it is still handling that gesture, so the request was always too
    // late. Every browser on iPadOS is WebKit, so native fullscreen had in fact
    // never taken effect in any of those three -- the site's own layout simply
    // covered the viewport, which still looked like fullscreen.
    // This is unrelated to the iPad Firefox report; see SR#148 section 13.A.
    // Exiting is not here: leaving fullscreen is not only the button, so that
    // half belongs to the effect above.
    const target = NATIVE_FULLSCREEN_TARGET();
    if (mode === "fullscreen" && fullscreenElement() !== target) {
      requestFullscreen(target).done.catch(() => {
        // If it is refused, let it go: the layout already covers the viewport,
        // so there is no need to undo the mode or say anything -- the only
        // difference is that the browser's own chrome stays on screen.
      });
    }
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

      {renderView(
        size === "fullscreen",
        <div
          className={`play-view${size === "fullscreen" ? " is-fullscreen" : ""}${connected ? " is-connected" : ""}${frameLoading ? " is-loading" : ""}`}
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
            // The exit button must live **inside** .play-view: when covering
            // the viewport this layer sits over everything while the control
            // bar stays back with the launcher, underneath it. A tablet has no
            // Esc key, so a button outside might as well not exist.
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
        </div>,
      )}

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

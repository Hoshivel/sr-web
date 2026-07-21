import { useEffect, useMemo, useState } from "react";
import { useTranslations, type Locale } from "@/i18n/utils";
import type { UIKey } from "@/i18n/ui";
import { MOCK_PLAY, recommendRegion, type PlayRegion } from "@/lib/play";
import "./PlayLauncher.css";

/*
  Play 啟動器（island）—— 官網版分流器。
  fetch `/api/play.json`（mock）→ 列節點（探活 / 延遲 / 負載）→ 選一個 → **iframe 嵌入**
  同源 `/play/session/`（帶 region/host/ping/load 查詢參數；「進入戰場」加 connect=1）。
  契約寫死：真實 Go 分流後端回同形狀時，前端不改（見 `@/lib/play`）。
*/

const API = "/api/play.json";

export default function PlayLauncher({ locale }: { locale: Locale }) {
  const t = useTranslations(locale);
  const [regions, setRegions] = useState<PlayRegion[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(API)
      .then((r) => (r.ok ? (r.json() as Promise<{ regions: PlayRegion[] }>) : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        setRegions(data.regions);
        setSelId(recommendRegion(data.regions)?.id ?? data.regions[0]?.id ?? null);
      })
      .catch(() => {
        // 端點不可用 → 退回內建 mock，UI 照常可展示。
        if (!alive) return;
        setRegions(MOCK_PLAY.regions);
        setSelId(recommendRegion(MOCK_PLAY.regions)?.id ?? null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sel = regions?.find((r) => r.id === selId) ?? null;
  const recommended = useMemo(() => (regions ? recommendRegion(regions) : null), [regions]);

  // 選節點即在 iframe 顯示該節點對戰畫面（idle）；「進入戰場」加 connect=1 → LIVE。
  const src = sel
    ? `${sel.url}?region=${encodeURIComponent(sel.id)}&host=${encodeURIComponent(sel.host)}&ping=${sel.latencyMs}&load=${Math.round(sel.load * 100)}${connected ? "&connect=1" : ""}`
    : undefined;

  const pick = (id: string) => {
    setSelId(id);
    setConnected(false); // 換節點回到待命
  };
  const regionLabel = (r: PlayRegion) => t(`play.region.${r.id}` as UIKey) || r.host;

  return (
    <div className="play-grid">
      {/* 左：分流器 */}
      <div className="play-panel">
        <p className="play-panel__title">{t("play.serversTitle")}</p>
        <ul className="play-nodes" role="listbox" aria-label={t("play.serversTitle")}>
          {!regions && <li className="play-node play-node--skeleton" aria-hidden="true" />}
          {regions?.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                role="option"
                aria-selected={selId === r.id}
                className={`play-node${selId === r.id ? " is-selected" : ""}${r.healthy ? "" : " is-degraded"}`}
                onClick={() => pick(r.id)}
              >
                <span className={`play-node__dot${r.healthy ? "" : " is-degraded"}`} aria-hidden="true" />
                <span className="play-node__id">
                  <b>{regionLabel(r)}</b>
                  <small>{r.host}</small>
                </span>
                <span className="play-node__stat">
                  <span className="play-node__ping">{r.latencyMs}<i>ms</i></span>
                  <span className="play-node__load" aria-hidden="true">
                    <span className="play-node__load-bar" style={{ width: `${Math.round(r.load * 100)}%` }} />
                  </span>
                </span>
                {recommended?.id === r.id && <span className="play-node__rec">{t("play.recommended")}</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="play-actions">
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
        </div>
        <p className="play-note">{t("play.mockNote")}</p>
      </div>

      {/* 右：iframe 對戰視窗 */}
      <div className={`play-view${connected ? " is-connected" : ""}`}>
        {src ? (
          <iframe
            className="play-frame"
            title={sel ? `${regionLabel(sel)} · ${sel.host}` : "session"}
            src={src}
            loading="lazy"
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
    </div>
  );
}

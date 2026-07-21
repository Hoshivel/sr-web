import { useEffect, useRef } from "react";
import type { Application, Container, Sprite, Texture } from "pixi.js";
import { prefersReducedMotion } from "@/lib/motion";

/*
  HexField —— Pixi 程序化「六角戰場」即時展示（Play 對戰頁 iframe 內的畫面核心）。
  無截圖 → 程序化即時渲染：發光六角格盤 ＋ 掃描光束 ＋ 數枚元素單位 token（呼吸/浮動）。
  與遊戲同款渲染器（Pixi 2D WebGL），對應「乾淨向量 / 發光」美學。

  降級與效能（沿用 VoidField 慣例）：
  - reduced-motion → 不啟用（session 頁的靜態六角底襯已足夠）。
  - Pixi 動態 import → 獨立 chunk；WebGL 初始化 try/catch 失敗則靜默退場。
  - 格數 / 單位數依視窗調整、DPR≤2；resize 時重建盤面；離開時 destroy app 與自建貼圖。
*/

type PixiNS = typeof import("pixi.js");
const SQRT3 = Math.sqrt(3);

/** 離屏徑向漸層 → 柔光貼圖（掃描光束 / 單位 token 用）。 */
function makeGlowTexture(PIXI: PixiNS): Texture {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return PIXI.Texture.from(cv);
}

// 平頂六邊形頂點（flat-top），中心 (cx,cy)、半徑 s → 扁平 number[] 供 Graphics.poly。
function hexPoly(cx: number, cy: number, s: number): number[] {
  const p: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    p.push(cx + s * Math.cos(a), cy + s * Math.sin(a));
  }
  return p;
}

const ELEMENT_TINTS = [0x9cc4ff, 0xb89bff, 0xffd479, 0x6ad08a, 0x8fa9ff];

export default function HexField() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let cleanup = () => {};

    void (async () => {
      try {
        const PIXI = await import("pixi.js");
        if (destroyed) return;

        const app: Application = new PIXI.Application();
        await app.init({
          resizeTo: host,
          backgroundAlpha: 0,
          antialias: true,
          powerPreference: "high-performance",
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        });
        if (destroyed) {
          app.destroy(true);
          return;
        }
        host.appendChild(app.canvas);

        const glow = makeGlowTexture(PIXI);

        const gridLayer: Container = new PIXI.Container();
        const unitLayer: Container = new PIXI.Container();
        const scan: Sprite = new PIXI.Sprite(glow);
        scan.anchor.set(0.5);
        scan.tint = 0x8fa9ff;
        scan.blendMode = "add";
        scan.alpha = 0.14;
        app.stage.addChild(gridLayer, scan, unitLayer);

        type Unit = { s: Sprite; hx: number; hy: number; phase: number; amp: number };
        let units: Unit[] = [];
        let board = { x: 0, y: 0, w: 0, h: 0, s: 24 };

        // 依現視窗尺寸重建盤面（格線 + 單位落點 + 掃描範圍）。
        const build = () => {
          const W = app.screen.width;
          const H = app.screen.height;
          if (W < 2 || H < 2) return;
          const C = Math.max(5, Math.min(9, Math.round(W / 72)));
          const R = Math.max(4, Math.min(7, Math.round(H / 60)));
          // s：先由寬度求，再夾到高度
          let s = (W * 0.9) / ((C - 1) * 1.5 + 2);
          const oddOff = C > 1 ? SQRT3 / 2 : 0;
          const hUnits = (R - 1) * SQRT3 + oddOff + SQRT3; // boardH / s
          if (s * hUnits > H * 0.9) s = (H * 0.9) / hUnits;
          const boardW = (C - 1) * 1.5 * s + 2 * s;
          const boardH = s * hUnits;
          const ox = (W - boardW) / 2;
          const oy = (H - boardH) / 2;
          board = { x: ox, y: oy, w: boardW, h: boardH, s };

          // 格線：全部六邊形描邊進單一 Graphics（省 draw call）
          gridLayer.removeChildren().forEach((c) => c.destroy());
          const g = new PIXI.Graphics();
          const centers: { x: number; y: number }[] = [];
          for (let c = 0; c < C; c++) {
            for (let r = 0; r < R; r++) {
              const cx = ox + s + c * 1.5 * s;
              const cy = oy + (SQRT3 / 2) * s + r * SQRT3 * s + (c % 2 ? (SQRT3 / 2) * s : 0);
              centers.push({ x: cx, y: cy });
              g.poly(hexPoly(cx, cy, s * 0.94));
            }
          }
          g.stroke({ width: 1, color: 0x8fa9ff, alpha: 0.22 });
          gridLayer.addChild(g);

          // 單位 token：隨機挑數格放發光子（呼應四英雄元素色）
          unitLayer.removeChildren().forEach((c) => c.destroy());
          units = [];
          const n = Math.min(6, Math.max(3, Math.round(centers.length / 9)));
          const picked = new Set<number>();
          for (let i = 0; i < n; i++) {
            let idx = (Math.random() * centers.length) | 0;
            let guard = 0;
            while (picked.has(idx) && guard++ < 12) idx = (Math.random() * centers.length) | 0;
            picked.add(idx);
            const ctr = centers[idx];
            const sp: Sprite = new PIXI.Sprite(glow);
            sp.anchor.set(0.5);
            sp.tint = ELEMENT_TINTS[(Math.random() * ELEMENT_TINTS.length) | 0];
            sp.blendMode = "add";
            sp.x = ctr.x;
            sp.y = ctr.y;
            sp.scale.set((s * 1.7) / 128);
            unitLayer.addChild(sp);
            units.push({ s: sp, hx: ctr.x, hy: ctr.y, phase: Math.random() * Math.PI * 2, amp: s * 0.16 });
          }

          scan.height = boardH * 1.15;
          scan.width = s * 2.4;
          scan.y = oy + boardH / 2;
        };

        build();
        app.renderer.on("resize", build);

        let t = 0;
        app.ticker.add((ticker) => {
          const dt = Math.min(0.05, ticker.deltaMS / 1000);
          t += dt;
          // 掃描光束：沿盤面左右往復
          const sweep = (Math.sin(t * 0.5) * 0.5 + 0.5); // 0..1
          scan.x = board.x + board.w * sweep;
          scan.alpha = 0.1 + 0.06 * Math.sin(t * 1.3);
          // 單位：上下浮動 + 呼吸
          for (const u of units) {
            u.s.y = u.hy + Math.sin(t * 1.1 + u.phase) * u.amp;
            u.s.alpha = 0.55 + 0.35 * Math.sin(t * 2 + u.phase);
          }
        });

        // 效能：離開視窗或分頁隱藏時暫停 ticker，省 GPU/CPU/電量。
        let onscreen = true;
        let visible = !document.hidden;
        const applyRun = () => {
          if (onscreen && visible) app.ticker.start();
          else app.ticker.stop();
        };
        const io = new IntersectionObserver(
          (entries) => {
            onscreen = entries.some((e) => e.isIntersecting);
            applyRun();
          },
          { threshold: 0 },
        );
        io.observe(host);
        const onVis = () => {
          visible = !document.hidden;
          applyRun();
        };
        document.addEventListener("visibilitychange", onVis);

        cleanup = () => {
          io.disconnect();
          document.removeEventListener("visibilitychange", onVis);
          app.renderer.off("resize", build);
          app.destroy(true, { children: true });
          glow.destroy(true);
        };
      } catch {
        // WebGL 不可用 → 靜默退場，session 頁的靜態六角底襯仍在。
      }
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className="sr-hexfield" aria-hidden="true" />;
}

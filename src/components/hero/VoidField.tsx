import { useEffect, useRef } from "react";
import type { Application, Sprite, Texture } from "pixi.js";
import { prefersReducedMotion } from "@/lib/motion";

/*
  VoidField —— Pixi 程序化虛空（Hero 背景的 WebGL 核心）。
  漂浮發光碎片（◈ 主題的菱形星痕）＋ 星雲柔光 ＋ 游標視差，疊於 Starfield 之下。

  降級與效能：
  - reduced-motion → 完全不啟用（CSS 徑向底 + 靜態 Starfield 已足夠）。
  - 觸控 / 粗指標 → 不綁游標視差。
  - 碎片數依視窗面積調整、有上限；離開時 destroy Pixi app 與自建貼圖。
  - Pixi 以動態 import 載入 → 獨立 chunk，僅在此島（client:visible）注水時抓取。
  - WebGL 初始化以 try/catch 包住，失敗則優雅退場（不影響其餘 Hero）。
*/

type PixiNS = typeof import("pixi.js");

/** 離屏徑向漸層 → 柔光貼圖（星雲用）。 */
function makeGlowTexture(PIXI: PixiNS): Texture {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return PIXI.Texture.from(cv);
}

export default function VoidField() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    // 行動裝置：關閉最重 WebGL —— 窄視窗完全不載入 Pixi（省下整包下載），
    // 仍保留 CSS 徑向底 + Starfield 的環境動態。
    if (window.matchMedia?.("(max-width: 720px)").matches) return;
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

        const W = () => app.screen.width;
        const H = () => app.screen.height;

        // 柔光貼圖 + 碎片模板貼圖（菱形，白色 → 由 tint 上色）
        const glow = makeGlowTexture(PIXI);
        const tpl = new PIXI.Graphics()
          .moveTo(0, -10)
          .lineTo(7, 0)
          .lineTo(0, 10)
          .lineTo(-7, 0)
          .closePath()
          .fill(0xffffff);
        const shardTex = app.renderer.generateTexture(tpl);
        tpl.destroy();

        // --- 星雲：少數大型柔光，additive 疊加做出深邃輝光 ---
        const nebula = new PIXI.Container();
        app.stage.addChild(nebula);
        const nebulaColors = [0x8fa9ff, 0x7a5bff, 0x6ab0ff, 0xb89bff];
        const blobs = nebulaColors.map((c, i) => {
          const s = new PIXI.Sprite(glow);
          s.anchor.set(0.5);
          s.tint = c;
          s.blendMode = "add";
          s.alpha = 0.12;
          s.x = W() * (0.22 + 0.2 * i);
          s.y = H() * (i % 2 === 0 ? 0.32 : 0.7);
          const base = 5 + i;
          s.scale.set(base);
          nebula.addChild(s);
          return { s, phase: Math.random() * Math.PI * 2, base };
        });

        // --- 碎片場（受游標視差平移）---
        const field = new PIXI.Container();
        app.stage.addChild(field);
        const count = Math.max(
          24,
          Math.min(80, Math.round((W() * H()) / 22000)),
        );
        const shardColors = [0xcedaff, 0x8fa9ff, 0xb89bff, 0x6ab0ff];
        const shards = Array.from({ length: count }, () => {
          const z = Math.random(); // 深度：影響大小 / 亮度 / 速度 / 視差
          const s: Sprite = new PIXI.Sprite(shardTex);
          s.anchor.set(0.5);
          s.tint = shardColors[(Math.random() * shardColors.length) | 0];
          s.blendMode = "add";
          s.x = Math.random() * W();
          s.y = Math.random() * H();
          s.rotation = Math.random() * Math.PI;
          s.scale.set(0.25 + z * 0.9);
          field.addChild(s);
          return {
            s,
            z,
            vx: (Math.random() - 0.5) * (6 + z * 14),
            vy: (Math.random() - 0.5) * (6 + z * 14),
            vr: (Math.random() - 0.5) * 0.3,
            tw: Math.random() * Math.PI * 2,
          };
        });

        // --- 游標視差（僅精細指標）---
        const fine = window.matchMedia?.("(pointer: fine)").matches ?? false;
        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        const onMove = (e: MouseEvent) => {
          target.x = e.clientX / window.innerWidth - 0.5;
          target.y = e.clientY / window.innerHeight - 0.5;
        };
        if (fine) window.addEventListener("mousemove", onMove);

        let t = 0;
        app.ticker.add((ticker) => {
          const dt = Math.min(0.05, ticker.deltaMS / 1000);
          t += dt;

          // 視差：碎片場朝游標反向緩移（深度感）
          current.x += (target.x - current.x) * 0.05;
          current.y += (target.y - current.y) * 0.05;
          field.x = -current.x * 42;
          field.y = -current.y * 42;

          const w = W();
          const h = H();
          const m = 24;
          for (const sh of shards) {
            sh.s.x += sh.vx * dt;
            sh.s.y += sh.vy * dt;
            sh.s.rotation += sh.vr * dt;
            if (sh.s.x < -m) sh.s.x = w + m;
            else if (sh.s.x > w + m) sh.s.x = -m;
            if (sh.s.y < -m) sh.s.y = h + m;
            else if (sh.s.y > h + m) sh.s.y = -m;
            sh.s.alpha =
              (0.15 + sh.z * 0.4) * (0.7 + 0.3 * Math.sin(t * 1.5 + sh.tw));
          }
          for (const b of blobs) {
            b.s.scale.set(b.base * (1 + 0.06 * Math.sin(t * 0.3 + b.phase)));
          }
        });

        cleanup = () => {
          if (fine) window.removeEventListener("mousemove", onMove);
          app.destroy(true, { children: true });
          glow.destroy(true);
          shardTex.destroy(true);
        };
      } catch {
        // WebGL 不可用等 → 靜默退場，保留 CSS 底 + Starfield。
      }
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className="sr-voidfield" aria-hidden="true" />;
}

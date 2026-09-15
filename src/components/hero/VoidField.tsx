import { useEffect, useRef } from "react";
import type { Application, Sprite, Texture } from "pixi.js";
import { prefersReducedMotion } from "@/lib/motion";

/*
  VoidField -- the Pixi procedural void (the WebGL core of the hero background).
  Drifting luminous shards (diamond star-marks on the ◈ theme), nebula glow and
  cursor parallax, layered beneath the Starfield.

  Degradation and performance:
  - reduced-motion: not enabled at all (the CSS radial base plus a static
    Starfield is enough).
  - Touch or coarse pointer: no cursor parallax is bound.
  - The shard count scales with viewport area and is capped; on teardown the Pixi
    app and the textures it created are destroyed.
  - Pixi is loaded by dynamic import into its own chunk, fetched only when this
    island (client:visible) hydrates.
  - WebGL initialization is wrapped in try/catch and bows out gracefully on
    failure, leaving the rest of the hero untouched.
*/

type PixiNS = typeof import("pixi.js");

/** An offscreen radial gradient baked into a soft-glow texture (used by the nebulae). */
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
    // Mobile: drop the heaviest WebGL -- a narrow viewport does not load Pixi at
    // all (saving the whole download) while keeping the CSS radial base and the
    // Starfield's ambient motion.
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

        // Soft-glow texture plus the shard stencil texture (a white diamond, colored via tint)
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

        // --- Nebulae: a few large soft glows, additively blended into a deep radiance ---
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

        // --- The shard field (translated by the cursor parallax) ---
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

        // --- Cursor parallax (fine pointers only) ---
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

          // Parallax: the shard field eases away from the cursor, giving a sense of depth
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

        // Performance: pause the ticker when the island leaves the viewport (IntersectionObserver) or the tab is hidden, saving GPU, CPU and battery.
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
          if (fine) window.removeEventListener("mousemove", onMove);
          app.destroy(true, { children: true });
          glow.destroy(true);
          shardTex.destroy(true);
        };
      } catch {
        // WebGL unavailable and similar failures: bow out silently, leaving the CSS base and the Starfield.
      }
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className="sr-voidfield" aria-hidden="true" />;
}

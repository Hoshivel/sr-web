import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/*
  Starfield —— 全幅 canvas 星場，緩慢漂移。
  移植自遊戲 `frontend/src/ui/Starfield.tsx`（sr-web 版：改用共用 reduced-motion 偵測、
  顏色沿用品牌星/連線色 rgba(206,218,255)/rgba(122,162,255)、DPR≤2）。

  interactive：游標半徑內的星連到游標與彼此 —— 純點對點幾何的星座效果。
  canvas 指標穿透（樣式於 Hero 的 `:global(canvas)`），底下 UI 照常可點；游標於 window 追蹤。
  reduced-motion：只畫一張靜態星場，無漂移、無連線。
*/
export default function Starfield({
  interactive = true,
  density = 1,
  className = "",
}: {
  interactive?: boolean;
  density?: number; // 依螢幕面積推得的星數乘數
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();

    type Star = {
      x: number; // 邏輯 px（CSS 像素）
      y: number;
      z: number; // 深度 0..1 → 大小 + 亮度 + 漂移視差
      vx: number; // 漂移速度（px/s）
      vy: number;
      tw: number; // 閃爍相位
    };

    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;

    // 游標以邏輯 px 記錄；-1 代表「離開畫面 / 未知」。
    const pointer = { x: -1, y: -1 };
    const LINK_DIST = 130; // 游標周圍參與連線的半徑（px）

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const seed = () => {
      const area = w * h;
      const count = Math.min(260, Math.round((area / 9000) * density));
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          // 越深（越小）的星漂移越慢 → 細膩視差。
          vx: rand(-1, 1) * (4 + z * 10),
          vy: rand(-1, 1) * (4 + z * 10),
          tw: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = (dt: number, t: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        if (!reduced) {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          // 邊界環繞，星場永不清空。
          if (s.x < -2) s.x = w + 2;
          else if (s.x > w + 2) s.x = -2;
          if (s.y < -2) s.y = h + 2;
          else if (s.y > h + 2) s.y = -2;
        }

        const size = 0.6 + s.z * 1.8;
        const twinkle = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * 0.002 + s.tw);
        const alpha = (0.25 + s.z * 0.6) * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(206, 218, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // 星座：把游標附近的星連到游標與彼此，隨距離淡出。reduced-motion 時略過。
      if (interactive && !reduced && pointer.x >= 0) {
        const near: Star[] = [];
        for (const s of stars) {
          const dx = s.x - pointer.x;
          const dy = s.y - pointer.y;
          if (dx * dx + dy * dy <= LINK_DIST * LINK_DIST) near.push(s);
        }
        for (let i = 0; i < near.length; i++) {
          const a = near[i];
          const da = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          // 游標 → 星
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(a.x, a.y);
          ctx.strokeStyle = `rgba(122, 162, 255, ${(0.5 * (1 - da / LINK_DIST)).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
          // 星 → 鄰星（省算：只跟後面的比）
          for (let j = i + 1; j < near.length; j++) {
            const b = near[j];
            const dd = Math.hypot(a.x - b.x, a.y - b.y);
            if (dd > LINK_DIST) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(122, 162, 255, ${(0.28 * (1 - dd / LINK_DIST)).toFixed(3)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
        // 游標處柔和光暈，錨定星座。
        const halo = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          LINK_DIST * 0.7,
        );
        halo.addColorStop(0, "rgba(122, 162, 255, 0.12)");
        halo.addColorStop(1, "rgba(122, 162, 255, 0)");
        ctx.fillStyle = halo;
        ctx.fillRect(
          pointer.x - LINK_DIST,
          pointer.y - LINK_DIST,
          LINK_DIST * 2,
          LINK_DIST * 2,
        );
      }
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt, now);
      raf = requestAnimationFrame(loop);
    };

    // 游標以 canvas 為基準的相對座標
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -1;
      pointer.y = -1;
    };

    resize();
    window.addEventListener("resize", resize);
    if (interactive && !reduced) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseout", onLeave);
    }

    if (reduced) {
      // 靜態單幀 —— 無動畫迴圈。
      draw(0, 0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [interactive, density]);

  return (
    <canvas
      ref={canvasRef}
      className={`sr-starfield ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

/*
  碎界 sr-web —— 捲動電影框架（單例）。

  一頁只需一個 Lenis 平滑捲動控制器 + 一次 ScrollTrigger 註冊（與 Lenis 同步）；
  各區塊各自建立自己的 ScrollTrigger timeline，共用此處回傳的 gsap / ScrollTrigger。

  降級：reduced-motion → 回傳 null（不啟用 Lenis / 不做 pin/scrub 電影）；
  呼叫端據此略過電影、改以 `[data-reveal]` 靜態呈現。

  Lenis / GSAP 皆由 `motion.ts` 動態 import → 各自 chunk，僅在此 boot 時抓取。
*/

import { prefersReducedMotion, initSmoothScroll, registerScrollTrigger } from "@/lib/motion";
import type { ScrollTriggerBundle } from "@/lib/motion";
import type Lenis from "lenis";

export interface ScrollCinema extends ScrollTriggerBundle {
  lenis: Lenis | null;
}

let booted: Promise<ScrollCinema | null> | null = null;

/**
 * 啟動（或取得已啟動的）捲動電影環境。多次呼叫回傳同一個 promise，
 * 確保 Lenis 只建一次、ScrollTrigger 只註冊/同步一次。
 * @returns reduced-motion 時為 null。
 */
export function bootScrollCinema(): Promise<ScrollCinema | null> {
  if (booted) return booted;
  booted = (async () => {
    if (typeof window === "undefined" || prefersReducedMotion()) return null;
    const { lenis } = await initSmoothScroll();
    const { gsap, ScrollTrigger } = await registerScrollTrigger(lenis);
    return { gsap, ScrollTrigger, lenis };
  })();
  return booted;
}

/*
  碎界 sr-web —— 動效工具（框架無關）。

  設計原則：
  - 一切以 prefers-reduced-motion 為基線；偵測到就降級 / 略過。
  - Lenis / GSAP 以「動態 import」載入 → 各自成 chunk，不進首屏 bundle
    （只有真正呼叫對應函式時才抓取）。
  - 純工具、無隱式副作用；由頁面 / React island 明確呼叫。
*/

import type Lenis from "lenis";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

/** 目前是否偏好減少動態（SSR 安全：伺服器端一律 false）。 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(RM_QUERY).matches
  );
}

export interface ScrollRevealOptions {
  /** 進入視窗的可見比例門檻（0–1）。 */
  threshold?: number;
  /** IntersectionObserver 的 rootMargin（可提前 / 延後觸發）。 */
  rootMargin?: string;
  /** 目標選擇器（預設 `[data-reveal]`）。 */
  selector?: string;
}

/**
 * reveal-on-scroll：元素進入視窗時加上 `.is-visible`（實際過場交給 CSS）。
 * - 同一父層底下的元素依序寫入 `--sr-reveal-i`，達成 stagger 進場。
 * - reduced-motion 或不支援 IntersectionObserver → 立即全部呈現、不建立 observer。
 * @returns cleanup 函式（中止觀察）。
 */
export function initScrollReveal(options: ScrollRevealOptions = {}): () => void {
  if (typeof document === "undefined") return () => {};

  const selector = options.selector ?? "[data-reveal]";
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (els.length === 0) return () => {};

  // stagger：為同一 parent 底下的第 n 個元素寫入序號
  const counters = new WeakMap<Element, number>();
  for (const el of els) {
    if (el.style.getPropertyValue("--sr-reveal-i")) continue;
    const parent = el.parentElement ?? document.body;
    const n = counters.get(parent) ?? 0;
    el.style.setProperty("--sr-reveal-i", String(n));
    counters.set(parent, n + 1);
  }

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    for (const el of els) el.classList.add("is-visible");
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    {
      threshold: options.threshold ?? 0.15,
      rootMargin: options.rootMargin ?? "0px 0px -10% 0px",
    },
  );
  for (const el of els) io.observe(el);
  return () => io.disconnect();
}

export interface MagneticOptions {
  /** 目標選擇器（預設 `[data-magnetic]`）。 */
  selector?: string;
  /** 位移強度（游標偏移量的比例，0–1）。 */
  strength?: number;
  /** 觸發半徑外的最大位移夾限（px）。 */
  max?: number;
}

/**
 * 磁吸按鈕：游標在元素上時，元素朝游標方向微幅位移（ease-back 交給 CSS transition）。
 * - reduced-motion 或非精細指標（觸控）→ 不啟用。
 * - 位移以 inline transform 表現；離開時清除。
 * @returns cleanup 函式。
 */
export function initMagnetic(options: MagneticOptions = {}): () => void {
  if (typeof document === "undefined" || prefersReducedMotion()) return () => {};
  // 觸控裝置沒有懸停語意，跳過（同時省效能）
  if (window.matchMedia && !window.matchMedia("(pointer: fine)").matches) {
    return () => {};
  }

  const selector = options.selector ?? "[data-magnetic]";
  const strength = options.strength ?? 0.3;
  const max = options.max ?? 18;
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (els.length === 0) return () => {};

  const clamp = (v: number) => Math.max(-max, Math.min(max, v));
  const cleanups: Array<() => void> = [];

  for (const el of els) {
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = clamp((e.clientX - (r.left + r.width / 2)) * strength);
      const dy = clamp((e.clientY - (r.top + r.height / 2)) * strength);
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    };
    const onLeave = () => {
      el.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    });
  }

  return () => {
    for (const c of cleanups) c();
  };
}

export interface SmoothScrollHandle {
  /** 底層 Lenis 實例（reduced-motion 時為 null，維持原生捲動）。 */
  lenis: Lenis | null;
  /** 停止 rAF 迴圈並銷毀 Lenis。 */
  destroy(): void;
}

/**
 * Lenis 平滑捲動：旗艦網站「順滑感」的來源。
 * - reduced-motion → 不啟用（回傳空 handle，保留原生捲動）。
 * - 動態 import → Lenis 獨立成 chunk。
 * 供 Phase 3 捲動電影啟用。
 */
export async function initSmoothScroll(): Promise<SmoothScrollHandle> {
  if (typeof window === "undefined" || prefersReducedMotion()) {
    return { lenis: null, destroy() {} };
  }

  const { default: LenisCtor } = await import("lenis");
  const lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true });

  let frame = requestAnimationFrame(function raf(time: number) {
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  });

  return {
    lenis,
    destroy() {
      cancelAnimationFrame(frame);
      lenis.destroy();
    },
  };
}

export interface ScrollTriggerBundle {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
}

/**
 * 註冊 GSAP + ScrollTrigger，並（若提供）與 Lenis 同步時間軸。
 * - 動態 import → GSAP 獨立成 chunk。
 * - 供 Phase 3 pinned / scrub 捲動電影建立 timeline。
 */
export async function registerScrollTrigger(
  lenis?: Lenis | null,
): Promise<ScrollTriggerBundle> {
  const { gsap } = await import("gsap");
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time: number) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  return { gsap, ScrollTrigger };
}

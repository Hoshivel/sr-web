import { useEffect, useState } from "react";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * React hook：訂閱 `prefers-reduced-motion`，偏好變動時觸發 re-render。
 * 初值固定 false 以對齊 SSR，避免注水（hydration）不一致；
 * 掛載後於 effect 內讀取真實值並持續監聽。
 * 供 Phase 2+ 的 Pixi / Starfield island 決定是否降級。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(RM_QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

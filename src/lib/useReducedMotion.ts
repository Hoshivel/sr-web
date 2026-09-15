import { useEffect, useState } from "react";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * React hook: subscribe to `prefers-reduced-motion` and re-render when the
 * preference changes.
 * The initial value is fixed at false to match SSR and avoid a hydration
 * mismatch; the real value is read inside an effect after mount, which then keeps
 * listening.
 * Used by the Phase 2+ Pixi and Starfield islands to decide whether to degrade.
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

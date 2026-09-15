/*
  Shattered Realms sr-web -- motion helpers (framework-agnostic).

  Design principles:
  - prefers-reduced-motion is the baseline throughout; when set, degrade or skip.
  - Lenis and GSAP are loaded by dynamic import, so each becomes its own chunk and
    stays out of the first-paint bundle (fetched only when the matching function
    is actually called).
  - Pure helpers with no implicit side effects; pages and React islands call them
    explicitly.
*/

import type Lenis from "lenis";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

/** Whether reduced motion is currently preferred (SSR-safe: always false on the server). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(RM_QUERY).matches
  );
}

export interface ScrollRevealOptions {
  /** Visible-ratio threshold for entering the viewport (0-1). */
  threshold?: number;
  /** IntersectionObserver rootMargin (fires earlier or later). */
  rootMargin?: string;
  /** Target selector (defaults to `[data-reveal]`). */
  selector?: string;
}

/**
 * reveal-on-scroll: add `.is-visible` as an element enters the viewport (CSS owns
 * the actual transition).
 * - Elements under the same parent get an increasing `--sr-reveal-i`, which
 *   staggers their entrance.
 * - Reduced motion, or no IntersectionObserver support, shows everything
 *   immediately and creates no observer.
 * @returns cleanup function (stops observing).
 */
export function initScrollReveal(options: ScrollRevealOptions = {}): () => void {
  if (typeof document === "undefined") return () => {};

  const selector = options.selector ?? "[data-reveal]";
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (els.length === 0) return () => {};

  // Stagger: record the ordinal of the nth element under the same parent
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
  /** Target selector (defaults to `[data-magnetic]`). */
  selector?: string;
  /** Displacement strength (a fraction of the cursor offset, 0-1). */
  strength?: number;
  /** Clamp on the maximum displacement outside the trigger radius (px). */
  max?: number;
}

/**
 * Magnetic buttons: while the cursor is over the element, it shifts slightly
 * toward the cursor (the ease-back is left to a CSS transition).
 * - Not enabled under reduced motion or a coarse pointer (touch).
 * - The displacement is an inline transform, cleared on leave.
 * @returns cleanup function.
 */
export function initMagnetic(options: MagneticOptions = {}): () => void {
  if (typeof document === "undefined" || prefersReducedMotion()) return () => {};
  // Touch devices have no hover semantics, so skip (and save the work)
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
  /** The underlying Lenis instance (null under reduced motion, leaving native scrolling). */
  lenis: Lenis | null;
  /** Stop the rAF loop and destroy Lenis. */
  destroy(): void;
}

/**
 * Lenis smooth scrolling: where the flagship site's sense of glide comes from.
 * - Under reduced motion it is not enabled (returns an empty handle, keeping
 *   native scrolling).
 * - Dynamic import keeps Lenis in its own chunk.
 * Enabled by the Phase 3 scroll cinema.
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
 * Register GSAP and ScrollTrigger, syncing the timeline with Lenis when one is
 * supplied.
 * - Dynamic import keeps GSAP in its own chunk.
 * - Used by the Phase 3 pinned and scrub scroll cinema to build timelines.
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

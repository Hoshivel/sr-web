/*
  Shattered Realms sr-web -- the scroll cinema framework (a singleton).

  One page needs only a single Lenis smooth-scroll controller and one
  ScrollTrigger registration synced with it; each section builds its own
  ScrollTrigger timeline on the shared gsap / ScrollTrigger returned from here.

  Degradation: under reduced motion this returns null (no Lenis, no pin/scrub
  cinema), and callers use that to skip the cinema and fall back to the static
  `[data-reveal]` presentation.

  Both Lenis and GSAP are dynamically imported by `motion.ts` into their own
  chunks, fetched only during this boot.
*/

import { prefersReducedMotion, initSmoothScroll, registerScrollTrigger } from "@/lib/motion";
import type { ScrollTriggerBundle } from "@/lib/motion";
import type Lenis from "lenis";

export interface ScrollCinema extends ScrollTriggerBundle {
  lenis: Lenis | null;
}

let booted: Promise<ScrollCinema | null> | null = null;

/**
 * Smooth scrolling for in-page anchors: intercept clicks on `a[href^="#"]` and
 * let Lenis glide to the target instead.
 * When the target does not exist (a section that has not been built yet), the
 * click is not intercepted and native behavior applies.
 */
function wireAnchorScroll(lenis: Lenis): void {
  document.addEventListener("click", (e) => {
    const anchor = (e.target as HTMLElement | null)?.closest?.(
      'a[href^="#"]',
    ) as HTMLAnchorElement | null;
    if (!anchor) return;
    const hash = anchor.getAttribute("href");
    if (!hash || hash === "#") return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target as HTMLElement);
    history.pushState(null, "", hash);
  });
}

/**
 * Boot (or retrieve the already-booted) scroll cinema environment. Repeated calls
 * return the same promise, so Lenis is constructed once, ScrollTrigger registered
 * and synced once, and the anchor handler attached once.
 * @returns null under reduced motion.
 */
export function bootScrollCinema(): Promise<ScrollCinema | null> {
  if (booted) return booted;
  booted = (async () => {
    if (typeof window === "undefined" || prefersReducedMotion()) return null;
    const { lenis } = await initSmoothScroll();
    const { gsap, ScrollTrigger } = await registerScrollTrigger(lenis);
    if (lenis) wireAnchorScroll(lenis);
    return { gsap, ScrollTrigger, lenis };
  })();
  return booted;
}

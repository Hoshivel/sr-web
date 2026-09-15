import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, type Locale } from "@/i18n/utils";
import type { UIKey } from "@/i18n/ui";
import { prefersReducedMotion } from "@/lib/motion";
import "./ShatteredTree.css";

/*
  The Shattered Realms Tree -- the site version (adapted from the game's
  `ui/meta/Entry.tsx`).
  Its proper name is the Shattered Realms Tree: it belongs to Shattered Realms
  itself and is not a generic world tree.

  It reuses the soul of the game's tree: nodes drift through the star current on a
  spring-damper simulation and can be grabbed and thrown, with curved swaying
  branches and root tendrils drifting along, and a formation coupling that makes
  the whole tree sway together like a loose flight.

  Adapted for the site:
  - Backend, store and account dependencies removed, making it a self-contained
    island with static chapter data and copy from sr-web's i18n.
  - **Seed-deterministic layout** (rather than the game's re-roll on every visit),
    so SSR and client agree and there is no hydration mismatch.
  - **Responsive**: the physics runs in a 600x480 design space (the viewBox);
    nodes are positioned in percentages while branches use viewBox units that the
    SVG scales automatically, and drag input is converted back into design units
    using the stage's real width.
  - **Chapter mood morph**: hovering or selecting a node transitions the whole
    section's `--wt-accent` smoothly between ice blue and star violet.
  - reduced-motion: a static tree with no physics or dragging (a tap still opens
    the chapter card).
*/

// The design coordinate space (the viewBox center is the origin)
const DW = 600;
const DH = 480;
const BOUND_X = 250; // 節點偏移可及範圍（留邊給節點與標籤）
const BOUND_Y = 190;

// Node physics (a soft spring, in 1/s^2 and 1/s): underdamped, giving continuous
// elasticity rather than jitter.
// LINK_K couples the nodes' offsets so the tree drifts together like a loose flight.
const SPRING_K = 4.5;
const SPRING_C = 2.2;
const LINK_K = 1.1;

type Status = "root" | "live" | "soon";
interface Chapter {
  id: "shattered" | "snowpass" | "starseal";
  glyph: string;
  accent: string;
  status: Status;
}
// Three nodes: 碎界 ◈ (the origin and root) -> 風雪過境 ❄ (chapter one, live) -> 星痕紀元 ✶ (chapter two, coming).
const CHAPTERS: readonly Chapter[] = [
  { id: "shattered", glyph: "◈", accent: "#8fa9ff", status: "root" },
  { id: "snowpass", glyph: "❄", accent: "#7fd0ff", status: "live" },
  { id: "starseal", glyph: "✶", accent: "#b48dff", status: "soon" },
] as const;

interface Phys {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
interface Branch {
  a: number;
  b: number;
  bend: number;
  phase: number;
  weave: boolean;
}
interface Tendril {
  node: number;
  dx: number;
  dy: number;
  bend: number;
}

// A deterministic PRNG (mulberry32), so the layout can be picked up cold and SSR and client agree.
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// layoutTree grows the tree: anchors climb a winding trunk (seed-deterministic),
// adjacent nodes are joined by curved branches, later nodes weave back to earlier
// ones, and each node puts out two root tendrils.
function layoutTree(n: number, seed: number) {
  const rng = makeRng(seed);
  const rnd = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const anchors: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = Math.sin(t * Math.PI * 1.35 + 0.6) * 150 + (t - 0.5) * 110 + rnd(-38, 38);
    const y = 150 - t * 300 + rnd(-30, 30);
    anchors.push({
      x: clampTo(x, -BOUND_X + 40, BOUND_X - 40),
      y: clampTo(y, -BOUND_Y + 36, BOUND_Y - 36),
    });
  }
  const branches: Branch[] = [];
  for (let i = 0; i + 1 < n; i++) {
    branches.push({ a: i, b: i + 1, bend: rnd(26, 50) * (i % 2 ? -1 : 1), phase: rnd(0, Math.PI * 2), weave: false });
  }
  for (let i = 2; i < n; i++) {
    branches.push({ a: i - 2, b: i, bend: rnd(-70, 70), phase: rnd(0, Math.PI * 2), weave: true });
  }
  const tendrils: Tendril[] = [];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 2; k++) {
      const ang = rnd(0, Math.PI * 2);
      const len = rnd(40, 72);
      tendrils.push({ node: i, dx: Math.cos(ang) * len, dy: Math.sin(ang) * len, bend: rnd(-24, 24) });
    }
  }
  return { anchors, branches, tendrils };
}

// One curved branch: the control point bows out along the segment's normal (bend) and eases back and forth over time (sway).
function branchPath(x1: number, y1: number, x2: number, y2: number, bend: number, sway: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const c = bend + sway;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${(mx + nx * c).toFixed(1)} ${(my + ny * c).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

// viewBox coordinates to stage percentages (nodes are positioned with left/top%, so they stay aligned with the branches as the stage scales).
const pctX = (x: number) => ((x + DW / 2) / DW) * 100;
const pctY = (y: number) => ((y + DH / 2) / DH) * 100;

export default function ShatteredTree({ locale, seed = 0x0ceed }: { locale: Locale; seed?: number }) {
  const t = useTranslations(locale);
  const [sel, setSel] = useState<Chapter["id"] | null>(null);
  const [hover, setHover] = useState<Chapter["id"] | null>(null);

  const { anchors, branches, tendrils } = useMemo(() => layoutTree(CHAPTERS.length, seed), [seed]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const branchRefs = useRef<(SVGPathElement | null)[]>([]);
  const tendrilRefs = useRef<(SVGPathElement | null)[]>([]);
  const physRef = useRef<Phys[]>([]);
  const dragRef = useRef<{ i: number; sx: number; sy: number; lx: number; ly: number; lt: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const clampNode = (p: Phys, bx: number, by: number, bounce: boolean) => {
    const minX = -BOUND_X - bx;
    const maxX = BOUND_X - bx;
    const minY = -BOUND_Y - by;
    const maxY = BOUND_Y - by;
    if (p.x < minX || p.x > maxX) {
      p.x = clampTo(p.x, minX, maxX);
      if (bounce) p.vx *= -0.35;
    }
    if (p.y < minY || p.y > maxY) {
      p.y = clampTo(p.y, minY, maxY);
      if (bounce) p.vy *= -0.35;
    }
  };

  // The physics loop: integrate each frame and write the DOM directly (node left/top%, branch and tendril path d), bypassing React state.
  useEffect(() => {
    const reduced = prefersReducedMotion();
    physRef.current = anchors.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));

    // Draw one static frame first (the final look under reduced motion; otherwise the base beneath the rAF loop).
    const draw = (tt: number) => {
      const ph = physRef.current;
      const pos = ph.map((p, i) => ({ x: anchors[i].x + p.x, y: anchors[i].y + p.y }));
      pos.forEach((pt, i) => {
        const el = nodeRefs.current[i];
        if (el) {
          el.style.left = `${pctX(pt.x).toFixed(3)}%`;
          el.style.top = `${pctY(pt.y).toFixed(3)}%`;
        }
      });
      branches.forEach((br, k) => {
        const el = branchRefs.current[k];
        if (!el) return;
        const sway = reduced ? 0 : Math.sin(tt * 0.35 + br.phase) * 8;
        el.setAttribute("d", branchPath(pos[br.a].x, pos[br.a].y, pos[br.b].x, pos[br.b].y, br.bend, sway));
      });
      tendrils.forEach((td, k) => {
        const el = tendrilRefs.current[k];
        if (!el) return;
        const r = pos[td.node];
        const sway = reduced ? 0 : Math.sin(tt * 0.3 + k * 1.9) * 4;
        el.setAttribute("d", branchPath(r.x, r.y, r.x + td.dx + sway, r.y + td.dy - sway, td.bend, 0));
      });
    };

    if (reduced) {
      draw(0);
      return;
    }

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
      last = now;
      const tt = now / 1000;
      const ph = physRef.current;
      const dragging = dragRef.current?.i ?? -1;
      for (let i = 0; i < ph.length; i++) {
        if (i === dragging) continue; // 被抓的節點跟隨指標
        const p = ph[i];
        const tx = Math.sin(tt * 0.19 + i) * 9 + Math.sin(tt * 0.31 + i * 2.1) * 6 + Math.sin(tt * 0.53 + i * 4.7) * 2.5;
        const ty = Math.cos(tt * 0.16 + i) * 7 + Math.cos(tt * 0.27 + i * 1.7) * 5 + Math.cos(tt * 0.47 + i * 3.9) * 2;
        let fx = SPRING_K * (tx - p.x) - SPRING_C * p.vx;
        let fy = SPRING_K * (ty - p.y) - SPRING_C * p.vy;
        for (let j = 0; j < ph.length; j++) {
          if (j === i) continue;
          fx += LINK_K * (ph[j].x - p.x);
          fy += LINK_K * (ph[j].y - p.y);
        }
        p.vx += fx * dt;
        p.vy += fy * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        clampNode(p, anchors[i].x, anchors[i].y, true);
      }
      draw(tt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchors, branches, tendrils]);

  // Grab and throw: while held, a node follows the pointer 1:1; on release it keeps its momentum and the spring pulls it back. Not enabled under reduced motion.
  const scaleAt = () => {
    const w = stageRef.current?.getBoundingClientRect().width ?? DW;
    return w / DW; // px → 設計單位：除以此值
  };
  const onDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion()) return;
    suppressClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { i, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false };
  };
  const onMove = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.i !== i) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - d.lt) / 1000;
    const s = scaleAt();
    const dx = (e.clientX - d.lx) / s; // px → 設計單位
    const dy = (e.clientY - d.ly) / s;
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.lt = now;
    const p = physRef.current[i];
    if (!p) return;
    p.x += dx;
    p.y += dy;
    p.vx = p.vx * 0.5 + (dx / dt) * 0.5;
    p.vy = p.vy * 0.5 + (dy / dt) * 0.5;
    clampNode(p, anchors[i].x, anchors[i].y, false);
  };
  const onUp = () => {
    if (dragRef.current?.moved) suppressClick.current = true;
    dragRef.current = null;
  };

  const selected = CHAPTERS.find((c) => c.id === sel) ?? null;
  // Chapter mood: the element color of the active node (selection outranks hover) drives the section's --wt-accent, transitioned smoothly by CSS.
  const active = CHAPTERS.find((c) => c.id === (sel ?? hover)) ?? null;
  const statusKey = (s: Status): UIKey =>
    s === "root" ? "chapters.status.root" : s === "live" ? "chapters.status.live" : "chapters.status.soon";

  return (
    <div ref={stageRef} className="wt-stage" style={{ "--wt-accent": active?.accent ?? "#8fa9ff" } as React.CSSProperties}>
      <svg className="wt-lines" viewBox={`${-DW / 2} ${-DH / 2} ${DW} ${DH}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        {tendrils.map((_, k) => (
          <path key={`td-${k}`} ref={(el) => { tendrilRefs.current[k] = el; }} className="wt-branch wt-tendril" d={branchPath(anchors[tendrils[k].node].x, anchors[tendrils[k].node].y, anchors[tendrils[k].node].x + tendrils[k].dx, anchors[tendrils[k].node].y + tendrils[k].dy, tendrils[k].bend, 0)} />
        ))}
        {branches.map((br, k) => (
          <path key={`br-${k}`} ref={(el) => { branchRefs.current[k] = el; }} className={`wt-branch${br.weave ? " wt-weave" : ""}`} d={branchPath(anchors[br.a].x, anchors[br.a].y, anchors[br.b].x, anchors[br.b].y, br.bend, 0)} />
        ))}
      </svg>

      {CHAPTERS.map((c, i) => (
        <button
          key={c.id}
          ref={(el) => { nodeRefs.current[i] = el; }}
          className={`wt-node wt-node--${c.status}${sel === c.id ? " is-selected" : ""}`}
          style={{ left: `${pctX(anchors[i].x).toFixed(3)}%`, top: `${pctY(anchors[i].y).toFixed(3)}%`, "--el": c.accent } as React.CSSProperties}
          aria-label={`${t(`theme.${c.id}.name` as UIKey)} — ${t(statusKey(c.status))}`}
          onPointerDown={onDown(i)}
          onPointerMove={onMove(i)}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerEnter={() => setHover(c.id)}
          onPointerLeave={() => setHover((h) => (h === c.id ? null : h))}
          onClick={() => {
            if (suppressClick.current) { suppressClick.current = false; return; }
            setSel((s) => (s === c.id ? null : c.id));
          }}
        >
          <span className="wt-node-glyph" aria-hidden="true">{c.glyph}</span>
          <span className="wt-node-name">{t(`theme.${c.id}.name` as UIKey)}</span>
        </button>
      ))}

      {selected && (
        <div className={`wt-detail wt-detail--${selected.status}`} role="region" aria-label={t(`theme.${selected.id}.name` as UIKey)} style={{ "--el": selected.accent } as React.CSSProperties}>
          <button className="wt-detail-close" onClick={() => setSel(null)} aria-label={t("chapters.close")}>✕</button>
          <div className="wt-detail-head">
            <span className="wt-detail-glyph" aria-hidden="true">{selected.glyph}</span>
            <div>
              <div className="wt-detail-kicker">{t(`theme.${selected.id}.kicker` as UIKey)}</div>
              <div className="wt-detail-name">{t(`theme.${selected.id}.name` as UIKey)}</div>
            </div>
          </div>
          <p className="wt-detail-tagline">{t(`theme.${selected.id}.tagline` as UIKey)}</p>
          <p className="wt-detail-story">{t(`theme.${selected.id}.story` as UIKey)}</p>
          <span className={`wt-status wt-status--${selected.status}`}>{t(statusKey(selected.status))}</span>
        </div>
      )}
    </div>
  );
}

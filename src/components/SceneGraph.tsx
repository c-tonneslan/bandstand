"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import type { GraphEdge, GraphNode } from "@/lib/graph";

// Hand-rolled force layout on a 2D canvas. No physics lib — pairwise repulsion
// (O(n²) is fine at ~64 nodes), spring attraction along edges, gentle centering.
// We anneal for a couple seconds then STOP the RAF loop; drag reheats it.

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Palette {
  accent: string;
  accentEmphasis: string;
  surface: string;
  foreground: string;
  muted: string;
  line: string;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback;
  return {
    accent: get("--accent", "#8f6212"),
    accentEmphasis: get("--accent-emphasis", "#a8791f"),
    surface: get("--surface", "#fbf9f2"),
    foreground: get("--foreground", "#191a1f"),
    muted: get("--muted", "#5b5a52"),
    line: get("--line", "#d9d5c9"),
  };
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h || "888888", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Blend two token hexes in sRGB — used for the single-hue sequential node fill.
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

const CANVAS_LABEL_FONT = "italic 13px Georgia, 'Times New Roman', serif";

export default function SceneGraph({
  nodes: rawNodes,
  edges: rawEdges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!canvas || !wrap || !tip) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Graph data is static (server-computed), so the effect runs once.
    const srcNodes = rawNodes;
    const srcEdges = rawEdges;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let palette = readPalette();

    // Degree domain for radius + sequential fill.
    const degrees = srcNodes.map((n) => n.degree);
    const minDeg = Math.min(...degrees);
    const maxDeg = Math.max(...degrees);
    const maxWeight = Math.max(1, ...srcEdges.map((e) => e.weight));
    const sqrtMin = Math.sqrt(Math.max(0, minDeg));
    const sqrtSpan = Math.max(0.001, Math.sqrt(maxDeg) - sqrtMin);
    const radiusOf = (deg: number) =>
      4 + ((Math.sqrt(Math.max(0, deg)) - sqrtMin) / sqrtSpan) * 12;
    // Faint accent over surface at low degree, full accent at the hubs.
    const fillOf = (deg: number) => {
      const t = maxDeg === minDeg ? 1 : (deg - minDeg) / (maxDeg - minDeg);
      return mix(palette.surface, palette.accent, 0.25 + 0.75 * t);
    };

    let width = wrap.clientWidth || 640;
    let height = width < 640 ? 460 : Math.min(640, Math.round(width * 0.68));

    // Circular seed so the anneal starts spread out.
    const nodes: SimNode[] = srcNodes.map((n, i) => {
      const a = (i / srcNodes.length) * Math.PI * 2;
      const rad = Math.min(width, height) * 0.36;
      return {
        ...n,
        x: width / 2 + Math.cos(a) * rad,
        y: height / 2 + Math.sin(a) * rad,
        vx: 0,
        vy: 0,
        r: radiusOf(n.degree),
      };
    });
    const index = new Map(nodes.map((n, i) => [n.slug, i]));

    interface SimEdge {
      a: number;
      b: number;
      weight: number;
      rest: number;
    }
    const edges: SimEdge[] = [];
    for (const e of srcEdges) {
      const a = index.get(e.a);
      const b = index.get(e.b);
      if (a === undefined || b === undefined) continue;
      // Higher weight => shorter rest length => co-players sit closer.
      const rest = Math.max(34, 120 - e.weight * 12);
      edges.push({ a, b, weight: e.weight, rest });
    }

    // slug -> set of neighbor slugs, for the hover highlight.
    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n.slug, new Set());
    for (const e of srcEdges) {
      adjacency.get(e.a)?.add(e.b);
      adjacency.get(e.b)?.add(e.a);
    }

    const hubSlugs = new Set(
      [...srcNodes]
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 8)
        .map((n) => n.slug),
    );

    const REPEL = 5200;
    const SPRING = 0.045;
    const GRAVITY = 0.028;
    const FRICTION = 0.86;

    let dragging: SimNode | null = null;
    let hovered: SimNode | null = null;

    function tick(alpha: number) {
      const cx = width / 2;
      const cy = height / 2;
      for (const n of nodes) {
        n.vx = 0;
        n.vy = 0;
      }
      // Repulsion (naive pairwise).
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 0.01;
          }
          const d = Math.sqrt(d2);
          const f = REPEL / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // Springs along edges.
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - e.rest) * SPRING;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // Centering gravity + integrate.
      for (const n of nodes) {
        if (n === dragging) continue;
        n.vx += (cx - n.x) * GRAVITY;
        n.vy += (cy - n.y) * GRAVITY;
        n.x += n.vx * FRICTION * alpha;
        n.y += n.vy * FRICTION * alpha;
        n.x = Math.max(n.r + 2, Math.min(width - n.r - 2, n.x));
        n.y = Math.max(n.r + 2, Math.min(height - n.r - 2, n.y));
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const active = hovered
        ? new Set<string>([hovered.slug, ...(adjacency.get(hovered.slug) ?? [])])
        : null;

      // Edges under nodes, recessive.
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const wt = e.weight / maxWeight;
        const lit = active ? active.has(a.slug) && active.has(b.slug) : false;
        if (active && !lit) {
          ctx!.globalAlpha = 0.12;
          ctx!.strokeStyle = palette.line;
          ctx!.lineWidth = 0.6;
        } else if (lit) {
          ctx!.globalAlpha = 0.9;
          ctx!.strokeStyle = palette.accentEmphasis;
          ctx!.lineWidth = 1 + wt * 2.2;
        } else {
          ctx!.globalAlpha = 0.15 + wt * 0.35;
          ctx!.strokeStyle = palette.line;
          ctx!.lineWidth = 0.6 + wt * 1.8;
        }
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }

      // Nodes.
      for (const n of nodes) {
        const on = !active || active.has(n.slug);
        ctx!.globalAlpha = active ? (on ? 1 : 0.13) : 1;
        ctx!.fillStyle = active && on ? palette.accentEmphasis : fillOf(n.degree);
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();
        if (active && on) {
          ctx!.lineWidth = 1.5;
          ctx!.strokeStyle = palette.accentEmphasis;
          ctx!.stroke();
        }
      }

      // Labels in TEXT tokens only. Hubs always; others on hover.
      ctx!.font = CANVAS_LABEL_FONT;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";
      for (const n of nodes) {
        const isHub = hubSlugs.has(n.slug);
        const on = !active || active.has(n.slug);
        if (!isHub && !(active && on)) continue;
        ctx!.globalAlpha = active ? (on ? 1 : 0.1) : 0.92;
        ctx!.fillStyle = active && on ? palette.foreground : palette.muted;
        ctx!.fillText(n.name, n.x, n.y + n.r + 3);
      }
      ctx!.globalAlpha = 1;
    }

    function resize() {
      width = wrap!.clientWidth || 640;
      height = width < 640 ? 460 : Math.min(640, Math.round(width * 0.68));
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let raf = 0;
    let alpha = 1;
    let running = false;

    function loop() {
      tick(alpha);
      alpha *= 0.97;
      draw();
      if (alpha > 0.02) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    function anneal(from: number) {
      alpha = from;
      if (reduceMotion) {
        let a = from;
        for (let i = 0; i < 480 && a > 0.02; i++) {
          tick(a);
          a *= 0.96;
        }
        draw();
        return;
      }
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }

    resize();
    anneal(1);

    // --- Pointer / interaction ---
    function toLocal(clientX: number, clientY: number): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    }
    function nodeAt(x: number, y: number): SimNode | null {
      // Reverse so top-drawn (later) nodes win; all same layer so any order ok.
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) return n;
      }
      return null;
    }

    function showTip(n: SimNode, lx: number, ly: number) {
      tip!.textContent = `${n.name} · ${n.degree} collaborator${n.degree === 1 ? "" : "s"} · ${n.nights} night${n.nights === 1 ? "" : "s"}`;
      tip!.style.display = "block";
      const tx = Math.min(lx + 12, width - tip!.offsetWidth - 4);
      const ty = Math.max(4, ly - tip!.offsetHeight - 10);
      tip!.style.left = `${Math.max(4, tx)}px`;
      tip!.style.top = `${ty}px`;
    }
    function hideTip() {
      tip!.style.display = "none";
    }

    let downNode: SimNode | null = null;
    let downX = 0;
    let downY = 0;
    let moved = false;

    function onPointerMove(ev: PointerEvent) {
      const [x, y] = toLocal(ev.clientX, ev.clientY);
      if (dragging) {
        moved = true;
        dragging.x = Math.max(dragging.r, Math.min(width - dragging.r, x));
        dragging.y = Math.max(dragging.r, Math.min(height - dragging.r, y));
        dragging.vx = 0;
        dragging.vy = 0;
        showTip(dragging, x, y);
        if (reduceMotion) {
          // Bounded resettle so the rest of the graph reacts to the drag.
          let a = 0.35;
          for (let i = 0; i < 60 && a > 0.02; i++) {
            tick(a);
            a *= 0.94;
          }
          draw();
        }
        return;
      }
      const hit = nodeAt(x, y);
      canvas!.style.cursor = hit ? "pointer" : "default";
      if (hit !== hovered) {
        hovered = hit;
        draw();
      }
      if (hit) showTip(hit, x, y);
      else hideTip();
    }

    function onPointerDown(ev: PointerEvent) {
      const [x, y] = toLocal(ev.clientX, ev.clientY);
      const hit = nodeAt(x, y);
      downNode = hit;
      downX = x;
      downY = y;
      moved = false;
      if (hit) {
        dragging = hit;
        hovered = hit;
        canvas!.setPointerCapture(ev.pointerId);
        draw();
      }
    }

    function onPointerUp(ev: PointerEvent) {
      const [x, y] = toLocal(ev.clientX, ev.clientY);
      const wasDrag = moved && Math.hypot(x - downX, y - downY) > 4;
      if (dragging) {
        canvas!.releasePointerCapture?.(ev.pointerId);
        dragging = null;
        if (wasDrag) anneal(0.5);
      }
      if (!wasDrag && downNode) {
        router.push(`/artists/${downNode.slug}`);
      }
      downNode = null;
    }

    function onPointerLeave() {
      if (dragging) return;
      hovered = null;
      hideTip();
      canvas!.style.cursor = "default";
      draw();
    }

    function onKeyDown(ev: KeyboardEvent) {
      if ((ev.key === "Enter" || ev.key === " ") && hovered) {
        ev.preventDefault();
        router.push(`/artists/${hovered.slug}`);
      }
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("keydown", onKeyDown);

    const ro = new ResizeObserver(() => {
      const prevW = width;
      const prevH = height;
      resize();
      if (prevW && prevH && (prevW !== width || prevH !== height)) {
        const sx = width / prevW;
        const sy = height / prevH;
        for (const n of nodes) {
          n.x *= sx;
          n.y *= sy;
        }
        draw();
      }
    });
    ro.observe(wrap);

    // Repaint with fresh token hexes on light/dark flip (mirror Map.tsx).
    const obs = new MutationObserver(() => {
      palette = readPalette();
      draw();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("keydown", onKeyDown);
      ro.disconnect();
      obs.disconnect();
    };
    // Static data + stable router: set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full border-2 border-foreground">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Force-directed graph of Philadelphia jazz musicians who share a bandstand. Each dot is a player, sized by how many collaborators they have; lines connect players who have been on the same bill. The list of biggest hubs below is a text equivalent."
        className="block w-full touch-none select-none"
      />
      <div
        ref={tipRef}
        aria-hidden
        className="pointer-events-none absolute z-10 hidden max-w-[220px] rounded-[--radius] border border-line bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-[--shadow-card]"
        style={{ display: "none" }}
      />
    </div>
  );
}

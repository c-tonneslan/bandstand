"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

import { TAG_COLOR, TAG_LABEL } from "@/components/TagChip";
import type { Venue, VenueTag } from "@/data/types";

const ALL_TAGS: VenueTag[] = [
  "live-jazz",
  "jam-session",
  "listening-room",
  "vinyl-bar",
  "dj-set",
  "jazz-on-system",
];

const PHL_CENTER: [number, number] = [-75.158, 39.953];
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/positron";

// Compute a bounding box that comfortably contains every venue, with a small
// pad so the corner markers aren't sitting on the edge of the viewport.
function venueBounds(venues: Venue[]): maplibregl.LngLatBoundsLike | null {
  if (venues.length === 0) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const v of venues) {
    if (v.lng < minLng) minLng = v.lng;
    if (v.lng > maxLng) maxLng = v.lng;
    if (v.lat < minLat) minLat = v.lat;
    if (v.lat > maxLat) maxLat = v.lat;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

interface Props {
  venues: Venue[];
}

export default function Map({ venues }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [active, setActive] = useState<Set<VenueTag>>(new Set(ALL_TAGS));
  const [error, setError] = useState<string | null>(null);

  // One-time map init. Fit the initial viewport to every venue so spots in
  // Olney or out toward the Mann don't drop off the edge.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    try {
      const bounds = venueBounds(venues);
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: PHL_CENTER,
        zoom: 11,
        attributionControl: { compact: true },
        // On touch, require two fingers to pan/zoom so the map doesn't hijack
        // page scroll now that it only takes 60vh on a phone.
        cooperativeGestures: true,
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      map.on("load", () => {
        if (bounds) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
        }
      });
      mapRef.current = map;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- surfacing a synchronous init failure to the UI
      setError(`Map init failed: ${msg}`);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [venues]);

  // Re-render markers whenever the filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const shown = venues.filter((v) => v.tags.some((t) => active.has(t)));
    for (const v of shown) {
      const primary = v.tags[0];
      const color = TAG_COLOR[primary] ?? "var(--accent)";

      // 44px transparent hit area wrapping a ~18px themed dot, so the marker is
      // keyboard-operable and comfortable to tap without inflating the visual.
      const el = document.createElement("div");
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", `${v.name} — show details`);
      el.style.width = "44px";
      el.style.height = "44px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";

      const dot = document.createElement("div");
      dot.style.width = "18px";
      dot.style.height = "18px";
      dot.style.borderRadius = "9999px";
      dot.style.background = color;
      dot.style.border = "2px solid var(--background)";
      dot.style.boxShadow = "0 0 0 1.5px var(--foreground)";
      el.appendChild(dot);

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "280px" })
        .setHTML(
          `<div style="font-family: var(--font-serif), serif; font-style: italic; font-size: 17px; line-height: 1.2; color: var(--foreground);">${escapeHtml(v.name)}</div>
           <div style="font-family: var(--font-mono), monospace; text-transform: uppercase; font-size: 10px; letter-spacing: 0.18em; color: var(--muted); margin-top: 4px;">${escapeHtml(v.neighborhood)}</div>
           <div style="font-size: 12px; margin-top: 8px; color: var(--foreground); line-height: 1.45;">${escapeHtml(v.blurb)}</div>
           <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px;">
             ${v.tags
               .map(
                 (t) =>
                   `<span style="display:inline-block; padding:1px 6px; border-radius:9999px; font-size:10px; text-transform:uppercase; letter-spacing:0.18em; color:${TAG_COLOR[t]}; border:1px solid ${TAG_COLOR[t]};">${TAG_LABEL[t]}</span>`,
               )
               .join("")}
           </div>
           <a href="/venues/${v.slug}" style="display:inline-block; margin-top:10px; font-size:11px; color:var(--accent); text-decoration:none; letter-spacing:0.18em; text-transform:uppercase;">→ venue page</a>`,
        );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([v.lng, v.lat])
        .setPopup(popup)
        .addTo(map);

      // Enter/Space toggle the popup so the marker works without a pointer.
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          marker.togglePopup();
        }
      });

      markersRef.current.push(marker);
    }
  }, [venues, active]);

  function toggle(t: VenueTag) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        // Don't allow zero tags — that hides every pin and the map looks broken.
        if (next.size === 1) {
          return new Set(ALL_TAGS);
        }
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map((t) => {
          const on = active.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              aria-pressed={on}
              className={`caps inline-flex items-center min-h-11 rounded-full px-3.5 py-2 border transition-[color,background-color] duration-[--dur] ease-[--ease] active:translate-y-px ${
                on
                  ? ""
                  : "hover:bg-[color-mix(in_oklab,var(--tag-x)_10%,transparent)]"
              }`}
              style={{
                color: on ? "var(--background)" : TAG_COLOR[t],
                background: on ? TAG_COLOR[t] : "transparent",
                borderColor: TAG_COLOR[t],
                // Feed the tag color into the OFF-state hover mix.
                ["--tag-x" as string]: TAG_COLOR[t],
              }}
            >
              {TAG_LABEL[t]}
            </button>
          );
        })}
      </div>
      <div
        ref={containerRef}
        className="w-full h-[60vh] md:h-[640px] border-2 border-foreground"
        aria-label="Map of Philly jazz spots"
      />
      {error && <p className="text-xs text-accent">{error}</p>}
      <p className="text-xs text-muted caps">
        Click or focus a pin and press Enter for venue details. Filter chips toggle
        which categories appear; the last active chip re-shows every category.
      </p>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

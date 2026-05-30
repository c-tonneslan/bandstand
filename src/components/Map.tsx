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

interface Props {
  venues: Venue[];
}

export default function Map({ venues }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [active, setActive] = useState<Set<VenueTag>>(new Set(ALL_TAGS));
  const [error, setError] = useState<string | null>(null);

  // One-time map init.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: PHL_CENTER,
        zoom: 12,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      mapRef.current = map;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      setError(`Map init failed: ${msg}`);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-render markers whenever the filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const shown = venues.filter((v) => v.tags.some((t) => active.has(t)));
    for (const v of shown) {
      const primary = v.tags[0];
      const color = TAG_COLOR[primary] ?? "var(--red)";

      // Plain div so clicking the marker only toggles the popup; the popup
      // body still carries a "→ venue page" link for navigation.
      const el = document.createElement("div");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", v.name);
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "9999px";
      el.style.background = color;
      el.style.border = "2px solid #f0e6cd";
      el.style.boxShadow = "0 0 0 1.5px #1f1a14";
      el.style.cursor = "pointer";

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "280px" })
        .setHTML(
          `<div style="font-family: serif; font-style: italic; font-size: 17px; line-height: 1.2; color: #1f1a14;">${escapeHtml(v.name)}</div>
           <div style="font-family: monospace; text-transform: uppercase; font-size: 10px; letter-spacing: 0.18em; color: #786b56; margin-top: 4px;">${escapeHtml(v.neighborhood)}</div>
           <div style="font-size: 12px; margin-top: 8px; color: #1f1a14; line-height: 1.45;">${escapeHtml(v.blurb)}</div>
           <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px;">
             ${v.tags
               .map(
                 (t) =>
                   `<span style="display:inline-block; padding:1px 6px; border-radius:9999px; font-size:10px; text-transform:uppercase; letter-spacing:0.18em; color:${TAG_COLOR[t]}; border:1px solid ${TAG_COLOR[t]};">${TAG_LABEL[t]}</span>`,
               )
               .join("")}
           </div>
           <a href="/venues/${v.slug}" style="display:inline-block; margin-top:10px; font-size:11px; color:#a83a2a; text-decoration:none; letter-spacing:0.18em; text-transform:uppercase;">→ venue page</a>`,
        );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([v.lng, v.lat])
        .setPopup(popup)
        .addTo(map);
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
              className="caps rounded-full px-2.5 py-1 border transition"
              style={{
                color: on ? "var(--background)" : TAG_COLOR[t],
                background: on ? TAG_COLOR[t] : "transparent",
                borderColor: TAG_COLOR[t],
              }}
            >
              {TAG_LABEL[t]}
            </button>
          );
        })}
      </div>
      <div
        ref={containerRef}
        className="w-full h-[640px] border-2 border-foreground"
        aria-label="Map of Philly jazz spots"
      />
      {error && <p className="text-xs text-red">{error}</p>}
      <p className="text-xs text-muted caps-wide">
        Click a pin for venue details. Filter chips toggle which categories appear.
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

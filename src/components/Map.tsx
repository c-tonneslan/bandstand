"use client";

import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";

import { TAG_LABEL } from "@/components/TagChip";
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

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
// If the env override is set it wins outright in BOTH themes (hard override).
const STYLE_OVERRIDE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || null;

const SOURCE_ID = "venues";
const CLUSTER_LAYER = "clusters";
const CLUSTER_COUNT_LAYER = "cluster-count";
const POINT_LAYER = "venue-points";

// Tag -> CSS custom property. Paint expressions can't read `var(...)`, so we
// resolve these to concrete hex/rgb at runtime and re-resolve on theme change.
const TAG_VAR: Record<VenueTag, string> = {
  "live-jazz": "--tag-live",
  "jam-session": "--tag-jam",
  "listening-room": "--tag-listening",
  "vinyl-bar": "--tag-vinyl",
  "dj-set": "--tag-dj",
  "jazz-on-system": "--tag-system",
};

interface ThemeColors {
  tag: Record<VenueTag, string>;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

// Read the currently-computed token values off <html>. Called at init and on
// every theme flip so cluster paint + popup HTML track the active palette.
function readColors(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback;
  const tag = {} as Record<VenueTag, string>;
  for (const t of ALL_TAGS) tag[t] = get(TAG_VAR[t], "#888");
  return {
    tag,
    accent: get("--accent", "#e0a94a"),
    background: get("--background", "#14151b"),
    foreground: get("--foreground", "#efe9db"),
    muted: get("--muted", "#9a978c"),
  };
}

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function styleForTheme(): string {
  if (STYLE_OVERRIDE) return STYLE_OVERRIDE;
  return isDark() ? STYLE_DARK : STYLE_LIGHT;
}

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

interface VenueProps {
  slug: string;
  name: string;
  neighborhood: string;
  blurb: string;
  tags: VenueTag[];
  color: string;
  lat: number;
  lng: number;
}

function toFeatureCollection(
  venues: Venue[],
  active: Set<VenueTag>,
  colors: ThemeColors,
): GeoJSON.FeatureCollection<GeoJSON.Point, VenueProps> {
  const shown = venues.filter((v) => v.tags.some((t) => active.has(t)));
  return {
    type: "FeatureCollection",
    features: shown.map((v) => {
      const primary = v.tags[0];
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.lng, v.lat] },
        properties: {
          slug: v.slug,
          name: v.name,
          neighborhood: v.neighborhood,
          blurb: v.blurb,
          tags: v.tags,
          color: colors.tag[primary] ?? colors.accent,
          lat: v.lat,
          lng: v.lng,
        },
      };
    }),
  };
}

// ~R of earth in miles.
function haversineMiles(
  a: [number, number],
  b: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build the popup body. `distance` (miles) is optional and only present after
// a successful "Near me" — the walk time is explicitly labelled an estimate.
function popupHtml(
  p: VenueProps,
  colors: ThemeColors,
  distanceMi: number | null,
): string {
  const tagPills = p.tags
    .map((t) => {
      const c = colors.tag[t];
      return `<span style="display:inline-block; padding:1px 6px; border-radius:9999px; font-size:10px; text-transform:uppercase; letter-spacing:0.18em; color:${c}; border:1px solid ${c};">${TAG_LABEL[t]}</span>`;
    })
    .join("");

  let distanceRow = "";
  if (distanceMi != null) {
    const walkMin = Math.max(1, Math.round((distanceMi / 3) * 60));
    const miLabel = distanceMi < 0.1 ? "<0.1" : distanceMi.toFixed(1);
    distanceRow = `<div style="font-family: var(--font-mono), monospace; text-transform: uppercase; font-size: 10px; letter-spacing: 0.14em; color: ${colors.accent}; margin-top: 8px;">~${miLabel} mi · ~${walkMin} min walk (est.)</div>`;
  }

  return (
    `<div style="font-family: var(--font-serif), serif; font-style: italic; font-size: 17px; line-height: 1.2; color: ${colors.foreground};">${escapeHtml(p.name)}</div>` +
    `<div style="font-family: var(--font-mono), monospace; text-transform: uppercase; font-size: 10px; letter-spacing: 0.18em; color: ${colors.muted}; margin-top: 4px;">${escapeHtml(p.neighborhood)}</div>` +
    distanceRow +
    `<div style="font-size: 12px; margin-top: 8px; color: ${colors.foreground}; line-height: 1.45;">${escapeHtml(p.blurb)}</div>` +
    `<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px;">${tagPills}</div>` +
    `<a href="/venues/${p.slug}" style="display:inline-block; margin-top:10px; font-size:11px; color:${colors.accent}; text-decoration:none; letter-spacing:0.18em; text-transform:uppercase;">→ venue page</a>`
  );
}

interface Props {
  venues: Venue[];
}

export default function Map({ venues }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const colorsRef = useRef<ThemeColors | null>(null);
  const activeRef = useRef<Set<VenueTag>>(new Set(ALL_TAGS));
  const meMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userLocRef = useRef<[number, number] | null>(null);

  const [active, setActive] = useState<Set<VenueTag>>(new Set(ALL_TAGS));
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [nearNote, setNearNote] = useState<string | null>(null);

  // Keep the active-tags ref in sync so style-reload / event handlers always see
  // latest state without re-binding.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const currentData = useCallback(() => {
    const colors = colorsRef.current;
    if (!colors) {
      return { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection<
        GeoJSON.Point,
        VenueProps
      >;
    }
    return toFeatureCollection(venues, activeRef.current, colors);
  }, [venues]);

  // Add the clustered source + layers. Safe to call again after setStyle wipes
  // custom sources/layers (guards on existing source id).
  const addVenueLayers = useCallback(
    (map: MapLibreMap) => {
      const colors = colorsRef.current;
      if (!colors) return;
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: currentData(),
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          // Sized + colored by how many venues fall in the cluster.
          "circle-color": [
            "step",
            ["get", "point_count"],
            colors.accent,
            5,
            colors.tag["dj-set"],
            10,
            colors.tag["live-jazz"],
          ],
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 10, 26],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": colors.background,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 13,
        },
        paint: { "text-color": colors.background },
      });

      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": colors.background,
        },
      });
    },
    [currentData],
  );

  // One-time init.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    try {
      colorsRef.current = readColors();
      const bounds = venueBounds(venues);
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleForTheme(),
        center: PHL_CENTER,
        zoom: 11,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: false }),
        "top-right",
      );

      map.on("load", () => {
        addVenueLayers(map);
        if (bounds) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
        }
      });

      // Clicking a cluster zooms to its expansion level.
      map.on("click", CLUSTER_LAYER, (e) => {
        const feat = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_LAYER],
        })[0] as MapGeoJSONFeature | undefined;
        if (!feat) return;
        const clusterId = feat.properties.cluster_id as number;
        const src = map.getSource(SOURCE_ID) as GeoJSONSource;
        src
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            const geom = feat.geometry as GeoJSON.Point;
            map.easeTo({
              center: geom.coordinates as [number, number],
              zoom: zoom + 0.25,
            });
          })
          .catch(() => {});
      });

      // Clicking an unclustered venue opens its popup.
      map.on("click", POINT_LAYER, (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const colors = colorsRef.current;
        if (!colors) return;
        const raw = feat.properties as Record<string, unknown>;
        // GeoJSON properties come back as JSON strings for arrays.
        const tags =
          typeof raw.tags === "string"
            ? (JSON.parse(raw.tags) as VenueTag[])
            : (raw.tags as VenueTag[]);
        const p: VenueProps = {
          slug: String(raw.slug),
          name: String(raw.name),
          neighborhood: String(raw.neighborhood),
          blurb: String(raw.blurb),
          tags,
          color: String(raw.color),
          lat: Number(raw.lat),
          lng: Number(raw.lng),
        };
        const distance = userLocRef.current
          ? haversineMiles(userLocRef.current, [p.lng, p.lat])
          : null;
        new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "280px" })
          .setLngLat([p.lng, p.lat])
          .setHTML(popupHtml(p, colors, distance))
          .addTo(map);
      });

      for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

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
    // addVenueLayers is stable enough; init must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues]);

  // Theme-reactive basemap. Watch the `.dark` class on <html>; on flip, swap the
  // basemap and re-add our source/layers once the new style's `styledata` lands
  // (setStyle wipes all custom sources + layers).
  useEffect(() => {
    if (STYLE_OVERRIDE) return; // hard override: no theme swapping
    const html = document.documentElement;
    let lastDark = html.classList.contains("dark");

    const obs = new MutationObserver(() => {
      const nowDark = html.classList.contains("dark");
      if (nowDark === lastDark) return;
      lastDark = nowDark;
      const map = mapRef.current;
      if (!map) return;

      colorsRef.current = readColors();
      const next = nowDark ? STYLE_DARK : STYLE_LIGHT;

      // Re-add layers once per swap. `styledata` fires multiple times while a
      // style loads; guard with getSource + one-shot listener.
      const onStyle = () => {
        if (!map.getSource(SOURCE_ID)) addVenueLayers(map);
        if (map.getSource(SOURCE_ID)) map.off("styledata", onStyle);
      };
      map.setStyle(next);
      map.on("styledata", onStyle);
    });
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [addVenueLayers]);

  // Filter changes: recompute the GeoJSON so clusters recompute.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(currentData());
  }, [active, currentData]);

  function toggle(t: VenueTag) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size === 1) return new Set(ALL_TAGS);
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }

  function nearMe() {
    if (!("geolocation" in navigator)) {
      setNearNote("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setNearNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const map = mapRef.current;
        if (!map) return;
        const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        userLocRef.current = loc;

        meMarkerRef.current?.remove();
        const el = document.createElement("div");
        el.setAttribute("aria-label", "You are here");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "9999px";
        el.style.background = colorsRef.current?.accent ?? "#e0a94a";
        el.style.border = "3px solid var(--background)";
        el.style.boxShadow = "0 0 0 2px var(--foreground)";
        meMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(loc)
          .addTo(map);

        // Nearest venue, for a quick orientation line.
        let nearest: { name: string; mi: number } | null = null;
        for (const v of venues) {
          const mi = haversineMiles(loc, [v.lng, v.lat]);
          if (!nearest || mi < nearest.mi) nearest = { name: v.name, mi };
        }
        if (nearest) {
          const walk = Math.max(1, Math.round((nearest.mi / 3) * 60));
          setNearNote(
            `Nearest: ${nearest.name}, ~${nearest.mi.toFixed(1)} mi · ~${walk} min walk (est.). Open any pin for its distance.`,
          );
        }
        map.easeTo({ center: loc, zoom: Math.max(map.getZoom(), 13) });
      },
      () => {
        // Denied / unavailable — revert quietly, no throw.
        setLocating(false);
        setNearNote("Couldn't get your location. Nothing changed.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map((t) => {
          const on = active.has(t);
          const color = `var(${TAG_VAR[t]})`;
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
                color: on ? "var(--background)" : color,
                background: on ? color : "transparent",
                borderColor: color,
                ["--tag-x" as string]: color,
              }}
            >
              {TAG_LABEL[t]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={nearMe}
          disabled={locating}
          className="btn btn-secondary btn-sm min-h-11"
        >
          {locating ? "Locating…" : "Near me"}
        </button>
      </div>
      {nearNote && <p className="text-xs text-muted">{nearNote}</p>}
      <div
        ref={containerRef}
        className="w-full h-[60vh] md:h-[640px] border-2 border-foreground"
        aria-label="Map of Philly jazz spots"
      />
      {error && <p className="text-xs text-accent">{error}</p>}
      <p className="text-xs text-muted caps">
        Click a cluster to zoom in, or click a pin for venue details. Filter chips
        toggle which categories appear; the last active chip re-shows every
        category. Near me sorts distances from your location (est.).
      </p>
    </div>
  );
}

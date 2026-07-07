// Best-effort venue transit enrichment from SEPTA's GTFS static feed. Downloads
// the public feed (a zip of a bus zip + a rail zip), parses stops.txt and
// route_stops.txt, and for each venue writes the ~3 nearest stops (haversine)
// with the routes serving them. Occasionally-run; writes
// src/data/venue-transit.json for the build to read offline.
//
// We deliberately avoid the ~100MB stop_times.txt join: SEPTA ships
// route_stops.txt, a direct stop->route map, so nearest-stop routing needs only
// stops.txt + route_stops.txt + routes.txt. Uses Node + the system `unzip`
// (no npm deps). If the feed can't be fetched/unzipped, we bail gracefully,
// leave venue-transit.json as {} and say so — the venue page's Maps deep links
// work regardless.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { venues } from "../src/data/venues";
import type { TransitStop, VenueTransit } from "../src/lib/enriched";

const OUT_PATH = join(import.meta.dirname, "..", "src", "data", "venue-transit.json");
const FEED_URL = "https://www3.septa.org/developer/gtfs_public.zip";
const NEAREST_N = 3;
const MAX_METERS = 1200; // don't surface a "nearest" stop that's a mile away

// -- tiny CSV (handles quoted fields with commas) ------------------------------

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (field.length || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      }
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().replace(/^﻿/, ""));
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = r[i] ?? ""));
    return o;
  });
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Feed {
  stops: Stop[];
  routesByStop: Map<string, Set<string>>; // stop_id -> route short names
}

// Parse one GTFS feed dir into stops + a stop->routeName map.
function loadFeed(dir: string): Feed {
  const routeName = new Map<string, string>();
  for (const r of parseCsv(readFileSync(join(dir, "routes.txt"), "utf-8"))) {
    const label = r.route_short_name || r.route_long_name || r.route_id;
    routeName.set(r.route_id, label);
  }

  const routesByStop = new Map<string, Set<string>>();
  for (const rs of parseCsv(readFileSync(join(dir, "route_stops.txt"), "utf-8"))) {
    const name = routeName.get(rs.route_id);
    if (!name) continue;
    let set = routesByStop.get(rs.stop_id);
    if (!set) routesByStop.set(rs.stop_id, (set = new Set()));
    set.add(name);
  }

  const stops: Stop[] = [];
  for (const s of parseCsv(readFileSync(join(dir, "stops.txt"), "utf-8"))) {
    // location_type 1 = station, 2+ = entrances/nodes; keep only boardable
    // stops (0 or blank). Rail feed omits the column entirely.
    if (s.location_type && s.location_type !== "0") continue;
    const lat = Number(s.stop_lat);
    const lng = Number(s.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    stops.push({ id: s.stop_id, name: s.stop_name || s.stop_id, lat, lng });
  }
  return { stops, routesByStop };
}

function nearestStops(
  vLat: number,
  vLng: number,
  feeds: Feed[],
): TransitStop[] {
  const scored: { stop: Stop; feed: Feed; dist: number }[] = [];
  for (const feed of feeds) {
    for (const stop of feed.stops) {
      const dist = haversine(vLat, vLng, stop.lat, stop.lng);
      if (dist <= MAX_METERS) scored.push({ stop, feed, dist });
    }
  }
  scored.sort((a, b) => a.dist - b.dist);

  const out: TransitStop[] = [];
  const seenNames = new Set<string>();
  for (const { stop, feed, dist } of scored) {
    if (seenNames.has(stop.name)) continue; // collapse near-duplicate platforms
    seenNames.add(stop.name);
    const routes = [...(feed.routesByStop.get(stop.id) ?? [])].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    out.push({ name: stop.name, routes, distMeters: Math.round(dist) });
    if (out.length >= NEAREST_N) break;
  }
  return out;
}

function download(url: string, dest: string): void {
  execFileSync("curl", ["-sSL", "--fail", "-o", dest, url], { stdio: ["ignore", "ignore", "inherit"] });
}

function unzip(zip: string, dest: string): void {
  execFileSync("unzip", ["-o", "-q", zip, "-d", dest], { stdio: ["ignore", "ignore", "inherit"] });
}

async function main() {
  const work = mkdtempSync(join(tmpdir(), "septa-gtfs-"));
  try {
    const topZip = join(work, "gtfs_public.zip");
    console.log(`downloading ${FEED_URL} ...`);
    download(FEED_URL, topZip);
    unzip(topZip, work);

    const busZip = join(work, "google_bus.zip");
    const railZip = join(work, "google_rail.zip");
    if (!existsSync(busZip) && !existsSync(railZip)) {
      throw new Error("expected google_bus.zip / google_rail.zip inside the feed");
    }
    const feeds: Feed[] = [];
    for (const [zip, sub] of [
      [busZip, "bus"],
      [railZip, "rail"],
    ] as const) {
      if (!existsSync(zip)) continue;
      const subDir = join(work, sub);
      unzip(zip, subDir);
      feeds.push(loadFeed(subDir));
    }

    const totalStops = feeds.reduce((n, f) => n + f.stops.length, 0);
    console.log(`parsed ${totalStops} stops across ${feeds.length} feed(s)`);

    const out: Record<string, VenueTransit> = {};
    for (const v of venues) {
      const stops = nearestStops(v.lat, v.lng, feeds);
      out[v.slug] = { slug: v.slug, stops };
    }

    writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
    const withStops = Object.values(out).filter((t) => (t.stops?.length ?? 0) > 0).length;
    console.log(`wrote ${Object.keys(out).length} venues (${withStops} with stops) -> ${OUT_PATH}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`SEPTA enrichment skipped: ${msg}`);
  console.error("leaving venue-transit.json unchanged; Maps deep links still work.");
  process.exit(1);
});

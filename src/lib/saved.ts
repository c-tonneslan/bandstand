"use client";

// Client-only personalization store. Everything lives in localStorage under a
// single versioned key; there is no backend. A useSyncExternalStore hook keeps
// every SaveButton and the My Nights page in sync — within a tab via a local
// emitter, across tabs via the native `storage` event.

import { useSyncExternalStore } from "react";

const KEY = "bandstand.saved.v1";

export type SavedKind = "show" | "venue" | "artist";

export interface Saved {
  v: 1;
  shows: string[];
  venues: string[];
  artists: string[];
  updated: number;
}

function empty(): Saved {
  return { v: 1, shows: [], venues: [], artists: [], updated: 0 };
}

function normalize(raw: unknown): Saved {
  if (!raw || typeof raw !== "object") return empty();
  const o = raw as Partial<Record<keyof Saved, unknown>>;
  const arr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : [];
  return {
    v: 1,
    shows: arr(o.shows),
    venues: arr(o.venues),
    artists: arr(o.artists),
    updated: typeof o.updated === "number" ? o.updated : 0,
  };
}

// Cached snapshot so getSnapshot is referentially stable between writes —
// useSyncExternalStore bails out of renders when the reference is unchanged.
let snapshot: Saved | null = null;
const listeners = new Set<() => void>();

function read(): Saved {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : empty();
  } catch {
    return empty();
  }
}

function commit(next: Saved) {
  snapshot = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage full / disabled — the in-memory snapshot still drives the UI.
    }
  }
  for (const l of listeners) l();
}

function getSnapshot(): Saved {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

// The server render and the very first client render must agree, so both get a
// stable empty snapshot. The real value hydrates on the next store update.
const SERVER_SNAPSHOT = empty();
function getServerSnapshot(): Saved {
  return SERVER_SNAPSHOT;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = read();
      for (const l of listeners) l();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

const FIELD: Record<SavedKind, keyof Pick<Saved, "shows" | "venues" | "artists">> = {
  show: "shows",
  venue: "venues",
  artist: "artists",
};

function toggle(kind: SavedKind, id: string) {
  const cur = getSnapshot();
  const field = FIELD[kind];
  const set = new Set(cur[field]);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  commit({ ...cur, [field]: [...set], updated: Date.now() });
}

export function toggleShow(id: string) {
  toggle("show", id);
}
export function toggleVenue(slug: string) {
  toggle("venue", slug);
}
export function toggleArtist(slug: string) {
  toggle("artist", slug);
}

export function mergeShows(ids: string[]) {
  const cur = getSnapshot();
  const set = new Set(cur.shows);
  let changed = false;
  for (const id of ids) {
    if (!set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  commit({ ...cur, shows: [...set], updated: Date.now() });
}

export function clear() {
  commit(empty());
}

// Share encoding: pack show ids into a compact base64url token for a ?n= param.
// Keep it short — a plan is a night out, not an archive.
export const MAX_SHARE_SHOWS = 40;

function b64urlEncode(s: string): string {
  const bytes =
    typeof TextEncoder !== "undefined"
      ? btoa(String.fromCharCode(...new TextEncoder().encode(s)))
      : btoa(s);
  return bytes.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  if (typeof TextDecoder !== "undefined") {
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return bin;
}

export function encodeShareShows(ids: string[]): string {
  return b64urlEncode(ids.slice(0, MAX_SHARE_SHOWS).join("\n"));
}

export function decodeShareShows(token: string): string[] {
  try {
    return b64urlDecode(token)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_SHARE_SHOWS);
  } catch {
    return [];
  }
}

export interface UseSaved {
  saved: Saved;
  toggleShow: (id: string) => void;
  toggleVenue: (slug: string) => void;
  toggleArtist: (slug: string) => void;
  isSaved: (kind: SavedKind, id: string) => boolean;
  mergeShows: (ids: string[]) => void;
  clear: () => void;
}

export function useSaved(): UseSaved {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    saved,
    toggleShow,
    toggleVenue,
    toggleArtist,
    isSaved: (kind, id) => saved[FIELD[kind]].includes(id),
    mergeShows,
    clear,
  };
}

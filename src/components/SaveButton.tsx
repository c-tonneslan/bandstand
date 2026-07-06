"use client";

import { useSaved, type SavedKind } from "@/lib/saved";

const VERB: Record<SavedKind, string> = {
  show: "show",
  venue: "room",
  artist: "player",
};

// Bookmark toggle. Drops safely inside the server-rendered OccurrenceCard as a
// client island; `relative z-10` keeps it clickable above the card's stretched
// link overlay.
export default function SaveButton({
  kind,
  id,
  label,
  size = "md",
}: {
  kind: SavedKind;
  id: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const { isSaved, toggleShow, toggleVenue, toggleArtist } = useSaved();
  const active = isSaved(kind, id);
  const toggle = () =>
    kind === "show" ? toggleShow(id) : kind === "venue" ? toggleVenue(id) : toggleArtist(id);

  const name = label ?? `this ${VERB[kind]}`;
  const dim = size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={`${active ? "Remove" : "Save"} ${name}`}
      title={active ? `Saved — ${name}` : `Save ${name}`}
      className={`relative z-10 inline-flex items-center justify-center rounded border leading-none transition-colors ${dim} ${
        active
          ? "border-accent text-accent bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]"
          : "border-line text-muted hover:text-accent hover:border-accent"
      }`}
    >
      <span aria-hidden>{active ? "★" : "☆"}</span>
    </button>
  );
}

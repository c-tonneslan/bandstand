import type { VenueTag } from "@/data/types";

export const TAG_LABEL: Record<VenueTag, string> = {
  "live-jazz": "Live jazz",
  "jam-session": "Jam session",
  "listening-room": "Listening room",
  "vinyl-bar": "Vinyl bar",
  "dj-set": "DJ sets",
  "jazz-on-system": "Jazz on system",
};

export const TAG_COLOR: Record<VenueTag, string> = {
  "live-jazz": "var(--tag-live)",
  "jam-session": "var(--tag-jam)",
  "listening-room": "var(--tag-listening)",
  "vinyl-bar": "var(--tag-vinyl)",
  "dj-set": "var(--tag-dj)",
  "jazz-on-system": "var(--tag-system)",
};

export function TagChip({ tag, size = "sm" }: { tag: VenueTag; size?: "sm" | "md" }) {
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full caps ${padding}`}
      style={{ color: TAG_COLOR[tag], borderColor: TAG_COLOR[tag] }}
    >
      <span
        aria-hidden
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: TAG_COLOR[tag] }}
      />
      {TAG_LABEL[tag]}
    </span>
  );
}

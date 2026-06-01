// Static OG image rendered at build time. Counts tonight's gigs from the
// same schedule resolver the homepage uses, so the social card matches
// what someone lands on after they click.

import { ImageResponse } from "next/og";

import { addDays, todayInPhilly } from "@/lib/dates";
import { resolveOccurrences } from "@/lib/schedule";

export const alt = "The Bandstand — Philly jazz, tonight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const today = todayInPhilly();
  const tomorrow = addDays(today, 1);
  const tonight = resolveOccurrences({ start: today, end: today });
  const week = resolveOccurrences({ start: today, end: addDays(tomorrow, 6) });

  const headline =
    tonight.length === 1 ? "1 gig tonight" : `${tonight.length} gigs tonight`;
  const subline = `${week.length} this week · Philadelphia`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f4f0e8",
          color: "#161616",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#c1503a",
            }}
          >
            /the-bandstand
          </div>
          <div
            style={{
              fontSize: 168,
              lineHeight: 1,
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            The Bandstand.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 76, lineHeight: 1.1 }}>{headline}</div>
          <div style={{ fontSize: 34, color: "#555" }}>{subline}</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#555",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <span>bandstand-bay.vercel.app</span>
          <span>★ live rooms · jam sessions</span>
        </div>
      </div>
    ),
    size,
  );
}

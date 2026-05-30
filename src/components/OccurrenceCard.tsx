import Link from "next/link";

import type { Occurrence } from "@/data/types";
import { formatHumanTime } from "@/lib/dates";

const KIND_LABEL: Record<Occurrence["kind"], string> = {
  ticketed: "Ticketed",
  residency: "Residency",
  jam: "Jam",
  brunch: "Brunch",
  "open-mic": "Open mic",
};

const POLICY_LABEL: Record<NonNullable<Occurrence["sitInPolicy"]>, string> = {
  open: "open signup",
  "by-invitation": "by invitation",
  "first-half-then-open": "house band first, then open",
  "ask-the-band": "ask the band",
  "no-sit-ins": "no sit-ins",
};

export function OccurrenceCard({ o }: { o: Occurrence }) {
  return (
    <article className="border border-line hover:border-brass-soft/60 transition rounded-md p-4 flex gap-4">
      <div className="font-mono text-sm w-24 shrink-0">
        <div className="text-brass">{formatHumanTime(o.startTime)}</div>
        {o.endTime && <div className="text-muted text-xs">→ {formatHumanTime(o.endTime)}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="font-serif text-xl">{o.name}</h3>
          <KindBadge kind={o.kind} />
          {o.confidence !== "verified" && <ConfidenceBadge level={o.confidence} />}
        </div>
        <p className="text-sm text-muted mt-1">
          <Link href={`/venues/${o.venue.slug}`} className="hover:text-brass">
            {o.venue.name}
          </Link>
          <span className="mx-1">·</span>
          <span>{o.venue.neighborhood}</span>
        </p>
        {(o.sitInPolicy || o.performers?.length) && (
          <p className="text-sm mt-2">
            {o.performers?.length ? (
              <span>{o.performers.join(", ")}</span>
            ) : o.sitInPolicy ? (
              <span>
                <span className="text-muted">sit-in: </span>
                {POLICY_LABEL[o.sitInPolicy]}
              </span>
            ) : null}
          </p>
        )}
        {o.notes && <p className="text-sm text-muted mt-2">{o.notes}</p>}
        {(o.ticketUrl || o.venue.website) && (
          <p className="text-sm mt-3 flex gap-3 flex-wrap">
            {o.ticketUrl && (
              <a
                href={o.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brass hover:text-neon"
              >
                tickets{o.ticketPrice ? ` · ${o.ticketPrice}` : ""} →
              </a>
            )}
            {o.venue.website && (
              <a
                href={o.venue.website}
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-brass"
              >
                verify on venue site →
              </a>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

function KindBadge({ kind }: { kind: Occurrence["kind"] }) {
  return (
    <span className="font-mono uppercase tracking-wider text-[10px] text-brass-soft border border-brass-soft/40 rounded px-1.5 py-0.5">
      {KIND_LABEL[kind]}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: "likely" | "unverified" }) {
  const color =
    level === "likely"
      ? "text-amber-400/80 border-amber-500/30"
      : "text-orange-400/80 border-orange-500/30";
  return (
    <span
      className={`font-mono uppercase tracking-wider text-[10px] rounded border px-1.5 py-0.5 ${color}`}
      title={
        level === "likely"
          ? "Long-running but not re-checked recently. Confirm with the venue."
          : "Hand-curated, not yet verified against the venue's calendar."
      }
    >
      {level}
    </span>
  );
}

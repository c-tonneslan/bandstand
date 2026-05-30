import Link from "next/link";

import type { Occurrence } from "@/data/types";
import { formatHumanTime } from "@/lib/dates";

function formatVerifiedAt(iso: string): string {
  const d = new Date(iso);
  const ageMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (ageMin < 1) return "just now";
  if (ageMin < 60) return `${ageMin}m ago`;
  const ageHr = Math.round(ageMin / 60);
  if (ageHr < 24) return `${ageHr}h ago`;
  const ageDay = Math.round(ageHr / 24);
  return `${ageDay}d ago`;
}

const KIND_LABEL: Record<Occurrence["kind"], string> = {
  ticketed: "Ticketed",
  residency: "Residency",
  jam: "Jam",
  brunch: "Brunch",
  "open-mic": "Open mic",
  dj: "DJ set",
};

const POLICY_LABEL: Record<NonNullable<Occurrence["sitInPolicy"]>, string> = {
  open: "open signup",
  "by-invitation": "by invitation",
  "first-half-then-open": "house band first, then open",
  "ask-the-band": "ask the band",
  "no-sit-ins": "no sit-ins",
};

// Repertory-style listing row: monospaced time on the left, headline + meta on
// the right, separated by a thin grid line. The whole row is hover-tinted to
// hint clickability into the venue page.
export function OccurrenceCard({ o }: { o: Occurrence }) {
  return (
    <article className="grid grid-cols-[80px_1fr] md:grid-cols-[110px_1fr] gap-4 md:gap-6 py-4 border-b border-line group">
      <div className="font-mono text-sm pt-1">
        <div className="text-foreground font-medium">{formatHumanTime(o.startTime)}</div>
        {o.endTime && (
          <div className="text-muted text-xs mt-0.5">→ {formatHumanTime(o.endTime)}</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="font-serif text-xl md:text-2xl leading-tight">{o.name}</h3>
          <KindBadge kind={o.kind} />
          {o.confidence !== "verified" && <ConfidenceBadge level={o.confidence} />}
        </div>
        <p className="text-sm text-muted mt-1.5 caps-wide" style={{ letterSpacing: "0.18em" }}>
          <Link href={`/venues/${o.venue.slug}`} className="hover:text-red">
            {o.venue.name}
          </Link>
          <span className="mx-1.5">·</span>
          <span>{o.venue.neighborhood}</span>
        </p>
        {(o.sitInPolicy || (o.performers && o.performers.length > 0)) && (
          <p className="text-sm mt-2 text-foreground/90">
            {o.performers && o.performers.length > 0 ? (
              <span>{o.performers.join(", ")}</span>
            ) : o.sitInPolicy ? (
              <span>
                <span className="text-muted">sit-in · </span>
                {POLICY_LABEL[o.sitInPolicy]}
              </span>
            ) : null}
          </p>
        )}
        {o.notes && <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{o.notes}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs">
          {o.ticketUrl && (
            <a
              href={o.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="text-red hover:text-foreground font-medium"
            >
              Tickets{o.ticketPrice ? ` · ${o.ticketPrice}` : ""} →
            </a>
          )}
          {o.venue.website && (
            <a
              href={o.venue.website}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-red"
            >
              Verify on venue site
            </a>
          )}
          {o.confidence === "verified" && o.verifiedAt && (
            <span className="text-muted/70 font-mono">
              verified {formatVerifiedAt(o.verifiedAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function KindBadge({ kind }: { kind: Occurrence["kind"] }) {
  return (
    <span className="caps text-red-soft border border-red-soft/40 rounded px-1.5 py-0.5">
      {KIND_LABEL[kind]}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: "likely" | "unverified" }) {
  return (
    <span
      className={`caps rounded border px-1.5 py-0.5 text-gold border-gold/40`}
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

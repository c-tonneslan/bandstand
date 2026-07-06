import Link from "next/link";

import SaveButton from "@/components/SaveButton";
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

// Repertory-style listing row: tabular time on the left, headline + meta in the
// body, ticket action on the right. The whole row is a stretched link into the
// venue page; the ticket / verify anchors sit above it on their own z-layer.
export function OccurrenceCard({ o }: { o: Occurrence }) {
  const ticket = o.ticketUrl ? (
    <a
      href={o.ticketUrl}
      target="_blank"
      rel="noreferrer"
      className="btn btn-ticket btn-sm relative z-10"
    >
      Tickets
      {o.ticketPrice && (
        <span className="font-mono normal-case tracking-normal opacity-80">{o.ticketPrice}</span>
      )}
      <span aria-hidden="true">&rarr;</span>
    </a>
  ) : null;

  return (
    <article className="group relative grid grid-cols-[88px_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)_auto] gap-x-6 gap-y-2 py-4 transition-[background-color,border-color] duration-[--dur-slow] ease-[--ease] hover:bg-foreground/[0.03] hover:border-accent before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent before:opacity-0 before:transition-opacity before:duration-[--dur-slow] group-hover:before:opacity-100">
      <Link
        href={`/venues/${o.venue.slug}`}
        aria-label={`${o.name} at ${o.venue.name}`}
        className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      />

      <div className="tnum font-mono text-sm text-right">
        <div className="text-foreground font-medium">{formatHumanTime(o.startTime)}</div>
        {o.endTime && <div className="text-muted text-xs">&rarr; {formatHumanTime(o.endTime)}</div>}
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="font-serif text-xl md:text-2xl leading-tight">{o.name}</h3>
          <KindBadge kind={o.kind} />
          {o.confidence !== "verified" && <ConfidenceBadge level={o.confidence} />}
        </div>
        <p className="caps text-muted mt-2">
          <span className="relative z-10 hover:text-accent">{o.venue.name}</span>
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
        {o.notes && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{o.notes}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 text-xs">
          <SaveButton kind="show" id={o.id} label={o.name} size="sm" />
          <span className="md:hidden">{ticket}</span>
          {o.venue.website && (
            <a
              href={o.venue.website}
              target="_blank"
              rel="noreferrer"
              className="relative z-10 text-muted hover:text-accent"
            >
              Verify on venue site
            </a>
          )}
          {o.confidence === "verified" && o.verifiedAt && (
            <span className="tnum text-muted/70 font-mono">
              verified {formatVerifiedAt(o.verifiedAt)}
            </span>
          )}
        </div>
      </div>

      {ticket && <div className="hidden md:flex items-start justify-end">{ticket}</div>}
    </article>
  );
}

function KindBadge({ kind }: { kind: Occurrence["kind"] }) {
  return (
    <span className="caps text-accent border border-accent/40 rounded px-1.5 py-0.5">
      {KIND_LABEL[kind]}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: "likely" | "unverified" }) {
  return (
    <span
      className="caps rounded border px-1.5 py-0.5 text-gold border-gold/40"
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

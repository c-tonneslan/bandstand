import Link from "next/link";

import type { EventKind } from "@/data/types";
import { formatHumanDate } from "@/lib/dates";
import type { Residency } from "@/lib/residency";

const KIND_LABEL: Record<EventKind, string> = {
  ticketed: "Ticketed",
  residency: "Residency",
  jam: "Jam",
  brunch: "Brunch",
  "open-mic": "Open mic",
  dj: "DJ set",
};

// Marquee card: the room and its standing slot up top, the booker's note as the
// editorial center, and a lifecycle badge that reads standing vs. counting down.
// The series `notes` carry the voice — we never invent copy when they're absent.
export function ResidencyCard({ r }: { r: Residency }) {
  const { series, venue } = r;
  const ending = r.lifecycle === "ending-soon";

  return (
    <article className="relative flex flex-col border-t-2 border-foreground/80 pt-4 pb-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <span className="caps font-mono text-sm text-accent">{r.slot}</span>
        <LifecycleBadge ending={ending} label={r.lifecycleLabel} detail={r.lifecycleDetail} />
      </div>

      <h3 className="font-serif text-2xl md:text-3xl leading-tight mt-3">{series.name}</h3>

      <p className="caps text-muted mt-2">
        <Link href={`/venues/${venue.slug}`} className="hover:text-accent">
          {venue.name}
        </Link>
        <span className="mx-1.5">·</span>
        <span>{venue.neighborhood}</span>
        <span className="mx-1.5">·</span>
        <span>{KIND_LABEL[series.kind]}</span>
      </p>

      {series.host && (
        <p className="text-sm text-foreground/90 mt-3">
          <span className="text-muted">Held down by </span>
          {series.host}
        </p>
      )}

      {series.notes && (
        <p className="font-serif text-lg leading-snug text-foreground/90 mt-4 max-w-prose">
          {series.notes}
        </p>
      )}

      <div className="flex items-center gap-x-4 gap-y-2 mt-4 text-xs flex-wrap">
        {r.nextDate ? (
          <span className="tnum font-mono text-muted">
            Next · <span className="text-foreground/80">{formatHumanDate(r.nextDate)}</span>
          </span>
        ) : (
          <span className="tnum font-mono text-muted">Next date TBC — check the room</span>
        )}
        <Link href={`/venues/${venue.slug}`} className="text-accent hover:underline">
          The room &rarr;
        </Link>
      </div>
    </article>
  );
}

function LifecycleBadge({
  ending,
  label,
  detail,
}: {
  ending: boolean;
  label: string;
  detail: string;
}) {
  const tone = ending ? "text-gold border-gold/50" : "text-accent border-accent/40";
  return (
    <span className={`inline-flex items-center gap-2 caps rounded border px-2 py-0.5 ${tone}`}>
      <span className="font-medium">{label}</span>
      <span className="text-muted">{detail}</span>
    </span>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { Occurrence } from "@/data/types";
import { addDays, todayInPhilly } from "@/lib/dates";
import { artistSlug } from "@/lib/artists";
import { downloadIcs, googleCalendarUrl, outlookUrl } from "@/lib/calendar";
import {
  decodeShareShows,
  encodeShareShows,
  MAX_SHARE_SHOWS,
  useSaved,
} from "@/lib/saved";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";
import { DayHeader } from "@/components/DayHeader";
import { OccurrenceCard } from "@/components/OccurrenceCard";

const WINDOW_DAYS = 60;

// One-shot mount flag via useSyncExternalStore — server + first client render
// return false, then it flips true without a setState-in-effect.
const noopSubscribe = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// Resolve the shared 60-day window once per render pass. Client-side, but the
// resolver only walks bundled data so there's no network cost.
function useWindow(): { start: string; occ: Occurrence[]; byId: Map<string, Occurrence> } {
  return useMemo(() => {
    const start = todayInPhilly();
    const occ = resolveOccurrences({ start, end: addDays(start, WINDOW_DAYS) });
    const byId = new Map(occ.map((o) => [o.id, o]));
    return { start, occ, byId };
  }, []);
}

export default function MyNightsView({ shareToken }: { shareToken?: string }) {
  const { saved, mergeShows, toggleVenue, toggleArtist } = useSaved();
  const { start, occ, byId } = useWindow();

  // Avoid a hydration mismatch: the store returns an empty snapshot on the
  // server + first paint, so gate the personalized body until mounted.
  const mounted = useMounted();

  const sharedIds = useMemo(
    () => (shareToken ? decodeShareShows(shareToken) : []),
    [shareToken],
  );

  if (shareToken) {
    return (
      <SharedPlan
        ids={sharedIds}
        byId={byId}
        mergeShows={mergeShows}
        alreadySaved={saved.shows}
        mounted={mounted}
      />
    );
  }

  // My set: saved shows ∪ upcoming shows at saved venues ∪ saved artists.
  const savedVenues = new Set(saved.venues);
  const savedArtists = new Set(saved.artists);
  const savedShows = new Set(saved.shows);

  const mine = occ.filter((o) => {
    if (savedShows.has(o.id)) return true;
    if (savedVenues.has(o.venue.slug)) return true;
    if ((o.performers ?? []).some((n) => savedArtists.has(artistSlug(n)))) return true;
    return false;
  });

  const byDate = groupByDate(mine);
  const dates = Array.from(byDate.keys()).sort();

  const venueRows = saved.venues.map((slug) => {
    const hit = occ.find((o) => o.venue.slug === slug);
    return { slug, name: hit?.venue.name ?? slug };
  });
  const artistRows = saved.artists.map((slug) => {
    let name = slug;
    for (const o of occ) {
      const match = (o.performers ?? []).find((n) => artistSlug(n) === slug);
      if (match) {
        name = match;
        break;
      }
    }
    return { slug, name };
  });

  const empty =
    saved.shows.length === 0 && saved.venues.length === 0 && saved.artists.length === 0;

  return (
    <div>
      <header className="pb-8 border-b border-foreground/30">
        <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">My Nights.</h1>
        <p className="deck mt-4 max-w-2xl">
          The shows, rooms, and players you starred — resolved forward {WINDOW_DAYS} days and
          kept on this device.
        </p>
      </header>

      {!mounted ? (
        <p className="text-muted text-sm mt-10">Loading your nights…</p>
      ) : empty ? (
        <EmptyState />
      ) : (
        <>
          {mine.length > 0 && (
            <ShareBar occurrences={mine} showIds={mine.map((o) => o.id)} />
          )}

          <div className="mt-10 space-y-12">
            {dates.length === 0 ? (
              <p className="text-muted text-sm border border-foreground/30 p-4">
                Nothing from your list lands in the next {WINDOW_DAYS} days. Your saved rooms and
                players are below.
              </p>
            ) : (
              dates.map((d) => (
                <section key={d}>
                  <DayHeader date={d} isToday={d === start} />
                  <div className="divide-y divide-line">
                    {(byDate.get(d) ?? []).map((o) => (
                      <OccurrenceCard key={o.id} o={o} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {(venueRows.length > 0 || artistRows.length > 0) && (
            <section className="mt-16">
              <h2 className="font-serif italic text-3xl mb-6 border-b-2 border-foreground/80 pb-2">
                Following
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {venueRows.length > 0 && (
                  <div>
                    <h3 className="caps text-accent mb-3">Rooms</h3>
                    <ul className="divide-y divide-line">
                      {venueRows.map((v) => (
                        <li key={v.slug} className="flex items-center justify-between py-2">
                          <Link href={`/venues/${v.slug}`} className="hover:text-accent">
                            {v.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleVenue(v.slug)}
                            className="caps text-muted hover:text-accent"
                            aria-label={`Unfollow ${v.name}`}
                          >
                            remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {artistRows.length > 0 && (
                  <div>
                    <h3 className="caps text-accent mb-3">Players</h3>
                    <ul className="divide-y divide-line">
                      {artistRows.map((a) => (
                        <li key={a.slug} className="flex items-center justify-between py-2">
                          <Link href={`/artists/${a.slug}`} className="hover:text-accent">
                            {a.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleArtist(a.slug)}
                            className="caps text-muted hover:text-accent"
                            aria-label={`Unfollow ${a.name}`}
                          >
                            remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 border border-foreground/30 p-8 md:p-12 max-w-2xl">
      <p className="font-serif italic text-2xl md:text-3xl leading-tight">
        Your Nights is empty — star a show, a room, or a player and it shows up here.
      </p>
      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 caps">
        <Link href="/" className="text-accent hover:text-foreground">
          → Tonight
        </Link>
        <Link href="/venues" className="text-accent hover:text-foreground">
          → The rooms
        </Link>
        <Link href="/artists" className="text-accent hover:text-foreground">
          → The players
        </Link>
      </p>
    </div>
  );
}

function ShareBar({
  occurrences,
  showIds,
}: {
  occurrences: Occurrence[];
  showIds: string[];
}) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const token = encodeShareShows(showIds);
    return `${window.location.origin}/my?n=${token}`;
  }, [showIds]);

  useEffect(() => {
    if (!showQr || !shareUrl) return;
    let cancelled = false;
    import("qrcode")
      .then((m) => m.toDataURL(shareUrl, { margin: 1, width: 220 }))
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showQr, shareUrl]);

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My Nights — The Bandstand", url: shareUrl });
        return;
      } catch {
        // user dismissed or unsupported — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing else to do.
    }
  };

  const capped = showIds.length > MAX_SHARE_SHOWS;

  return (
    <section className="mt-10 border border-foreground/30 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => downloadIcs("my-nights", occurrences)}
          className="btn btn-secondary btn-sm"
        >
          Export .ics
        </button>
        <button type="button" onClick={share} className="btn btn-ghost btn-sm">
          {copied ? "Copied ✓" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="btn btn-ghost btn-sm"
          aria-expanded={showQr}
        >
          {showQr ? "Hide QR" : "QR code"}
        </button>
      </div>
      {capped && (
        <p className="caps text-muted mt-3">
          Sharing the first {MAX_SHARE_SHOWS} shows — the rest stay on your device.
        </p>
      )}
      {showQr && (
        <div className="mt-4">
          {qr ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qr}
              alt="QR code linking to this plan"
              width={220}
              height={220}
              className="rounded border border-line bg-white p-1"
            />
          ) : (
            <p className="text-muted text-sm">Building QR…</p>
          )}
        </div>
      )}

      <details className="mt-4">
        <summary className="caps text-muted cursor-pointer hover:text-accent">
          Add to Google / Outlook
        </summary>
        <ul className="mt-3 divide-y divide-line">
          {occurrences.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 py-2 text-sm flex-wrap"
            >
              <span className="min-w-0 truncate">{o.name}</span>
              <span className="flex items-center gap-3 caps shrink-0">
                <a
                  href={googleCalendarUrl(o)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:text-foreground"
                >
                  Google
                </a>
                <a
                  href={outlookUrl(o)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:text-foreground"
                >
                  Outlook
                </a>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function SharedPlan({
  ids,
  byId,
  mergeShows,
  alreadySaved,
  mounted,
}: {
  ids: string[];
  byId: Map<string, Occurrence>;
  mergeShows: (ids: string[]) => void;
  alreadySaved: string[];
  mounted: boolean;
}) {
  const [merged, setMerged] = useState(false);
  const resolved = ids.map((id) => byId.get(id)).filter((o): o is Occurrence => Boolean(o));
  const byDate = groupByDate(resolved);
  const dates = Array.from(byDate.keys()).sort();
  const missing = ids.length - resolved.length;

  const savedSet = new Set(alreadySaved);
  const allSaved = mounted && ids.length > 0 && ids.every((id) => savedSet.has(id));

  return (
    <div>
      <header className="pb-8 border-b border-foreground/30">
        <p className="caps text-muted mb-3">Someone&apos;s plan</p>
        <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">A Night Out.</h1>
        <p className="deck mt-4 max-w-2xl">
          A shared set of {resolved.length} show{resolved.length === 1 ? "" : "s"}. Save it to your
          own Nights, or just take the list.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!mounted || resolved.length === 0 || allSaved || merged}
            onClick={() => {
              mergeShows(ids);
              setMerged(true);
            }}
            className="btn btn-primary btn-sm"
          >
            {merged || allSaved ? "Saved to your Nights ✓" : "Save these to my Nights"}
          </button>
          <Link href="/my" className="btn btn-ghost btn-sm">
            My Nights
          </Link>
        </div>
        {missing > 0 && (
          <p className="caps text-muted mt-3">
            {missing} show{missing === 1 ? "" : "s"} in this plan are past or no longer listed.
          </p>
        )}
      </header>

      <div className="mt-10 space-y-12">
        {dates.length === 0 ? (
          <p className="text-muted text-sm border border-foreground/30 p-4">
            None of the shared shows are still upcoming.
          </p>
        ) : (
          dates.map((d) => (
            <section key={d}>
              <DayHeader date={d} />
              <div className="divide-y divide-line">
                {(byDate.get(d) ?? []).map((o) => (
                  <OccurrenceCard key={o.id} o={o} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

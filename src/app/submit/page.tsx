import Link from "next/link";

export const metadata = {
  title: "Submit a spot — The Bandstand",
  description:
    "Submit a Philly jazz spot, or vouch for what a venue actually plays on the system.",
};

const NEW_VENUE_BODY = `**Venue name:**

**Neighborhood:**

**Address (with ZIP):**

**Website:**

**Instagram:**

**What is this place?** (live jazz / jam session / listening room / vinyl bar / DJ sets / jazz on the system — pick as many as fit)

**What's the vibe walking in?**

**What's the cover / pricing?**

**One sentence on what they actually play.** (If "jazz on the system" — what records did you actually hear last time? Anyone running this through a Spotify algorithm should get rejected.)

**Are you a regular here?** (helps us weight confidence)
`;

const VOUCH_BODY = `**Venue:** (one we already list)

**You were there on:** YYYY-MM-DD

**What was actually playing?** (artist + album if you caught it)

**Was it the DJ / a band / the system?**

**Anything else worth noting?**
`;

const newIssueUrl = (title: string, body: string) =>
  `https://github.com/c-tonneslan/bandstand/issues/new?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(body)}`;

export default function SubmitPage() {
  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">Help the index grow</p>
          <h1 className="font-serif italic text-[12vw] md:text-[8vw] leading-[0.85] tracking-tight">
            Submit a Spot.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Curated, not algorithmic.</p>
          <p>Regulars know best.</p>
          <p>No spam, no email.</p>
        </div>
      </header>

      <p className="font-serif text-lg md:text-xl leading-snug max-w-3xl mt-10 mb-12">
        The lowest-confidence entries in the index are the "jazz on the system" spots, because
        whether a venue is actually playing real jazz versus an algorithm depends on someone
        sitting at the bar last week. If you've been somewhere good — or somewhere we list that
        switched to Spotify slop — say so.
      </p>

      <div className="grid md:grid-cols-2 gap-8 md:gap-10">
        <section className="border-2 border-foreground p-6 md:p-8">
          <p className="caps-wide text-red mb-3">For a new room</p>
          <h2 className="font-serif italic text-3xl md:text-4xl leading-tight mb-4">
            Add a spot.
          </h2>
          <p className="text-sm leading-relaxed mb-6">
            A vinyl bar we missed, a listening room in your neighborhood, a session that runs
            every other Sunday at someone's pop-up. Submit it as a GitHub issue and we'll vet
            and add it.
          </p>
          <a
            href={newIssueUrl("Submit a spot: [VENUE NAME]", NEW_VENUE_BODY)}
            target="_blank"
            rel="noreferrer"
            className="inline-block caps text-background bg-foreground px-4 py-2.5 hover:bg-red transition"
          >
            → Open GitHub issue
          </a>
        </section>

        <section className="border-2 border-foreground p-6 md:p-8">
          <p className="caps-wide text-red mb-3">For an existing room</p>
          <h2 className="font-serif italic text-3xl md:text-4xl leading-tight mb-4">
            Vouch for music.
          </h2>
          <p className="text-sm leading-relaxed mb-6">
            You walked in, you heard real jazz / soul / funk / blues, you noted what was on. Or
            the opposite: you walked in and it was Bon Iver covers. Both are useful. We use
            these to upgrade confidence on the "jazz on the system" entries.
          </p>
          <a
            href={newIssueUrl("Vouch: [VENUE NAME] on YYYY-MM-DD", VOUCH_BODY)}
            target="_blank"
            rel="noreferrer"
            className="inline-block caps text-background bg-foreground px-4 py-2.5 hover:bg-red transition"
          >
            → Open GitHub issue
          </a>
        </section>
      </div>

      <p className="caps mt-12 text-muted">
        Don't have GitHub?{" "}
        <Link href="/about" className="text-red hover:text-foreground">
          About →
        </Link>
      </p>
    </div>
  );
}

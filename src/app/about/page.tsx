import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">Colophon</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">
            About.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Editorial,</p>
          <p>not authoritative,</p>
          <p>built by a listener.</p>
        </div>
      </header>

      <div className="max-w-2xl mt-8 space-y-5 font-serif text-lg leading-snug">
        <p>
          The Bandstand is a small Philadelphia-only site that tries to answer one question well:
          where can I go hear jazz, or sit in on a session, or have dinner with real records on
          the system, tonight or this week?
        </p>
        <p>
          The Philly jazz scene is alive but its calendar lives in twelve places at once. Chris&rsquo;
          Jazz Cafe has the cleanest listings. Heritage updates on Instagram. La Rose is word of
          mouth. Solar Myth is on the Ars Nova page. Time has a poster taped to the door. The
          Bandstand stitches them into one weekly view, then extends the picture out beyond the
          stages to vinyl bars, listening rooms, DJ nights, and the restaurants whose music
          someone actually picked.
        </p>
        <p>
          The aim is editorial honesty over completeness. Every entry carries a confidence tag
          (verified, likely, unverified) and a verify-on-source link. Some venues have scrapers
          that re-pull nightly. Others are hand-curated and will say so.
        </p>
        <p>
          If a session moved, ended, or never existed,{" "}
          <Link href="https://github.com/c-tonneslan/bandstand/issues" className="inline">
            open an issue
          </Link>
          .
        </p>
        <p className="text-base text-muted pt-6 border-t border-foreground/30 font-sans">
          Not affiliated with any venue. No tickets sold here. No tracking, no analytics. Just a
          small site by someone who likes the music.
        </p>
      </div>

      <section className="mt-16 pt-16 border-t-2 border-foreground/80">
        <p className="caps mb-3">Subscribe</p>
        <h2 className="font-serif italic text-4xl md:text-5xl mb-6">In your calendar.</h2>
        <p className="font-sans text-base text-muted max-w-2xl mb-8">
          Paste any of these into Google Calendar (Add &rarr; From URL), Apple Calendar
          (File &rarr; New Calendar Subscription), or Fantastical. They re-fetch on their own,
          so your calendar grows as new shows land in the index.
        </p>
        <div className="grid md:grid-cols-2 gap-3 font-mono text-xs">
          <CalLink href="/cal/today" label="Tonight + tomorrow" />
          <CalLink href="/cal/week" label="Next seven nights" />
          <CalLink href="/cal/jams" label="Jam sessions only (4 weeks)" />
          <CalLink href="/cal/venues/chris-jazz-cafe" label="Per venue (e.g. /cal/venues/chris-jazz-cafe)" />
        </div>
      </section>
    </div>
  );
}

function CalLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="border border-foreground/30 p-3 flex flex-col gap-1.5 hover:border-accent transition">
      <span className="text-foreground/70 font-sans normal-case tracking-normal text-xs">{label}</span>
      <a className="text-accent break-all hover:text-foreground" href={href}>
        https://bandstand-bay.vercel.app{href}
      </a>
    </div>
  );
}

import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">Colophon</p>
          <h1 className="font-serif italic text-[12vw] md:text-[8vw] leading-[0.85] tracking-tight">
            About.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Editorial,</p>
          <p>not authoritative,</p>
          <p>built by a listener.</p>
        </div>
      </header>

      <div className="max-w-2xl mt-10 space-y-5 font-serif text-lg leading-snug">
        <p>
          The Bandstand is a small Philadelphia-only site that tries to answer one question well:
          where can I go hear jazz, or sit in on a session, or have dinner with real records on
          the system, tonight or this week?
        </p>
        <p>
          The Philly jazz scene is alive but its calendar lives in twelve places at once. Chris'
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
    </div>
  );
}

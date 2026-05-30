import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-2xl prose-invert">
      <p className="font-mono uppercase tracking-widest text-xs text-muted mb-2">colophon</p>
      <h1 className="font-serif text-4xl mb-6">About bandstand</h1>

      <div className="space-y-4 text-foreground/90 leading-relaxed">
        <p>
          bandstand is a small Philly-only site that tries to answer one question well: where can
          I go hear jazz, or sit in on a session, tonight or this week?
        </p>
        <p>
          The Philly jazz scene is alive but its calendar lives in twelve places at once. Chris'
          Jazz Cafe has the cleanest listings. Heritage updates on Instagram. La Rose is
          word-of-mouth. Solar Myth is on the Ars Nova page. Time, if you're lucky, has a poster
          taped to the door. bandstand stitches them into one weekly view.
        </p>
        <p>
          v0 is hand-curated, which means every entry has a confidence tag and a "verify on the
          venue site" link. v0.1 ships per-venue scrapers and the confidence tag becomes a
          "verified at 4:31pm today" stamp.
        </p>
        <p>
          If a session moved, ended, or never existed,{" "}
          <Link href="https://github.com/c-tonneslan/bandstand/issues" className="inline">
            open an issue
          </Link>
          .
        </p>
        <p className="text-sm text-muted pt-4 border-t border-line">
          Not affiliated with any venue. No tickets sold here. No tracking, no analytics. Just a
          small site by someone who likes the music.
        </p>
      </div>
    </div>
  );
}

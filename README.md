# bandstand

Philly jazz, tonight. Gigs, residencies, jam sessions, and the rooms that host them.

Live at https://bandstand-bay.vercel.app.

## What

A small site that answers one question: where can I go hear jazz, or sit in on a session, in Philadelphia tonight or this week? The Philly jazz calendar lives in twelve places at once (Chris' has a real calendar, Heritage updates on Instagram, La Rose is word of mouth, Solar Myth piggybacks on Ars Nova, Time has a poster on the door). bandstand stitches them together.

## Stack

- Next.js 16 + TypeScript + Tailwind v4 + React 19, static SSG
- Per-venue scrapers under `src/scrapers/`, runner at `scripts/refresh.ts`
- All dates resolved in `America/New_York` so "tonight" doesn't drift at midnight UTC

## Local dev

```bash
npm install
npm run refresh    # pull latest from the venues we scrape
npm run dev        # http://localhost:3000
```

## Scrapers

Each scraper exports a `Scraper` thunk that returns `{ events, scrapedAt, warnings }`. A scraper failure keeps the previous batch for that venue so a parse error doesn't blow away good data.

Current scrapers:

- **chris-jazz-cafe** — `/events` page, ~54 events/week, two-set nights collapsed
- **south-jazz-kitchen** — `/jazz-club/` index → `/event/SLUG/` JSON-LD blocks, multi-day runs expanded

Hand-curated entries live in `src/data/venues.ts`, `src/data/series.ts`, and `src/data/events.ts`. Once a venue has a working scraper, its hand-curated entries are removed so the scraped data is the single source of truth.

## Nightly refresh

`.github/workflows/refresh.yml` runs once a day (09:00 UTC ≈ 4–5 AM ET): it re-runs the
scrapers (`npm run refresh`), commits the updated `scraped.json` + `first-seen.json` if
anything changed, and pushes. Vercel's git integration auto-deploys the commit, so the
listings stay current without a manual deploy — and the committed first-seen ledger keeps
`/new` (Just Announced) accurate over time. Trigger it by hand anytime with
`gh workflow run refresh.yml` (or the Actions tab).

Date-awareness is separate: the date-sensitive pages render per request (`force-dynamic`),
so "tonight" rolls over at midnight ET on its own even between refreshes.

## License

MIT.

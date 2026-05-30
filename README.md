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

## Nightly refresh on Vercel

The deploy pipeline runs the scraper before `next build` (see `prebuild` in `package.json`), so every fresh deploy bakes in current data.

To wire up a nightly refresh:

1. Create a Vercel Deploy Hook for the project (Vercel → Project → Settings → Git → Deploy Hooks). Save the URL.
2. In Vercel project Environment Variables, add:
   - `CRON_SECRET` — any random string. Vercel Cron sends it as `Authorization: Bearer <secret>`.
   - `VERCEL_DEPLOY_HOOK_URL` — the URL from step 1.
3. `vercel.json` already schedules `/api/cron/refresh` at `0 10 * * *` (10:00 UTC ≈ 5–6 AM ET). The route verifies the secret, then POSTs the Deploy Hook, which kicks a fresh build that re-runs the scrapers.

The cron path needs `CRON_SECRET` because Vercel Cron public routes are otherwise reachable by anyone.

## License

MIT.

// Run every scraper, merge the results, write to src/data/scraped.json.
// On per-scraper failure we keep the previous batch for that venue, so a
// broken parser doesn't blow away good data.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { scrapeArsNova } from "../src/scrapers/ars-nova";
import { scrapeChrisJazzCafe } from "../src/scrapers/chris-jazz-cafe";
import { scrapeJazzPhiladelphia } from "../src/scrapers/jazz-philadelphia";
import { scrapeSouthJazzKitchen } from "../src/scrapers/south-jazz-kitchen";
import { scrapeSquarespaceEvents } from "../src/scrapers/squarespace-events";
import type { ScrapeResult } from "../src/scrapers/types";

const OUT_PATH = join(import.meta.dirname, "..", "src", "data", "scraped.json");
const FIRST_SEEN_PATH = join(import.meta.dirname, "..", "src", "data", "first-seen.json");

interface ScrapedFile {
  generatedAt: string;
  byVenue: Record<string, ScrapeResult>;
}

// Stamp any event id we haven't seen before with now, so genuinely-new shows
// float to the top of /new. Existing ids keep their original timestamp; we
// never prune, so an event that drops off a calendar keeps its debut date.
function updateFirstSeen(byVenue: Record<string, ScrapeResult>) {
  const ledger: Record<string, string> = existsSync(FIRST_SEEN_PATH)
    ? JSON.parse(readFileSync(FIRST_SEEN_PATH, "utf-8"))
    : {};
  const now = new Date().toISOString();
  let added = 0;
  for (const batch of Object.values(byVenue)) {
    for (const e of batch.events) {
      if (!(e.id in ledger)) {
        ledger[e.id] = now;
        added++;
      }
    }
  }
  const sorted: Record<string, string> = {};
  for (const id of Object.keys(ledger).sort()) sorted[id] = ledger[id];
  writeFileSync(FIRST_SEEN_PATH, JSON.stringify(sorted, null, 2) + "\n");
  return added;
}

const scrapers = [
  { slug: "chris-jazz-cafe", run: scrapeChrisJazzCafe },
  { slug: "south-jazz-kitchen", run: scrapeSouthJazzKitchen },
  { slug: "jazz-philadelphia", run: scrapeJazzPhiladelphia },
  { slug: "ars-nova", run: scrapeArsNova },
  { slug: "squarespace", run: scrapeSquarespaceEvents },
];

async function main() {
  const existing: ScrapedFile = existsSync(OUT_PATH)
    ? JSON.parse(readFileSync(OUT_PATH, "utf-8"))
    : { generatedAt: new Date(0).toISOString(), byVenue: {} };

  const byVenue: Record<string, ScrapeResult> = { ...existing.byVenue };

  for (const { slug, run } of scrapers) {
    process.stdout.write(`scraping ${slug}... `);
    try {
      const result = await run();
      byVenue[slug] = result;
      process.stdout.write(
        `${result.events.length} events, ${result.warnings.length} warnings\n`,
      );
      for (const w of result.warnings) console.warn(`  ! ${w}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAILED: ${msg}`);
      console.error("  keeping previous batch for this venue.");
    }
  }

  const out: ScrapedFile = {
    generatedAt: new Date().toISOString(),
    byVenue,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  const total = Object.values(byVenue).reduce((n, r) => n + r.events.length, 0);
  console.log(`\nwrote ${total} events across ${Object.keys(byVenue).length} venues -> ${OUT_PATH}`);

  const added = updateFirstSeen(byVenue);
  console.log(`first-seen: +${added} new ids -> ${FIRST_SEEN_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

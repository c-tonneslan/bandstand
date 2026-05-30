import { venues } from "@/data/venues";
import { addDays, todayInPhilly } from "@/lib/dates";
import { icsResponse, renderIcs } from "@/lib/ics";
import { resolveOccurrences } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = venues.find((v) => v.slug === slug);
  if (!venue) return new Response("Not found", { status: 404 });

  const start = todayInPhilly();
  const end = addDays(start, 60);
  const occ = resolveOccurrences({ start, end }).filter((o) => o.venue.slug === slug);
  const body = renderIcs(
    `Bandstand · ${venue.name}`,
    `Upcoming nights at ${venue.name}, sixty days ahead`,
    occ,
  );
  return icsResponse(`bandstand-${slug}.ics`, body);
}

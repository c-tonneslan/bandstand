import { addDays, todayInPhilly } from "@/lib/dates";
import { icsResponse, renderIcs } from "@/lib/ics";
import { resolveOccurrences } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const start = todayInPhilly();
  const end = addDays(start, 7);
  const occ = resolveOccurrences({ start, end });
  const body = renderIcs(
    "Bandstand · This Week",
    "Philly jazz, next seven nights",
    occ,
  );
  return icsResponse("bandstand-week.ics", body);
}

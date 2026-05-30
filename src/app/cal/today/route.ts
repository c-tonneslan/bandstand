import { addDays, todayInPhilly } from "@/lib/dates";
import { icsResponse, renderIcs } from "@/lib/ics";
import { resolveOccurrences } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const start = todayInPhilly();
  const end = addDays(start, 1);
  const occ = resolveOccurrences({ start, end });
  const body = renderIcs(
    "Bandstand · Tonight",
    "Philly jazz tonight and tomorrow",
    occ,
  );
  return icsResponse("bandstand-tonight.ics", body);
}

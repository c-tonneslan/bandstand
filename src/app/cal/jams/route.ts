import { addDays, todayInPhilly } from "@/lib/dates";
import { icsResponse, renderIcs } from "@/lib/ics";
import { resolveOccurrences } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const start = todayInPhilly();
  const end = addDays(start, 28);
  const all = resolveOccurrences({ start, end });
  const jams = all.filter((o) => o.kind === "jam" || o.kind === "open-mic");
  const body = renderIcs(
    "Bandstand · Jams",
    "Philly jam sessions, four weeks ahead. Bring a horn.",
    jams,
  );
  return icsResponse("bandstand-jams.ics", body);
}

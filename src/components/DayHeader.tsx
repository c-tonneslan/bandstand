import { dayOfWeekInPhilly, formatHumanDate } from "@/lib/dates";

export function DayHeader({
  date,
  isToday,
  label,
}: {
  date: string;
  isToday?: boolean;
  label?: string;
}) {
  const wd = dayOfWeekInPhilly(date);
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="font-serif text-3xl">
        {label ?? formatHumanDate(date)}
        {isToday && <span className="dot ml-3" />}
      </h2>
      <span className="font-mono text-xs text-muted uppercase tracking-wider">
        {wd === "fri" || wd === "sat"
          ? "weekend"
          : wd === "sun" || wd === "mon" || wd === "tue"
            ? "early week"
            : "midweek"}
      </span>
    </div>
  );
}

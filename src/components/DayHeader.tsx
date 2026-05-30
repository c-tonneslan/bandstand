import { formatHumanDate } from "@/lib/dates";

export function DayHeader({
  date,
  isToday,
  label,
  weekdayChip,
}: {
  date: string;
  isToday?: boolean;
  label?: string;
  weekdayChip?: string;
}) {
  return (
    <div className="flex items-end gap-4 mb-3 border-b-2 border-foreground/80 pb-1">
      {weekdayChip && (
        <span className="hidden md:inline-block caps text-red translate-y-[-2px]">
          {weekdayChip}
        </span>
      )}
      <h2 className="font-serif italic text-3xl md:text-4xl leading-none">
        {label ?? formatHumanDate(date)}
      </h2>
      {isToday && <span className="dot mb-1" aria-label="today" />}
    </div>
  );
}

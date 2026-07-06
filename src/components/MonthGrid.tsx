"use client";

import { useMemo, useState } from "react";

import { OccurrenceCard } from "@/components/OccurrenceCard";
import type { Occurrence } from "@/data/types";
import { dayOfWeekInPhilly, formatHumanDate } from "@/lib/dates";

// A day's worth of the board. `inMonth` is false for the leading/trailing cells
// that pad a month grid out to full weeks.
interface Cell {
  ymd: string;
  dayNum: number;
  inMonth: boolean;
  items: Occurrence[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A month is "YYYY-MM". Everything below stays in Philly-local string space so we
// never do UTC day math.
function monthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Days in a given month, cheaply: day 0 of the next month.
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function stepMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function buildCells(month: string, byDate: Map<string, Occurrence[]>): Cell[] {
  const [y, m] = month.split("-").map(Number);
  const dim = daysInMonth(y, m);
  const cells: Cell[] = [];

  const firstYmd = `${month}-01`;
  const lead = DOW_INDEX[dayOfWeekInPhilly(firstYmd)];
  for (let i = 0; i < lead; i++) {
    cells.push({ ymd: "", dayNum: 0, inMonth: false, items: [] });
  }
  for (let d = 1; d <= dim; d++) {
    const ymd = `${month}-${String(d).padStart(2, "0")}`;
    cells.push({ ymd, dayNum: d, inMonth: true, items: byDate.get(ymd) ?? [] });
  }
  // Pad to a whole number of weeks.
  while (cells.length % 7 !== 0) {
    cells.push({ ymd: "", dayNum: 0, inMonth: false, items: [] });
  }
  return cells;
}

// Subtle density tint. Kept to a token-based accent wash so it reads in both
// themes and never fights the type.
function densityClass(n: number): string {
  if (n === 0) return "";
  if (n <= 2) return "bg-accent/[0.06]";
  if (n <= 4) return "bg-accent/[0.12]";
  return "bg-accent/[0.20]";
}

export function MonthGrid({ occ, today }: { occ: Occurrence[]; today: string }) {
  const byDate = useMemo(() => {
    const m = new Map<string, Occurrence[]>();
    for (const o of occ) {
      const arr = m.get(o.date) ?? [];
      arr.push(o);
      m.set(o.date, arr);
    }
    return m;
  }, [occ]);

  // Navigation bounds: the months we actually resolved data for.
  const [minMonth, maxMonth] = useMemo(() => {
    if (occ.length === 0) return [monthOf(today), monthOf(today)] as const;
    return [monthOf(occ[0].date), monthOf(occ[occ.length - 1].date)] as const;
  }, [occ, today]);

  const [month, setMonth] = useState(() => monthOf(today));
  const [selected, setSelected] = useState<string | null>(today);

  const cells = useMemo(() => buildCells(month, byDate), [month, byDate]);

  const canPrev = month > minMonth;
  const canNext = month < maxMonth;

  const selectedItems = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif italic text-3xl md:text-4xl">{monthLabel(month)}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!canPrev}
            onClick={() => setMonth((mm) => stepMonth(mm, -1))}
            aria-label="Previous month"
          >
            ← Prev
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!canNext}
            onClick={() => setMonth((mm) => stepMonth(mm, 1))}
            aria-label="Next month"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Desktop / tablet: real month grid. */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} className="caps text-muted text-center pb-2 border-b border-line">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => (
            <DayCell
              key={c.ymd || `pad-${i}`}
              cell={c}
              isToday={c.ymd === today}
              isSelected={c.ymd === selected}
              onSelect={() => c.inMonth && setSelected(c.ymd)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: a compact heatmap strip, then a scrollable agenda. Never wider
          than the viewport at 375px. */}
      <div className="sm:hidden">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="caps text-muted text-center text-[0.55rem]">
              {w.slice(0, 1)}
            </div>
          ))}
          {cells.map((c, i) => (
            <button
              key={c.ymd || `hpad-${i}`}
              type="button"
              disabled={!c.inMonth}
              onClick={() => setSelected(c.ymd)}
              aria-label={c.ymd ? `${formatHumanDate(c.ymd)}, ${c.items.length} listings` : undefined}
              aria-pressed={c.ymd === selected}
              className={
                "aspect-square rounded flex items-center justify-center text-xs tnum " +
                (c.inMonth ? densityClass(c.items.length) : "opacity-0") +
                (c.ymd === today ? " ring-1 ring-accent" : "") +
                (c.ymd === selected ? " outline outline-2 outline-foreground" : "")
              }
            >
              {c.dayNum || ""}
            </button>
          ))}
        </div>
      </div>

      {/* Selected-day detail. Reused on both breakpoints. */}
      <div className="mt-10 border-t-2 border-foreground/80 pt-6">
        {selected ? (
          <>
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="font-serif italic text-2xl">{formatHumanDate(selected)}</h3>
              <span className="caps text-muted tnum">
                {selectedItems.length} {selectedItems.length === 1 ? "listing" : "listings"}
              </span>
              {selected === today && <span className="dot" aria-label="today" />}
            </div>
            {selectedItems.length === 0 ? (
              <p className="text-muted text-sm border border-line p-4">
                Nothing indexed for this date yet. Quiet night — or we just haven&rsquo;t caught it.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {selectedItems.map((o) => (
                  <OccurrenceCard key={o.id} o={o} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted text-sm">Pick a day to see what&rsquo;s on.</p>
        )}
      </div>
    </div>
  );
}

function DayCell({
  cell,
  isToday,
  isSelected,
  onSelect,
}: {
  cell: Cell;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  if (!cell.inMonth) {
    return <div className="border-b border-r border-line/50 min-h-24" aria-hidden="true" />;
  }
  const extra = cell.items.length - 3;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${formatHumanDate(cell.ymd)}, ${cell.items.length} listings`}
      className={
        "text-left border-b border-r border-line/50 min-h-24 p-1.5 transition-colors duration-[--dur] hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent " +
        densityClass(cell.items.length) +
        (isSelected ? " ring-2 ring-inset ring-foreground" : "")
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "tnum text-sm " +
            (isToday ? "font-bold text-accent" : "text-muted")
          }
        >
          {cell.dayNum}
        </span>
        {cell.items.length > 0 && (
          <span className="caps text-muted/80 tnum">{cell.items.length}</span>
        )}
      </div>
      <ul className="mt-1 space-y-0.5">
        {cell.items.slice(0, 3).map((o) => (
          <li
            key={o.id}
            className="text-[0.7rem] leading-tight truncate text-foreground/90"
            title={`${o.name} · ${o.venue.name}`}
          >
            {o.name}
          </li>
        ))}
        {extra > 0 && <li className="caps text-accent">+{extra} more</li>}
      </ul>
    </button>
  );
}

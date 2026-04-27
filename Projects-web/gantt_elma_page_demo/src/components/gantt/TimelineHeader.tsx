"use client";

import { DateCell } from "@/types/planning";

interface TimelineHeaderProps {
  dates: DateCell[];
  dayWidth: number;
}

export function TimelineHeader({ dates, dayWidth }: TimelineHeaderProps) {
  const groups = dates.reduce<Array<{ key: string; label: string; count: number }>>(
    (acc, date) => {
      const prev = acc[acc.length - 1];
      if (!prev || prev.key !== date.monthKey) {
        acc.push({ key: date.monthKey, label: date.monthLabel, count: 1 });
      } else {
        prev.count += 1;
      }
      return acc;
    },
    []
  );

  return (
    <div className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100">
      <div className="flex border-b border-slate-300 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {groups.map((group) => (
          <div
            key={group.key}
            className="border-r border-slate-300 px-2 py-1"
            style={{ width: group.count * dayWidth }}
          >
            {group.label}
          </div>
        ))}
      </div>
      <div className="flex text-[11px] text-slate-700">
        {dates.map((date) => (
          <div
            key={date.date}
            className={`flex h-7 items-center justify-center border-r border-slate-300 ${
              date.isWeekend ? "bg-slate-200" : "bg-slate-50"
            }`}
            style={{ width: dayWidth }}
            title={date.date}
          >
            {date.day}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { DateCell, Engineer, ViewMode } from "@/types/planning";

interface ResourceRowProps {
  engineer: Engineer;
  dates: DateCell[];
  values: Record<string, number>;
  dayWidth: number;
  mode: ViewMode;
  expanded: boolean;
  onToggle: () => void;
}

export function ResourceRow({
  engineer,
  dates,
  values,
  dayWidth,
  mode,
  expanded,
  onToggle,
}: ResourceRowProps) {
  return (
    <div className="flex h-9 border-b border-slate-200 text-[11px]">
      <button
        type="button"
        className="flex w-72 items-center gap-2 border-r border-slate-300 bg-white px-2 text-left hover:bg-slate-50"
        onClick={onToggle}
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: engineer.color }}
        >
          {engineer.shortName}
        </span>
        <span className="truncate">{engineer.name}</span>
        <span className="ml-auto text-slate-400">{expanded ? "▾" : "▸"}</span>
      </button>
      <div className="flex">
        {dates.map((date) => {
          const value = values[date.date] ?? 0;
          const overloaded = mode === "hours" && value > engineer.capacity;
          return (
            <div
              key={`${engineer.id}-${date.date}`}
              className={`flex items-center justify-center border-r border-slate-200 ${
                overloaded
                  ? "bg-red-100 text-red-700"
                  : date.isWeekend
                  ? "bg-slate-100 text-slate-500"
                  : "bg-white text-slate-700"
              }`}
              style={{ width: dayWidth }}
              title={
                mode === "hours"
                  ? `загрузка ${value.toFixed(1)} инж.ч., мощность ${engineer.capacity.toFixed(1)} инж.ч.`
                  : `${value} карточек`
              }
            >
              {value > 0 ? (mode === "hours" ? value.toFixed(1) : value) : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

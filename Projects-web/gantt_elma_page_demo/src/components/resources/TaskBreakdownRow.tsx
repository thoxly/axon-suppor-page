"use client";

import { DateCell, PlanningTask, ViewMode } from "@/types/planning";

interface TaskBreakdownRowProps {
  task: PlanningTask;
  dates: DateCell[];
  dayWidth: number;
  labelWidth: number;
  mode: ViewMode;
  expanded: boolean;
  onToggle: () => void;
  onDailyLcChange: (taskId: string, date: string, value: number) => void;
}

export function TaskBreakdownRow({
  task,
  dates,
  dayWidth,
  labelWidth,
  mode,
  expanded,
  onToggle,
  onDailyLcChange,
}: TaskBreakdownRowProps) {
  const dailyMap = new Map(task.dailyLc.map((item) => [item.date, item.value]));

  return (
    <>
      <div className="flex h-8 border-b border-slate-200 text-[11px]">
        <button
          type="button"
          className="flex items-center gap-2 border-r border-slate-300 bg-slate-50 px-3 text-left hover:bg-slate-100"
          style={{ width: labelWidth, minWidth: labelWidth }}
          onClick={onToggle}
        >
          <span className="text-slate-500">{expanded ? "▾" : "▸"}</span>
          <span className="truncate">
            {task.idPlan} · {task.productType} · {task.projectName}
          </span>
        </button>
        <div className="relative flex">
          {dates.map((date) => {
            const inRange = date.date >= task.startDate && date.date <= task.finalDate;
            const value = dailyMap.get(date.date) ?? 0;
            return (
              <div
                key={`${task.id}-${date.date}`}
                className={`flex items-center justify-center border-r border-slate-200 ${
                  inRange ? "bg-emerald-50 text-emerald-700" : date.isWeekend ? "bg-slate-100" : "bg-white"
                }`}
                style={{ width: dayWidth }}
              >
                {inRange ? (mode === "hours" ? value.toFixed(1) : 1) : ""}
              </div>
            );
          })}
        </div>
      </div>
      {expanded && (
        <div className="flex h-9 border-b border-slate-200 text-[11px]">
          <div
            className="flex items-center border-r border-slate-300 bg-white px-4 text-slate-500"
            style={{ width: labelWidth, minWidth: labelWidth }}
          >
            Daily_LC (шаг 0.1)
          </div>
          <div className="flex">
            {dates.map((date) => {
              const inRange = date.date >= task.startDate && date.date <= task.finalDate;
              const value = dailyMap.get(date.date) ?? 0;
              return (
                <div
                  key={`${task.id}-edit-${date.date}`}
                  className={`flex items-center justify-center border-r border-slate-200 ${
                    inRange ? "bg-white" : "bg-slate-50"
                  }`}
                  style={{ width: dayWidth }}
                >
                  {inRange ? (
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={value}
                      onChange={(event) =>
                        onDailyLcChange(task.id, date.date, Number(event.target.value))
                      }
                      className="h-6 w-[90%] rounded border border-slate-300 px-1 text-center text-[11px]"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

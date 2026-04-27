"use client";

import { useEffect, useMemo, useRef } from "react";
import { TimelineHeader } from "@/components/gantt/TimelineHeader";
import { resizeTask, shiftTask } from "@/lib/planning";
import { DateCell, Engineer, PlanningTask } from "@/types/planning";

interface GanttGridProps {
  tasks: PlanningTask[];
  dates: DateCell[];
  engineers: Engineer[];
  dayWidth: number;
  scrollLeft: number;
  onScroll: (scrollLeft: number) => void;
  onTaskUpdate: (taskId: string, nextTask: PlanningTask) => void;
}

type DragMode = "move" | "start" | "end";

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  sourceTask: PlanningTask;
}

const rowHeight = 36;

export function GanttGrid({
  tasks,
  dates,
  engineers,
  dayWidth,
  scrollLeft,
  onScroll,
  onTaskUpdate,
}: GanttGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dateIndex = useMemo(
    () => new Map(dates.map((date, index) => [date.date, index])),
    [dates]
  );
  const engineerMap = useMemo(
    () => new Map(engineers.map((engineer) => [engineer.id, engineer])),
    [engineers]
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (Math.abs(node.scrollLeft - scrollLeft) > 1) {
      node.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      const deltaDays = Math.round((event.clientX - state.startX) / dayWidth);
      if (deltaDays === 0) return;
      const liveSource = tasks.find((task) => task.id === state.taskId) ?? state.sourceTask;
      const nextTask =
        state.mode === "move"
          ? shiftTask(state.sourceTask, deltaDays)
          : resizeTask(state.sourceTask, state.mode === "start" ? "start" : "end", deltaDays);
      if (nextTask.startDate === liveSource.startDate && nextTask.finalDate === liveSource.finalDate) {
        return;
      }
      onTaskUpdate(state.taskId, nextTask);
    };
    const onPointerUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dayWidth, onTaskUpdate, tasks]);

  const todayIndex = dates.findIndex((date) => date.isToday);
  const timelineWidth = dates.length * dayWidth;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-white"
      onScroll={(event) => onScroll(event.currentTarget.scrollLeft)}
    >
      <div style={{ width: timelineWidth }}>
        <TimelineHeader dates={dates} dayWidth={dayWidth} />
        <div className="relative">
          {todayIndex >= 0 && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10"
              style={{ left: todayIndex * dayWidth }}
            >
              <div className="h-full border-l-2 border-red-500/80" />
              <span className="absolute -top-5 left-1 rounded bg-red-500 px-1 text-[10px] text-white">
                Сегодня
              </span>
            </div>
          )}
          {tasks.map((task, rowIndex) => {
            const startIndex = dateIndex.get(task.startDate) ?? 0;
            const endIndex = dateIndex.get(task.finalDate) ?? startIndex;
            const width = Math.max((endIndex - startIndex + 1) * dayWidth - 6, dayWidth / 2);
            const left = startIndex * dayWidth + 3;
            const engineer = engineerMap.get(task.authorId);
            return (
              <div
                key={task.id}
                className="relative border-b border-slate-200 even:bg-slate-50/60"
                style={{ height: rowHeight }}
              >
                {dates.map((date) => (
                  <div
                    key={`${task.id}-${date.date}`}
                    className={`absolute bottom-0 top-0 border-r border-slate-200 ${
                      date.isWeekend ? "bg-slate-100/70" : ""
                    }`}
                    style={{ left: (dateIndex.get(date.date) ?? 0) * dayWidth, width: dayWidth }}
                  />
                ))}
                <div
                  className="absolute top-1/2 z-20 flex h-6 -translate-y-1/2 items-center rounded bg-emerald-500/85 shadow-md"
                  style={{ left, width }}
                >
                  <button
                    type="button"
                    className="h-full w-2 cursor-ew-resize rounded-l bg-emerald-700/70"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      dragRef.current = { taskId: task.id, mode: "start", startX: event.clientX, sourceTask: task };
                    }}
                  />
                  <button
                    type="button"
                    className="h-full flex-1 cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      dragRef.current = { taskId: task.id, mode: "move", startX: event.clientX, sourceTask: task };
                    }}
                    title={`${task.projectName} (${task.startDate} - ${task.finalDate})`}
                  />
                  <button
                    type="button"
                    className="h-full w-2 cursor-ew-resize rounded-r bg-emerald-700/70"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      dragRef.current = { taskId: task.id, mode: "end", startX: event.clientX, sourceTask: task };
                    }}
                  />
                </div>
                <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2">
                  <div
                    className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white shadow"
                    style={{ backgroundColor: engineer?.color ?? "#64748b" }}
                    title={engineer?.name ?? "Исполнитель"}
                  >
                    {engineer?.shortName ?? "?"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

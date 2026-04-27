"use client";

import { useEffect, useRef } from "react";
import { ResourceRow } from "@/components/resources/ResourceRow";
import { TaskBreakdownRow } from "@/components/resources/TaskBreakdownRow";
import { DateCell, Engineer, PlanningTask, ViewMode } from "@/types/planning";

interface ResourceMatrixProps {
  engineers: Engineer[];
  tasks: PlanningTask[];
  dates: DateCell[];
  dayWidth: number;
  labelWidth: number;
  mode: ViewMode;
  loadMap: Record<string, Record<string, number>>;
  cardMap: Record<string, Record<string, number>>;
  expandedEngineers: string[];
  expandedTasks: string[];
  onToggleEngineer: (id: string) => void;
  onToggleTask: (id: string) => void;
  onDailyLcChange: (taskId: string, date: string, value: number) => void;
  onReorderEngineer: (fromEngineerId: string, toEngineerId: string) => void;
  scrollLeft: number;
  onScroll: (scrollLeft: number) => void;
}

export function ResourceMatrix({
  engineers,
  tasks,
  dates,
  dayWidth,
  labelWidth,
  mode,
  loadMap,
  cardMap,
  expandedEngineers,
  expandedTasks,
  onToggleEngineer,
  onToggleTask,
  onDailyLcChange,
  onReorderEngineer,
  scrollLeft,
  onScroll,
}: ResourceMatrixProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggedEngineerRef = useRef<string | null>(null);
  const width = dates.length * dayWidth;
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (Math.abs(node.scrollLeft - scrollLeft) > 1) {
      node.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto border-t border-slate-300 bg-white"
      onScroll={(event) => onScroll(event.currentTarget.scrollLeft)}
    >
      <div style={{ minWidth: labelWidth + width }}>
        <div className="sticky top-0 z-20 flex h-9 border-b border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700">
          <div
            className="flex items-center border-r border-slate-300 px-2"
            style={{ width: labelWidth, minWidth: labelWidth }}
          >
            Ресурсное планирование
          </div>
          <div className="flex" style={{ width }}>
            {dates.map((date) => (
              <div
                key={`header-${date.date}`}
                className={`flex items-center justify-center border-r border-slate-300 ${
                  date.isWeekend ? "bg-slate-200" : "bg-slate-50"
                }`}
                style={{ width: dayWidth }}
              >
                {date.day}
              </div>
            ))}
          </div>
        </div>
        {engineers.map((engineer) => {
          const engineerTasks = tasks.filter((task) => task.authorId === engineer.id);
          const expanded = expandedEngineers.includes(engineer.id);
          const values = mode === "hours" ? loadMap[engineer.id] ?? {} : cardMap[engineer.id] ?? {};
          return (
            <div key={engineer.id}>
              <ResourceRow
                engineer={engineer}
                dates={dates}
                values={values}
                dayWidth={dayWidth}
                labelWidth={labelWidth}
                mode={mode}
                expanded={expanded}
                onToggle={() => onToggleEngineer(engineer.id)}
                onDragStart={() => {
                  draggedEngineerRef.current = engineer.id;
                }}
                onDropRow={() => {
                  const fromEngineerId = draggedEngineerRef.current;
                  if (!fromEngineerId || fromEngineerId === engineer.id) return;
                  onReorderEngineer(fromEngineerId, engineer.id);
                  draggedEngineerRef.current = null;
                }}
              />
              {expanded &&
                engineerTasks.map((task) => (
                  <TaskBreakdownRow
                    key={task.id}
                    task={task}
                    dates={dates}
                    dayWidth={dayWidth}
                    labelWidth={labelWidth}
                    mode={mode}
                    expanded={expandedTasks.includes(task.id)}
                    onToggle={() => onToggleTask(task.id)}
                    onDailyLcChange={onDailyLcChange}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

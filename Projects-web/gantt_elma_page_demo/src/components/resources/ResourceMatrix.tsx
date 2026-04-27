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

  const monthGroups = dates.reduce<Array<{ key: string; label: string; count: number }>>(
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
    <div
      ref={containerRef}
      className="h-full overflow-auto border-t border-slate-200 bg-white"
      onScroll={(event) => onScroll(event.currentTarget.scrollLeft)}
    >
      <div style={{ minWidth: labelWidth + width }}>
        {/* 2-level sticky header matching TimelineHeader */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50">
          {/* Row 1: label + month groups */}
          <div className="flex border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <div
              className="flex items-center border-r border-slate-200 px-3 text-[11px] font-semibold normal-case tracking-normal text-slate-600"
              style={{ width: labelWidth, minWidth: labelWidth }}
            >
              Ресурсная ведомость
            </div>
            <div className="flex">
              {monthGroups.map((group) => (
                <div
                  key={group.key}
                  className="border-r border-slate-200 px-2 py-1"
                  style={{ width: group.count * dayWidth }}
                >
                  {group.label}
                </div>
              ))}
            </div>
          </div>
          {/* Row 2: empty label spacer + day numbers */}
          <div className="flex text-[11px] text-slate-600">
            <div
              className="border-r border-slate-200"
              style={{ width: labelWidth, minWidth: labelWidth }}
            />
            <div className="flex">
              {dates.map((date) => (
                <div
                  key={`header-${date.date}`}
                  className={`flex h-7 items-center justify-center border-r border-slate-200 ${
                    date.isWeekend ? "bg-slate-100 text-slate-400" : "bg-white"
                  }`}
                  style={{ width: dayWidth }}
                >
                  {date.day}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Engineer rows */}
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

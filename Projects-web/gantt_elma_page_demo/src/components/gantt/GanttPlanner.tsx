"use client";

import { useEffect, useMemo, useState } from "react";
import { GanttGrid } from "@/components/gantt/GanttGrid";
import { TaskTable } from "@/components/gantt/TaskTable";
import { ResourceMatrix } from "@/components/resources/ResourceMatrix";
import { dateRange, defaultColumns, engineers, initialTasks } from "@/data/mockData";
import { buildDateCells } from "@/lib/date";
import {
  buildEngineerLoadMap,
  loadCardsByEngineer,
  normalizeTask,
  updateTaskDailyValue,
} from "@/lib/planning";
import { loadPlannerState, savePlannerState } from "@/lib/storage";
import { ColumnConfig, PlanningTask, TimelineScale, ViewMode } from "@/types/planning";

interface GanttPlannerProps {
  embed?: boolean;
}

const dayWidthByScale: Record<TimelineScale, number> = {
  day: 34,
  week: 18,
  month: 10,
};
const TASK_DRAG_HANDLE_WIDTH = 28;

export function GanttPlanner({ embed = false }: GanttPlannerProps) {
  const [tasks, setTasks] = useState<PlanningTask[]>(() => initialTasks.map(normalizeTask));
  const [engineerList, setEngineerList] = useState(engineers);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [scale, setScale] = useState<TimelineScale>("day");
  const [viewMode, setViewMode] = useState<ViewMode>("hours");
  const [search, setSearch] = useState("");
  const [expandedEngineers, setExpandedEngineers] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [sharedScrollLeft, setSharedScrollLeft] = useState(0);

  useEffect(() => {
    const persisted = loadPlannerState();
    if (!persisted) return;
    setTasks(persisted.tasks.map(normalizeTask));
    setColumns(persisted.columns);
    setScale(persisted.scale);
    if (persisted.engineerIds?.length) {
      const source = new Map(engineers.map((engineer) => [engineer.id, engineer]));
      const ordered = persisted.engineerIds
        .map((id) => source.get(id))
        .filter((item): item is (typeof engineers)[number] => Boolean(item));
      const missed = engineers.filter(
        (engineer) => !ordered.find((orderedEngineer) => orderedEngineer.id === engineer.id)
      );
      setEngineerList([...ordered, ...missed]);
    }
  }, []);

  useEffect(() => {
    savePlannerState({
      tasks,
      columns,
      scale,
      engineerIds: engineerList.map((engineer) => engineer.id),
    });
  }, [tasks, columns, scale, engineerList]);

  const dates = useMemo(
    () => buildDateCells(dateRange.start, dateRange.end),
    []
  );
  const dayWidth = dayWidthByScale[scale];
  const authorMap = useMemo(
    () => Object.fromEntries(engineerList.map((engineer) => [engineer.id, engineer.name])),
    [engineerList]
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [
        task.idPlan,
        task.productType,
        task.projectType,
        task.actionType,
        task.customer,
        task.projectName,
        task.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [tasks, search]);

  const loadMap = useMemo(
    () => buildEngineerLoadMap(filteredTasks, dates),
    [filteredTasks, dates]
  );
  const cardMap = useMemo(
    () => loadCardsByEngineer(filteredTasks, dates),
    [filteredTasks, dates]
  );

  const tableWidth = useMemo(
    () =>
      TASK_DRAG_HANDLE_WIDTH +
      columns.filter((column) => column.visible).reduce((sum, column) => sum + column.width, 0),
    [columns]
  );

  const updateTask = (taskId: string, nextTask: PlanningTask) => {
    setTasks((previous) =>
      previous.map((task) => (task.id === taskId ? normalizeTask(nextTask) : task))
    );
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100 text-slate-900">
      {!embed && (
        <div className="flex h-14 items-center gap-3 border-b border-slate-300 bg-white px-4 shadow-sm">
          <h1 className="text-sm font-semibold tracking-tight">
            ELMA365 Gantt / Resource Planning Demo
          </h1>
          <div className="ml-2 flex items-center rounded border border-slate-300 bg-slate-50 p-1 text-xs">
            {(["day", "week", "month"] as TimelineScale[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setScale(item)}
                className={`rounded px-2 py-1 ${
                  scale === item ? "bg-slate-700 text-white" : "text-slate-600"
                }`}
              >
                {item === "day" ? "День" : item === "week" ? "Неделя" : "Месяц"}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по задачам..."
            className="ml-auto h-8 w-72 rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-slate-500"
          />
        </div>
      )}

      <div className={`${embed ? "h-full" : "h-[60%]"} min-h-[320px]`}>
        <div className="grid h-full" style={{ gridTemplateColumns: `${tableWidth}px 1fr` }}>
          <TaskTable
            tasks={filteredTasks}
            columns={columns}
            authorNames={authorMap}
            onToggleColumn={(key) => {
              setColumns((previous) =>
                previous.map((column) =>
                  column.key === key ? { ...column, visible: !column.visible } : column
                )
              );
            }}
            onResizeColumn={(key, width) => {
              setColumns((previous) =>
                previous.map((column) =>
                  column.key === key ? { ...column, width } : column
                )
              );
            }}
            onMoveColumn={(key, direction) => {
              setColumns((previous) => {
                const idx = previous.findIndex((column) => column.key === key);
                if (idx < 0) return previous;
                const target = direction === "left" ? idx - 1 : idx + 1;
                if (target < 0 || target >= previous.length) return previous;
                const next = [...previous];
                [next[idx], next[target]] = [next[target], next[idx]];
                return next;
              });
            }}
            onReorderTask={(fromTaskId, toTaskId) => {
              setTasks((previous) => {
                const fromIndex = previous.findIndex((task) => task.id === fromTaskId);
                const toIndex = previous.findIndex((task) => task.id === toTaskId);
                if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return previous;
                const next = [...previous];
                const [moved] = next.splice(fromIndex, 1);
                next.splice(toIndex, 0, moved);
                return next;
              });
            }}
          />
          <GanttGrid
            tasks={filteredTasks}
            dates={dates}
            engineers={engineerList}
            dayWidth={dayWidth}
            scrollLeft={sharedScrollLeft}
            onScroll={setSharedScrollLeft}
            onTaskUpdate={updateTask}
          />
        </div>
      </div>

      {!embed && (
        <div className="flex h-8 items-center border-y border-slate-300 bg-slate-100 px-3 text-xs text-slate-600">
          <span className="text-slate-500">Ресурсная ведомость</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1">Режим:</span>
            <button
              type="button"
              onClick={() => setViewMode("hours")}
              className={`rounded px-2 py-1 ${viewMode === "hours" ? "bg-slate-700 text-white" : "bg-white"}`}
            >
              Часы
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded px-2 py-1 ${viewMode === "cards" ? "bg-slate-700 text-white" : "bg-white"}`}
            >
              Карточки
            </button>
          </div>
        </div>
      )}

      <div className={`${embed ? "h-full" : "h-[40%]"} min-h-[220px]`}>
        <ResourceMatrix
          engineers={engineerList}
          tasks={filteredTasks}
          dates={dates}
          dayWidth={dayWidth}
          labelWidth={tableWidth}
          mode={viewMode}
          loadMap={loadMap}
          cardMap={cardMap}
          expandedEngineers={expandedEngineers}
          expandedTasks={expandedTasks}
          onToggleEngineer={(id) =>
            setExpandedEngineers((previous) =>
              previous.includes(id)
                ? previous.filter((item) => item !== id)
                : [...previous, id]
            )
          }
          onToggleTask={(id) =>
            setExpandedTasks((previous) =>
              previous.includes(id)
                ? previous.filter((item) => item !== id)
                : [...previous, id]
            )
          }
          onDailyLcChange={(taskId, date, value) => {
            setTasks((previous) =>
              previous.map((task) =>
                task.id === taskId ? updateTaskDailyValue(task, date, value) : task
              )
            );
          }}
          onReorderEngineer={(fromEngineerId, toEngineerId) => {
            setEngineerList((previous) => {
              const fromIndex = previous.findIndex((engineer) => engineer.id === fromEngineerId);
              const toIndex = previous.findIndex((engineer) => engineer.id === toEngineerId);
              if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return previous;
              const next = [...previous];
              const [moved] = next.splice(fromIndex, 1);
              next.splice(toIndex, 0, moved);
              return next;
            });
          }}
          scrollLeft={sharedScrollLeft}
          onScroll={setSharedScrollLeft}
        />
      </div>
    </div>
  );
}

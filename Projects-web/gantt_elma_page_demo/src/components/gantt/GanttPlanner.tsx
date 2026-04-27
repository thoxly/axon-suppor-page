"use client";

import { useEffect, useMemo, useState } from "react";
import { GanttGrid } from "@/components/gantt/GanttGrid";
import { TaskDrawer } from "@/components/gantt/TaskDrawer";
import { TaskTable } from "@/components/gantt/TaskTable";
import { ResourceMatrix } from "@/components/resources/ResourceMatrix";
import { dateRange, defaultColumns, defaultDependencies, engineers, initialTasks } from "@/data/mockData";
import { buildDateCells } from "@/lib/date";
import {
  buildEngineerLoadMap,
  loadCardsByEngineer,
  normalizeTask,
  updateTaskDailyValue,
} from "@/lib/planning";
import { loadPlannerState, savePlannerState } from "@/lib/storage";
import {
  ColumnConfig,
  Dependency,
  PlanningTask,
  TimelineScale,
  ViewMode,
} from "@/types/planning";

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
  const [resourceOpen, setResourceOpen] = useState(true);
  const [dependencies, setDependencies] = useState<Dependency[]>(defaultDependencies);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const persisted = loadPlannerState();
    if (!persisted) return;
    setTasks(persisted.tasks.map(normalizeTask));
    setColumns(persisted.columns);
    setScale(persisted.scale);
    if (persisted.dependencies) {
      setDependencies(persisted.dependencies);
    }
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
      dependencies,
    });
  }, [tasks, columns, scale, engineerList, dependencies]);

  const dates = useMemo(() => buildDateCells(dateRange.start, dateRange.end), []);
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

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const columnHandlers = {
    onToggleColumn: (key: string) => {
      setColumns((prev) =>
        prev.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
      );
    },
    onResizeColumn: (key: string, width: number) => {
      setColumns((prev) =>
        prev.map((col) => (col.key === key ? { ...col, width } : col))
      );
    },
    onMoveColumn: (key: string, direction: "left" | "right") => {
      setColumns((prev) => {
        const idx = prev.findIndex((col) => col.key === key);
        if (idx < 0) return prev;
        const target = direction === "left" ? idx - 1 : idx + 1;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      });
    },
    onReorderTask: (fromTaskId: string, toTaskId: string) => {
      setTasks((prev) => {
        const fromIndex = prev.findIndex((t) => t.id === fromTaskId);
        const toIndex = prev.findIndex((t) => t.id === toTaskId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
  };

  const ganttContent = (
    <div className="grid h-full" style={{ gridTemplateColumns: `${tableWidth}px 1fr` }}>
      <TaskTable
        tasks={filteredTasks}
        columns={columns}
        authorNames={authorMap}
        {...columnHandlers}
      />
      <GanttGrid
        tasks={filteredTasks}
        dates={dates}
        engineers={engineerList}
        dayWidth={dayWidth}
        scrollLeft={sharedScrollLeft}
        onScroll={setSharedScrollLeft}
        onTaskUpdate={updateTask}
        dependencies={dependencies}
        selectedTaskId={selectedTaskId}
        onTaskSelect={setSelectedTaskId}
        onAddDependency={(dep) => setDependencies((prev) => [...prev, dep])}
        onRemoveDependency={(depId) =>
          setDependencies((prev) => prev.filter((d) => d.id !== depId))
        }
      />
    </div>
  );

  const resourceContent = (
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
        setExpandedEngineers((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
      }
      onToggleTask={(id) =>
        setExpandedTasks((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
      }
      onDailyLcChange={(taskId, date, value) => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? updateTaskDailyValue(task, date, value) : task
          )
        );
      }}
      onReorderEngineer={(fromEngineerId, toEngineerId) => {
        setEngineerList((prev) => {
          const fromIndex = prev.findIndex((e) => e.id === fromEngineerId);
          const toIndex = prev.findIndex((e) => e.id === toEngineerId);
          if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return next;
        });
      }}
      scrollLeft={sharedScrollLeft}
      onScroll={setSharedScrollLeft}
    />
  );

  if (embed) {
    return (
      <div className="flex h-full w-full flex-col bg-white text-slate-900">
        <div className="min-h-0 flex-[3]">{ganttContent}</div>
        <div className="min-h-0 flex-[2]">{resourceContent}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-white text-slate-900">
      {/* Top toolbar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5">
        <div className="flex items-center gap-2 mr-1">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            className="text-slate-700"
          >
            <rect x="1" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1v3M9 1v3M13 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 9h4M5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-semibold text-slate-800">ELMA365 Gantt</span>
          <span className="text-slate-300">·</span>
          <span className="text-[12px] text-slate-400">Ресурсное планирование</span>
        </div>

        {/* Scale toggle */}
        <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {(["day", "week", "month"] as TimelineScale[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScale(item)}
              className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                scale === item
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {item === "day" ? "День" : item === "week" ? "Неделя" : "Месяц"}
            </button>
          ))}
        </div>

        {/* Dependency legend */}
        <div className="ml-1 hidden items-center gap-3 xl:flex">
          {(
            [
              ["FS", "#3b82f6", "Конец→Начало"],
              ["SS", "#16a34a", "Начало→Начало"],
              ["FF", "#8b5cf6", "Конец→Конец"],
              ["SF", "#f59e0b", "Начало→Конец"],
            ] as const
          ).map(([type, color, label]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className="h-0.5 w-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] text-slate-400">
                {type} — {label}
              </span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по задачам..."
              className="h-8 w-60 rounded-md border border-slate-200 bg-slate-50 pl-7 pr-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Gantt section */}
        <div className={`min-h-0 ${resourceOpen ? "flex-[3]" : "flex-1"}`}>
          {ganttContent}
        </div>

        {/* Divider / resource toolbar */}
        <div className="flex h-9 shrink-0 items-center gap-3 border-y border-slate-200 bg-slate-50 px-4">
          <button
            type="button"
            onClick={() => setResourceOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-200 ${resourceOpen ? "" : "-rotate-90"}`}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ресурсная ведомость
          </button>

          {resourceOpen && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Режим:</span>
              <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                {(["hours", "cards"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      viewMode === m
                        ? "bg-slate-800 text-white"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m === "hours" ? "Часы" : "Карточки"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resource section */}
        {resourceOpen && <div className="min-h-0 flex-[2]">{resourceContent}</div>}
      </div>

      {/* Task detail drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          tasks={tasks}
          engineers={engineerList}
          dependencies={dependencies}
          onClose={() => setSelectedTaskId(null)}
          onRemoveDependency={(depId) =>
            setDependencies((prev) => prev.filter((d) => d.id !== depId))
          }
        />
      )}
    </div>
  );
}

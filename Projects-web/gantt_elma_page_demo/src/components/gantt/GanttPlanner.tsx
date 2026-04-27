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
import { clearPlannerState, loadPlannerState, savePlannerState } from "@/lib/storage";
import { ColumnConfig, PlanningTask, TimelineScale, ViewMode } from "@/types/planning";

interface GanttPlannerProps {
  embed?: boolean;
}

const dayWidthByScale: Record<TimelineScale, number> = {
  day: 34,
  week: 18,
  month: 10,
};

export function GanttPlanner({ embed = false }: GanttPlannerProps) {
  const [tasks, setTasks] = useState<PlanningTask[]>(() => initialTasks.map(normalizeTask));
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [scale, setScale] = useState<TimelineScale>("day");
  const [viewMode, setViewMode] = useState<ViewMode>("hours");
  const [search, setSearch] = useState("");
  const [expandedEngineers, setExpandedEngineers] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [sharedScrollLeft, setSharedScrollLeft] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const persisted = loadPlannerState();
    if (!persisted) return;
    setTasks(persisted.tasks.map(normalizeTask));
    setColumns(persisted.columns);
    setScale(persisted.scale);
  }, []);

  useEffect(() => {
    savePlannerState({ tasks, columns, scale });
  }, [tasks, columns, scale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dates = useMemo(
    () => buildDateCells(dateRange.start, dateRange.end),
    []
  );
  const dayWidth = dayWidthByScale[scale];
  const authorMap = useMemo(
    () => Object.fromEntries(engineers.map((engineer) => [engineer.id, engineer.name])),
    []
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
    () => columns.filter((column) => column.visible).reduce((sum, column) => sum + column.width, 0),
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
        <div className="flex h-14 items-center gap-2 border-b border-slate-300 bg-white px-3 shadow-sm">
          <h1 className="mr-2 text-sm font-semibold">
            ELMA365 Gantt / Resource Planning Demo
          </h1>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
            onClick={() => {
              savePlannerState({ tasks, columns, scale });
              setToast("Изменения сохранены локально");
            }}
          >
            Сохранить
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
            onClick={() => {
              clearPlannerState();
              setTasks(initialTasks.map(normalizeTask));
              setColumns(defaultColumns);
              setScale("day");
              setToast("Demo data сброшены");
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ tasks, columns }, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "elma-gantt-demo.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Экспорт JSON
          </button>
          <button
            type="button"
            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
            onClick={() => setToast("Изменения подготовлены к отправке в ELMA365 API")}
          >
            Имитация сохранения в ELMA
          </button>
          <div className="ml-2 flex items-center rounded border border-slate-300 bg-white p-1 text-xs">
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
            className="ml-auto h-8 w-60 rounded border border-slate-300 px-2 text-xs outline-none focus:border-slate-500"
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
          />
          <GanttGrid
            tasks={filteredTasks}
            dates={dates}
            engineers={engineers}
            dayWidth={dayWidth}
            scrollLeft={sharedScrollLeft}
            onScroll={setSharedScrollLeft}
            onTaskUpdate={updateTask}
          />
        </div>
      </div>

      {!embed && (
        <div className="flex h-8 items-center gap-4 border-y border-slate-300 bg-slate-200 px-3 text-xs text-slate-700">
          <span className="font-semibold">Легенда:</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded bg-emerald-500" />
            Нормальная загрузка
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded bg-red-300" />
            Перегрузка
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded bg-slate-300" />
            Выходной
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-[2px] bg-red-500" />
            Сегодня
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span>Показ:</span>
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
          engineers={engineers}
          tasks={filteredTasks}
          dates={dates}
          dayWidth={dayWidth}
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
          scrollLeft={sharedScrollLeft}
          onScroll={setSharedScrollLeft}
        />
      </div>

      {toast && (
        <div className="pointer-events-none fixed right-3 top-3 z-50 rounded bg-slate-900 px-3 py-2 text-xs text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

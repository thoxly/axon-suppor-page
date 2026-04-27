"use client";

import { useEffect, useRef, useState } from "react";
import { ColumnConfig, PlanningTask } from "@/types/planning";

interface TaskTableProps {
  tasks: PlanningTask[];
  columns: ColumnConfig[];
  authorNames: Record<string, string>;
  onToggleColumn: (key: string) => void;
  onResizeColumn: (key: string, width: number) => void;
  onMoveColumn: (key: string, direction: "left" | "right") => void;
  onReorderTask: (fromTaskId: string, toTaskId: string) => void;
}

const rowClass =
  "h-9 border-b border-slate-100 px-2 py-1 text-[11px] text-slate-700 truncate";
const DRAG_COLUMN_WIDTH = 28;

function renderValue(task: PlanningTask, key: keyof PlanningTask, authorNames: Record<string, string>) {
  const value = task[key];
  if (key === "authorId") {
    return authorNames[String(value)] ?? value;
  }
  if (typeof value === "number") {
    return value.toFixed(1);
  }
  if (Array.isArray(value)) {
    return `${value.length} дн`;
  }
  return String(value);
}

export function TaskTable({
  tasks,
  columns,
  authorNames,
  onToggleColumn,
  onResizeColumn,
  onMoveColumn,
  onReorderTask,
}: TaskTableProps) {
  const visibleColumns = columns.filter((column) => column.visible);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!columnsOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setColumnsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [columnsOpen]);

  return (
    <div className="h-full overflow-auto border-r border-slate-200 bg-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        {/* Top bar: title + column settings */}
        <div className="flex h-[28px] items-center justify-between border-b border-slate-100 px-3">
          <span className="text-[11px] font-semibold text-slate-600">Список задач</span>
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setColumnsOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                columnsOpen
                  ? "bg-slate-100 text-slate-800"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
              title="Управление колонками"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <rect x="1" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="6" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="11" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Колонки
            </button>

            {columnsOpen && (
              <div className="absolute right-0 top-full z-40 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-700">Управление колонками</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Видимость и порядок колонок
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {columns.map((column, idx) => (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={column.visible}
                        onChange={() => onToggleColumn(column.key)}
                        className="h-3.5 w-3.5 cursor-pointer accent-slate-700"
                      />
                      <span
                        className={`flex-1 text-[12px] ${
                          column.visible ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {column.label}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onMoveColumn(column.key, "left");
                          }}
                          disabled={idx === 0}
                          className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
                          title="Переместить левее"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onMoveColumn(column.key, "right");
                          }}
                          disabled={idx === columns.length - 1}
                          className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
                          title="Переместить правее"
                        >
                          ↓
                        </button>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setColumnsOpen(false)}
                    className="w-full rounded-md bg-slate-800 py-1.5 text-[11px] font-medium text-white hover:bg-slate-700"
                  >
                    Готово
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column headers row */}
        <div className="flex bg-slate-50 text-[11px] font-semibold text-slate-500">
          <div
            className="border-r border-slate-200 px-2 py-1.5"
            style={{ width: DRAG_COLUMN_WIDTH, minWidth: DRAG_COLUMN_WIDTH }}
          />
          {visibleColumns.map((column) => (
            <div
              key={column.key}
              className="group relative border-r border-slate-200 px-2 py-1.5"
              style={{ width: column.width, minWidth: 70 }}
            >
              {column.label}
              <input
                type="range"
                min={70}
                max={320}
                value={column.width}
                onChange={(event) =>
                  onResizeColumn(column.key, Number(event.target.value))
                }
                className="absolute bottom-0 left-0 right-0 h-1 w-full cursor-col-resize opacity-0 group-hover:opacity-100"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Task rows */}
      <div>
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex bg-white even:bg-slate-50/50"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const fromTaskId = event.dataTransfer.getData("text/task-id");
              if (!fromTaskId || fromTaskId === task.id) return;
              onReorderTask(fromTaskId, task.id);
            }}
          >
            <div
              className="flex h-9 items-center border-b border-r border-slate-200 px-2 text-slate-300"
              style={{ width: DRAG_COLUMN_WIDTH, minWidth: DRAG_COLUMN_WIDTH }}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/task-id", task.id);
                }}
                className="cursor-grab text-xs leading-none active:cursor-grabbing"
                title="Перетащите для изменения порядка строки"
              >
                ⋮⋮
              </button>
            </div>
            {visibleColumns.map((column) => (
              <div
                key={`${task.id}-${column.key}`}
                className={rowClass}
                style={{ width: column.width, minWidth: 70 }}
                title={renderValue(task, column.key, authorNames)}
              >
                {renderValue(task, column.key, authorNames)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

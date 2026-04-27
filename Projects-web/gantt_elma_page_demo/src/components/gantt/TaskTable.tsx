"use client";

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
  "h-9 border-b border-slate-200 px-2 py-1 text-[11px] text-slate-700 truncate";
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

  return (
    <div className="h-full overflow-auto border-r border-slate-300 bg-white">
      <div className="sticky top-0 z-20 border-b border-slate-300 bg-slate-100">
        <div className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-slate-700">
          <span>Список задач</span>
          <details className="relative">
            <summary className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-1">
              Колонки
            </summary>
            <div className="absolute right-0 z-30 mt-1 max-h-64 w-72 overflow-auto rounded border border-slate-300 bg-white p-2 shadow-lg">
              {columns.map((column) => (
                <div key={column.key} className="mb-1 rounded border border-slate-200 p-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={column.visible}
                        onChange={() => onToggleColumn(column.key)}
                      />
                      {column.label}
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveColumn(column.key, "left")}
                        className="rounded border border-slate-300 px-1 text-[10px]"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveColumn(column.key, "right")}
                        className="rounded border border-slate-300 px-1 text-[10px]"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
        <div className="flex border-t border-slate-300 bg-slate-50">
          <div
            className="border-r border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-500"
            style={{ width: DRAG_COLUMN_WIDTH, minWidth: DRAG_COLUMN_WIDTH }}
          >
            ↕
          </div>
          {visibleColumns.map((column) => (
            <div
              key={column.key}
              className="group relative border-r border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600"
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
      <div>
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex bg-white even:bg-slate-50/60"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const fromTaskId = event.dataTransfer.getData("text/task-id");
              if (!fromTaskId || fromTaskId === task.id) return;
              onReorderTask(fromTaskId, task.id);
            }}
          >
            <div
              className="flex h-9 items-center border-b border-slate-200 border-r border-slate-300 px-2 text-slate-400"
              style={{ width: DRAG_COLUMN_WIDTH, minWidth: DRAG_COLUMN_WIDTH }}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/task-id", task.id);
                }}
                className="cursor-grab text-xs active:cursor-grabbing"
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

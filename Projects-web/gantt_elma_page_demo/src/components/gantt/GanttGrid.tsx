"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineHeader } from "@/components/gantt/TimelineHeader";
import { resizeTask, shiftTask } from "@/lib/planning";
import { DateCell, Dependency, DependencyType, Engineer, PlanningTask } from "@/types/planning";

interface GanttGridProps {
  tasks: PlanningTask[];
  dates: DateCell[];
  engineers: Engineer[];
  dayWidth: number;
  scrollLeft: number;
  onScroll: (scrollLeft: number) => void;
  onTaskUpdate: (taskId: string, nextTask: PlanningTask) => void;
  dependencies: Dependency[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string | null) => void;
  onAddDependency: (dep: Dependency) => void;
  onRemoveDependency: (depId: string) => void;
}

type DragMode = "move" | "start" | "end";

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  sourceTask: PlanningTask;
  hasMoved: boolean;
}

interface ConnectState {
  fromTaskId: string;
  fromSide: "start" | "end";
  x1: number;
  y1: number;
}

const DEP_CONFIG: Record<
  DependencyType,
  { color: string; fromSide: "start" | "end"; toSide: "start" | "end" }
> = {
  FS: { color: "#3b82f6", fromSide: "end", toSide: "start" },
  SS: { color: "#16a34a", fromSide: "start", toSide: "start" },
  FF: { color: "#8b5cf6", fromSide: "end", toSide: "end" },
  SF: { color: "#f59e0b", fromSide: "start", toSide: "end" },
};

const rowHeight = 36;

function getBarGeometry(
  task: PlanningTask,
  dateIndex: Map<string, number>,
  dayWidth: number
): { left: number; right: number; width: number } {
  const startIdx = dateIndex.get(task.startDate) ?? 0;
  const endIdx = dateIndex.get(task.finalDate) ?? startIdx;
  const width = Math.max((endIdx - startIdx + 1) * dayWidth - 6, dayWidth / 2);
  const left = startIdx * dayWidth + 3;
  return { left, right: left + width, width };
}

function buildArrowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromSide: "start" | "end",
  toSide: "start" | "end"
): { d: string; midX: number; midY: number } {
  const dx = Math.max(Math.abs(x2 - x1) * 0.5, 28);
  const cpx1 = fromSide === "end" ? x1 + dx : x1 - dx;
  const cpx2 = toSide === "start" ? x2 - dx : x2 + dx;
  const d = `M${x1},${y1} C${cpx1},${y1} ${cpx2},${y2} ${x2},${y2}`;
  // Midpoint of cubic bezier at t=0.5
  const midX = (x1 + 3 * cpx1 + 3 * cpx2 + x2) / 8;
  const midY = (y1 + y2) / 2;
  return { d, midX, midY };
}

export function GanttGrid({
  tasks,
  dates,
  engineers,
  dayWidth,
  scrollLeft,
  onScroll,
  onTaskUpdate,
  dependencies,
  selectedTaskId,
  onTaskSelect,
  onAddDependency,
  onRemoveDependency,
}: GanttGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const onTaskSelectRef = useRef(onTaskSelect);
  onTaskSelectRef.current = onTaskSelect;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const tempLineRef = useRef<SVGPathElement | null>(null);
  const connectRef = useRef<ConnectState | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Task drag effect
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      const deltaDays = Math.round((event.clientX - state.startX) / dayWidth);
      if (deltaDays === 0) return;
      state.hasMoved = true;
      const liveSource = tasks.find((task) => task.id === state.taskId) ?? state.sourceTask;
      const nextTask =
        state.mode === "move"
          ? shiftTask(state.sourceTask, deltaDays)
          : resizeTask(
              state.sourceTask,
              state.mode === "start" ? "start" : "end",
              deltaDays
            );
      if (
        nextTask.startDate === liveSource.startDate &&
        nextTask.finalDate === liveSource.finalDate
      ) {
        return;
      }
      onTaskUpdate(state.taskId, nextTask);
    };
    const onPointerUp = () => {
      const state = dragRef.current;
      if (state && !state.hasMoved) {
        onTaskSelectRef.current(state.taskId);
      }
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dayWidth, onTaskUpdate, tasks]);

  // Connection drag effect (runs once; reads everything from refs)
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const state = connectRef.current;
      if (!state || !svgRef.current || !tempLineRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x2 = event.clientX - rect.left;
      const y2 = event.clientY - rect.top;
      const { d } = buildArrowPath(state.x1, state.y1, x2, y2, state.fromSide, "start");
      tempLineRef.current.setAttribute("d", d);
      tempLineRef.current.style.display = "block";
    };
    const onPointerUp = () => {
      if (!connectRef.current) return;
      connectRef.current = null;
      setIsConnecting(false);
      if (tempLineRef.current) {
        tempLineRef.current.style.display = "none";
        tempLineRef.current.setAttribute("d", "");
      }
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const todayIndex = dates.findIndex((date) => date.isToday);
  const timelineWidth = dates.length * dayWidth;
  const totalRowsHeight = tasks.length * rowHeight;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-white"
      onScroll={(event) => onScroll(event.currentTarget.scrollLeft)}
    >
      <div style={{ width: timelineWidth }}>
        <TimelineHeader dates={dates} dayWidth={dayWidth} />

        <div className="relative" style={{ height: totalRowsHeight }}>
          {/* Today marker */}
          {todayIndex >= 0 && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10"
              style={{ left: todayIndex * dayWidth }}
            >
              <div className="h-full border-l-2 border-red-500/70" />
              <span className="absolute -top-5 left-1 rounded bg-red-500 px-1 text-[10px] text-white">
                Сегодня
              </span>
            </div>
          )}

          {/* SVG dependency arrows — arrows are clickable (delete on click) */}
          <svg
            ref={svgRef}
            className="absolute left-0 top-0 z-10 overflow-visible"
            style={{ pointerEvents: "none" }}
            width={timelineWidth}
            height={totalRowsHeight}
          >
            <defs>
              {(Object.entries(DEP_CONFIG) as [DependencyType, typeof DEP_CONFIG.FS][]).map(
                ([type, cfg]) => (
                  <marker
                    key={type}
                    id={`arrow-${type}`}
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill={cfg.color} />
                  </marker>
                )
              )}
              <marker
                id="arrow-temp"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#64748b" />
              </marker>
            </defs>

            {/* Persistent dependency arrows (each group is interactive) */}
            {dependencies.map((dep) => {
              const fromIdx = tasks.findIndex((t) => t.id === dep.fromTaskId);
              const toIdx = tasks.findIndex((t) => t.id === dep.toTaskId);
              if (fromIdx < 0 || toIdx < 0) return null;
              const fromGeo = getBarGeometry(tasks[fromIdx], dateIndex, dayWidth);
              const toGeo = getBarGeometry(tasks[toIdx], dateIndex, dayWidth);
              const cfg = DEP_CONFIG[dep.type];
              const x1 = cfg.fromSide === "start" ? fromGeo.left : fromGeo.right;
              const y1 = fromIdx * rowHeight + rowHeight / 2;
              const x2 = cfg.toSide === "start" ? toGeo.left : toGeo.right;
              const y2 = toIdx * rowHeight + rowHeight / 2;
              const { d, midX, midY } = buildArrowPath(x1, y1, x2, y2, cfg.fromSide, cfg.toSide);
              return (
                <g
                  key={dep.id}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={() => onRemoveDependency(dep.id)}
                  className="group/dep"
                >
                  {/* Wide transparent hit area */}
                  <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
                  {/* Visible arrow line */}
                  <path
                    d={d}
                    stroke={cfg.color}
                    strokeWidth={1.5}
                    fill="none"
                    strokeOpacity={0.85}
                    markerEnd={`url(#arrow-${dep.type})`}
                    className="group-hover/dep:stroke-[2.5] transition-all"
                    style={{ transition: "stroke-width 0.1s" }}
                  />
                  {/* Delete badge at midpoint — visible on hover */}
                  <g transform={`translate(${midX},${midY})`}>
                    <circle
                      r={8}
                      fill="white"
                      stroke={cfg.color}
                      strokeWidth={1.5}
                      opacity={0}
                      className="group-hover/dep:opacity-100"
                      style={{ transition: "opacity 0.15s" }}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={cfg.color}
                      fontSize={11}
                      fontWeight="700"
                      opacity={0}
                      className="group-hover/dep:opacity-100"
                      style={{ transition: "opacity 0.15s", userSelect: "none" }}
                    >
                      ×
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Temp line while drawing a new connection */}
            <path
              ref={tempLineRef}
              d=""
              stroke="#64748b"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="5,3"
              strokeOpacity={0.7}
              markerEnd="url(#arrow-temp)"
              style={{ display: "none", pointerEvents: "none" }}
            />
          </svg>

          {/* Task rows */}
          {tasks.map((task, rowIndex) => {
            const geo = getBarGeometry(task, dateIndex, dayWidth);
            const engineer = engineerMap.get(task.authorId);
            const isSelected = task.id === selectedTaskId;
            const showHandles =
              hoveredTaskId === task.id || isConnecting;

            return (
              <div
                key={task.id}
                className={`absolute w-full border-b border-slate-100 ${
                  rowIndex % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                }`}
                style={{ top: rowIndex * rowHeight, height: rowHeight }}
                onPointerEnter={() => setHoveredTaskId(task.id)}
                onPointerLeave={() => setHoveredTaskId(null)}
              >
                {/* Grid column backgrounds */}
                {dates.map((date) => (
                  <div
                    key={`${task.id}-${date.date}`}
                    className={`absolute bottom-0 top-0 border-r border-slate-100 ${
                      date.isWeekend ? "bg-slate-100/60" : ""
                    }`}
                    style={{
                      left: (dateIndex.get(date.date) ?? 0) * dayWidth,
                      width: dayWidth,
                    }}
                  />
                ))}

                {/* Task bar */}
                <div
                  className={`absolute top-1/2 z-20 flex h-6 -translate-y-1/2 items-center rounded shadow-sm transition-shadow ${
                    isSelected
                      ? "bg-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-1"
                      : "bg-emerald-500/90 hover:bg-emerald-500"
                  }`}
                  style={{ left: geo.left, width: geo.width }}
                >
                  {/* Resize start */}
                  <button
                    type="button"
                    className="h-full w-2 cursor-ew-resize rounded-l bg-emerald-700/50 hover:bg-emerald-700/80"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      dragRef.current = {
                        taskId: task.id,
                        mode: "start",
                        startX: event.clientX,
                        sourceTask: task,
                        hasMoved: false,
                      };
                    }}
                  />
                  {/* Move / click to select */}
                  <button
                    type="button"
                    className="h-full flex-1 cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      dragRef.current = {
                        taskId: task.id,
                        mode: "move",
                        startX: event.clientX,
                        sourceTask: task,
                        hasMoved: false,
                      };
                    }}
                    title={`${task.productType} (${task.startDate} – ${task.finalDate})`}
                  />
                  {/* Resize end */}
                  <button
                    type="button"
                    className="h-full w-2 cursor-ew-resize rounded-r bg-emerald-700/50 hover:bg-emerald-700/80"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      dragRef.current = {
                        taskId: task.id,
                        mode: "end",
                        startX: event.clientX,
                        sourceTask: task,
                        hasMoved: false,
                      };
                    }}
                  />
                </div>

                {/* Engineer avatar */}
                <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2">
                  <div
                    className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white shadow-sm"
                    style={{ backgroundColor: engineer?.color ?? "#64748b" }}
                    title={engineer?.name ?? "—"}
                  >
                    {engineer?.shortName ?? "?"}
                  </div>
                </div>

                {/* Connection handles (visible on hover or while connecting) */}
                {showHandles && (
                  <>
                    {/* Start handle */}
                    <div
                      className="absolute z-40 flex h-3 w-3 cursor-crosshair items-center justify-center rounded-full border-2 border-blue-500 bg-white shadow-sm hover:scale-125 hover:border-blue-600"
                      style={{
                        left: geo.left - 6,
                        top: rowHeight / 2 - 6,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const svg = svgRef.current;
                        if (!svg) return;
                        const rect = svg.getBoundingClientRect();
                        const x1 = geo.left;
                        const y1 = rowIndex * rowHeight + rowHeight / 2;
                        connectRef.current = { fromTaskId: task.id, fromSide: "start", x1, y1 };
                        setIsConnecting(true);
                        if (tempLineRef.current) {
                          const { d } = buildArrowPath(x1, y1, e.clientX - rect.left, e.clientY - rect.top, "start", "start");
                          tempLineRef.current.setAttribute("d", d);
                          tempLineRef.current.style.display = "block";
                        }
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        const state = connectRef.current;
                        if (!state || state.fromTaskId === task.id) return;
                        const typeMap: Record<string, DependencyType> = {
                          "end-start": "FS",
                          "start-start": "SS",
                          "end-end": "FF",
                          "start-end": "SF",
                        };
                        const type = typeMap[`${state.fromSide}-start`] ?? "FS";
                        onAddDependency({
                          id: `dep-${Date.now()}`,
                          fromTaskId: state.fromTaskId,
                          toTaskId: task.id,
                          type,
                        });
                        connectRef.current = null;
                        setIsConnecting(false);
                        if (tempLineRef.current) {
                          tempLineRef.current.style.display = "none";
                          tempLineRef.current.setAttribute("d", "");
                        }
                      }}
                    />
                    {/* End handle */}
                    <div
                      className="absolute z-40 flex h-3 w-3 cursor-crosshair items-center justify-center rounded-full border-2 border-blue-500 bg-white shadow-sm hover:scale-125 hover:border-blue-600"
                      style={{
                        left: geo.right - 6,
                        top: rowHeight / 2 - 6,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const svg = svgRef.current;
                        if (!svg) return;
                        const rect = svg.getBoundingClientRect();
                        const x1 = geo.right;
                        const y1 = rowIndex * rowHeight + rowHeight / 2;
                        connectRef.current = { fromTaskId: task.id, fromSide: "end", x1, y1 };
                        setIsConnecting(true);
                        if (tempLineRef.current) {
                          const { d } = buildArrowPath(x1, y1, e.clientX - rect.left, e.clientY - rect.top, "end", "start");
                          tempLineRef.current.setAttribute("d", d);
                          tempLineRef.current.style.display = "block";
                        }
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        const state = connectRef.current;
                        if (!state || state.fromTaskId === task.id) return;
                        const typeMap: Record<string, DependencyType> = {
                          "end-end": "FF",
                          "start-end": "SF",
                          "end-start": "FS",
                          "start-start": "SS",
                        };
                        const type = typeMap[`${state.fromSide}-end`] ?? "FF";
                        onAddDependency({
                          id: `dep-${Date.now()}`,
                          fromTaskId: state.fromTaskId,
                          toTaskId: task.id,
                          type,
                        });
                        connectRef.current = null;
                        setIsConnecting(false);
                        if (tempLineRef.current) {
                          tempLineRef.current.style.display = "none";
                          tempLineRef.current.setAttribute("d", "");
                        }
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Dependency, DependencyType, Engineer, PlanningTask } from "@/types/planning";

interface TaskDrawerProps {
  task: PlanningTask;
  tasks: PlanningTask[];
  engineers: Engineer[];
  dependencies: Dependency[];
  onClose: () => void;
  onRemoveDependency: (depId: string) => void;
}

const DEP_LABEL: Record<DependencyType, string> = {
  FS: "Конец → Начало",
  SS: "Начало → Начало",
  FF: "Конец → Конец",
  SF: "Начало → Конец",
};

const DEP_BADGE: Record<DependencyType, string> = {
  FS: "bg-blue-50 text-blue-700 border border-blue-200",
  SS: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  FF: "bg-violet-50 text-violet-700 border border-violet-200",
  SF: "bg-amber-50 text-amber-700 border border-amber-200",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[28px] items-start gap-3">
      <dt className="w-28 shrink-0 pt-0.5 text-[11px] text-slate-400">{label}</dt>
      <dd className="flex-1 text-[12px] leading-relaxed text-slate-700">{value || "—"}</dd>
    </div>
  );
}

export function TaskDrawer({
  task,
  tasks,
  engineers,
  dependencies,
  onClose,
  onRemoveDependency,
}: TaskDrawerProps) {
  const engineer = engineers.find((e) => e.id === task.authorId);
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const outgoing = dependencies.filter((d) => d.fromTaskId === task.id);
  const incoming = dependencies.filter((d) => d.toTaskId === task.id);

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal="true">
      {/* Backdrop */}
      <div
        className="flex-1 cursor-default bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex h-13 shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: engineer?.color ?? "#64748b" }}
          >
            {engineer?.shortName ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-800">
              {task.productType}
            </p>
            <p className="text-[11px] text-slate-400">#{task.idPlan}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Details */}
          <section className="border-b border-slate-100 px-4 py-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Детали задачи
            </h3>
            <dl className="space-y-1.5">
              <Field label="Объект" value={task.projectType} />
              <Field label="Действие" value={task.actionType} />
              <Field label="Сегмент" value={task.seg} />
              <Field label="Потребитель" value={task.customer} />
              <Field label="Проект" value={task.projectName} />
              <Field label="Исполнитель" value={engineer?.name ?? task.authorId} />
              {task.notes && <Field label="Примечания" value={task.notes} />}
            </dl>
          </section>

          {/* Dates */}
          <section className="border-b border-slate-100 px-4 py-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Сроки
            </h3>
            <dl className="space-y-1.5">
              <Field label="Начало" value={task.startDate} />
              <Field label="Окончание" value={task.finalDate} />
              {task.endDate !== task.finalDate && (
                <Field label="Плановый срок" value={task.endDate} />
              )}
            </dl>
          </section>

          {/* Labor */}
          <section className="border-b border-slate-100 px-4 py-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Трудозатраты
            </h3>
            <dl className="space-y-1.5">
              <Field label="Плановые" value={`${task.refLc.toFixed(1)} ч`} />
              <Field label="Фактические" value={`${task.currentLc.toFixed(1)} ч`} />
            </dl>
          </section>

          {/* Dependencies */}
          <section className="px-4 py-4">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Зависимости
            </h3>

            {outgoing.length === 0 && incoming.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center">
                <p className="text-[11px] text-slate-400">Нет связанных задач</p>
                <p className="mt-1 text-[10px] text-slate-300">
                  Перетащите от точки задачи к другой задаче на Ганте
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {outgoing.map((dep) => {
                  const linked = taskById[dep.toTaskId];
                  return (
                    <DepRow
                      key={dep.id}
                      direction="out"
                      dep={dep}
                      linkedTask={linked}
                      onRemove={() => onRemoveDependency(dep.id)}
                    />
                  );
                })}
                {incoming.map((dep) => {
                  const linked = taskById[dep.fromTaskId];
                  return (
                    <DepRow
                      key={dep.id}
                      direction="in"
                      dep={dep}
                      linkedTask={linked}
                      onRemove={() => onRemoveDependency(dep.id)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DepRow({
  direction,
  dep,
  linkedTask,
  onRemove,
}: {
  direction: "in" | "out";
  dep: Dependency;
  linkedTask: PlanningTask | undefined;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 hover:bg-slate-100">
      <span
        className={`text-[11px] font-semibold ${
          direction === "out" ? "text-slate-400" : "text-blue-400"
        }`}
        title={direction === "out" ? "Исходящая зависимость" : "Входящая зависимость"}
      >
        {direction === "out" ? "→" : "←"}
      </span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${DEP_BADGE[dep.type]}`}>
        {dep.type}
      </span>
      <span className="flex-1 truncate text-[11px] text-slate-600">
        <span className="text-slate-400">#{linkedTask?.idPlan ?? "?"}</span>{" "}
        {linkedTask?.productType ?? "Задача удалена"}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        title="Удалить связь"
      >
        ×
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RequestListItem = {
  id: string;
  index: number | null;
  headers?: string | null;
  status?: number | null;
  creationDate?: string | null;
  deadlineDate?: string | null;
};

type ApiResponse =
  | {
      items: RequestListItem[];
      error?: string;
      isExecutor?: boolean;
    }
  | {
      error: string;
      items?: undefined;
      isExecutor?: boolean;
    };

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapStatus(status?: number | null) {
  if (status == null) return { label: "—", tone: "slate" as const };

  switch (status) {
    case 1:
      return { label: "Новая", tone: "sky" as const };
    case 2:
      return { label: "Запланирована", tone: "sky" as const };
    case 3:
      return { label: "Назначена", tone: "amber" as const };
    case 4:
      return { label: "В работе", tone: "amber" as const };
    case 5:
      return { label: "Ожидание", tone: "rose" as const };
    case 6:
      return { label: "Решена", tone: "emerald" as const };
    case 7:
      return { label: "Закрыта", tone: "slate" as const };
    default:
      return { label: String(status), tone: "slate" as const };
  }
}

export default function RequestsPage() {
  const [items, setItems] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecutor, setIsExecutor] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/requests/list", {
          method: "GET",
        });
        const data = (await response.json()) as ApiResponse;

        if (!response.ok) {
          setError(
            data.error ?? "Не удалось загрузить список заявок. Попробуйте позже.",
          );
          return;
        }

        if (!cancelled) {
          if (data.items) {
            setItems(data.items);
          }
          if (typeof data.isExecutor === "boolean") {
            setIsExecutor(data.isExecutor);
          }
        }
      } catch {
        if (!cancelled) {
          setError(
            "Ошибка сети при загрузке заявок. Проверьте подключение и попробуйте ещё раз.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = items
    .filter((item) => {
      if (showCompleted) return true;
      if (item.status == null) return true;
      return item.status !== 6 && item.status !== 7;
    })
    .slice()
    .sort((a, b) => {
      const aTime = a.creationDate ? new Date(a.creationDate).getTime() : 0;
      const bTime = b.creationDate ? new Date(b.creationDate).getTime() : 0;

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;

      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">
            {isExecutor ? "Заявки" : "Мои обращения"}
          </h1>
          <p className="text-xs text-slate-500">
            {isExecutor
              ? "Список заявок из ELMA365, где вы являетесь исполнителем."
              : "Список заявок из ELMA365, где вы являетесь инициатором."}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
            />
            <span>Отображать завершённые (Решена, Закрыта)</span>
          </label>
          {!isExecutor && (
            <Link
              href="/requests/new"
              className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400"
            >
              Создать обращение
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
          Всего заявок: {items.length}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden max-h-[70vh] overflow-y-auto md:block">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">№</th>
                <th className="px-4 py-2">Тема</th>
                <th className="px-4 py-2">Статус</th>
                <th className="px-4 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 hover:text-slate-700"
                    onClick={() =>
                      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                  >
                    <span>Создана</span>
                    <span className="text-[10px]">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-desktop-${index}`} className="animate-pulse">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="h-3 w-8 rounded bg-slate-200" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="mb-1 h-3 w-3/4 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 rounded-full bg-slate-200" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                    </td>
                  </tr>
                ))}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-xs text-rose-500"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && items.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    У вас пока нет обращений.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                visibleItems.map((item) => {
                  const status = mapStatus(item.status);

                  const statusClasses =
                    status.tone === "emerald"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : status.tone === "amber"
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : status.tone === "sky"
                          ? "bg-sky-50 text-sky-700 ring-sky-200"
                          : status.tone === "rose"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-slate-100 text-slate-700 ring-slate-200";

                  const canClose =
                    item.status != null &&
                    item.status !== 6 &&
                    item.status !== 7;

                  const canReopen =
                    isExecutor &&
                    item.status === 6;

                  const handleRowCloseRequest = async () => {
                    const confirmed = window.confirm(
                      isExecutor
                        ? "Вы уверены, что хотите завершить заявку?"
                        : "Вы уверены, что хотите закрыть заявку?",
                    );

                    if (!confirmed) return;

                    try {
                      const response = await fetch(
                        `/api/requests/${item.id}/solve`,
                        { method: "POST" },
                      );
                      const data = (await response.json().catch(() => ({}))) as {
                        ok?: boolean;
                        error?: string;
                        status?: number;
                      };

                      if (!response.ok || data.ok !== true) {
                        // Для простоты пока не показываем отдельную ошибку на строку,
                        // пользователь увидит, что статус не поменялся.
                        return;
                      }

                      setItems((previous) =>
                        previous.map((existing) =>
                          existing.id === item.id
                            ? {
                                ...existing,
                                status: 6,
                              }
                            : existing,
                        ),
                      );
                    } catch {
                      // Игнорируем сетевую ошибку здесь, UI остаётся без изменений.
                    }
                  };

                  const handleRowReopenRequest = async () => {
                    const confirmed = window.confirm(
                      "Вернуть заявку в статус «В работе»?",
                    );

                    if (!confirmed) return;

                    try {
                      const response = await fetch(
                        `/api/requests/${item.id}/reopen`,
                        { method: "POST" },
                      );
                      const data = (await response.json().catch(() => ({}))) as {
                        ok?: boolean;
                        error?: string;
                        status?: number;
                      };

                      if (!response.ok || data.ok !== true) {
                        return;
                      }

                      setItems((previous) =>
                        previous.map((existing) =>
                          existing.id === item.id
                            ? {
                                ...existing,
                                status: 4,
                              }
                            : existing,
                        ),
                      );
                    } catch {
                      // Ошибку сети здесь также опускаем.
                    }
                  };

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-slate-900">
                        {item.index ?? "—"}
                      </td>
                      <td className="max-w-[280px] px-4 py-2">
                        <Link
                          href={`/requests/${item.id}`}
                          className="line-clamp-2 text-xs font-medium text-sky-700 hover:underline"
                        >
                          {item.headers ?? "(без темы)"}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClasses}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-700">
                        {formatDate(item.creationDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right space-x-1">
                        {canClose && (
                          <button
                            type="button"
                            onClick={handleRowCloseRequest}
                            title={
                              isExecutor
                                ? "Завершить заявку и перевести её в статус «Решена»"
                                : "Закрыть заявку и перевести её в статус «Решена»"
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500 text-[12px] text-emerald-600 hover:bg-emerald-50"
                          >
                            ✓
                          </button>
                        )}
                        {canReopen && (
                          <button
                            type="button"
                            onClick={handleRowReopenRequest}
                            title="Вернуть заявку из статуса «Решена» в статус «В работе»"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-500 text-[12px] text-amber-600 hover:bg-amber-50"
                          >
                            ↺
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 p-3 md:hidden">
          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-mobile-${index}`}
                className="animate-pulse space-y-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="h-5 w-20 rounded-full bg-slate-200" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-full rounded bg-slate-200" />
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                </div>
              </div>
            ))}

          {!loading && error && (
            <p className="px-1 py-4 text-center text-xs text-rose-500">
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-slate-500">
              У вас пока нет обращений.
            </p>
          )}

          {!loading &&
            !error &&
            visibleItems.map((item) => {
              const status = mapStatus(item.status);

              const statusClasses =
                status.tone === "emerald"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : status.tone === "amber"
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : status.tone === "sky"
                      ? "bg-sky-50 text-sky-700 ring-sky-200"
                      : status.tone === "rose"
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-slate-100 text-slate-700 ring-slate-200";

              const canClose =
                item.status != null &&
                item.status !== 6 &&
                item.status !== 7;

              const canReopen =
                isExecutor &&
                item.status === 6;

              const handleRowCloseRequest = async () => {
                const confirmed = window.confirm(
                  isExecutor
                    ? "Вы уверены, что хотите завершить заявку?"
                    : "Вы уверены, что хотите закрыть заявку?",
                );

                if (!confirmed) return;

                try {
                  const response = await fetch(
                    `/api/requests/${item.id}/solve`,
                    { method: "POST" },
                  );
                  const data = (await response.json().catch(() => ({}))) as {
                    ok?: boolean;
                    error?: string;
                    status?: number;
                  };

                  if (!response.ok || data.ok !== true) {
                    return;
                  }

                  setItems((previous) =>
                    previous.map((existing) =>
                      existing.id === item.id
                        ? {
                            ...existing,
                            status: 6,
                          }
                        : existing,
                    ),
                  );
                } catch {
                  // Ошибку сети для мобильной строки также опускаем.
                }
              };

              const handleRowReopenRequest = async () => {
                const confirmed = window.confirm(
                  "Вернуть заявку в статус «В работе»?",
                );

                if (!confirmed) return;

                try {
                  const response = await fetch(
                    `/api/requests/${item.id}/reopen`,
                    { method: "POST" },
                  );
                  const data = (await response.json().catch(() => ({}))) as {
                    ok?: boolean;
                    error?: string;
                    status?: number;
                  };

                  if (!response.ok || data.ok !== true) {
                    return;
                  }

                  setItems((previous) =>
                    previous.map((existing) =>
                      existing.id === item.id
                        ? {
                            ...existing,
                            status: 4,
                          }
                        : existing,
                    ),
                  );
                } catch {
                  // Ошибку сети для мобильной строки также опускаем.
                }
              };

              return (
                <Link
                  key={item.id}
                  href={`/requests/${item.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-sky-500/60 hover:bg-slate-50"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">
                      № {item.index ?? "—"}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusClasses}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs font-medium text-slate-900">
                    {item.headers ?? "(без темы)"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span>Создана: {formatDate(item.creationDate)}</span>
                    {canClose && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          void handleRowCloseRequest();
                        }}
                        className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-medium text-white"
                        title={
                          isExecutor
                            ? "Завершить заявку и перевести её в статус «Решена»"
                            : "Закрыть заявку и перевести её в статус «Решена»"
                        }
                      >
                        {isExecutor ? "Завершить" : "Закрыть"}
                      </button>
                    )}
                    {canReopen && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          void handleRowReopenRequest();
                        }}
                        className="inline-flex items-center rounded-full bg-amber-500 px-2 py-1 text-[10px] font-medium text-white"
                        title="Вернуть заявку из статуса «Решена» в статус «В работе»"
                      >
                        В работу
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}


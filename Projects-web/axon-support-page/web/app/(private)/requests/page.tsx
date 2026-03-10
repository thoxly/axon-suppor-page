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

type ApiResponse = {
  items: RequestListItem[];
  error?: string;
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
      return { label: "Ожидание", tone: "violet" as const };
    case 6:
      return { label: "Решена", tone: "emerald" as const };
    case 7:
      return { label: "Закрыта", tone: "emerald" as const };
    default:
      return { label: String(status), tone: "slate" as const };
  }
}

export default function RequestsPage() {
  const [items, setItems] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setItems(data.items ?? []);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">Мои обращения</h1>
          <p className="text-xs text-slate-400">
            Список заявок из ELMA365, где вы являетесь инициатором.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400"
        >
          Создать обращение
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-300">
          Всего заявок: {items.length}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden max-h-[70vh] overflow-y-auto md:block">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-slate-900/80 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">№</th>
                <th className="px-4 py-2">Тема</th>
                <th className="px-4 py-2">Статус</th>
                <th className="px-4 py-2">Создана</th>
                <th className="px-4 py-2">Срок</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-desktop-${index}`} className="animate-pulse">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="h-3 w-8 rounded bg-slate-700/60" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="mb-1 h-3 w-3/4 rounded bg-slate-700/60" />
                      <div className="h-3 w-1/2 rounded bg-slate-800/80" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 rounded-full bg-slate-700/60" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="h-3 w-24 rounded bg-slate-700/60" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="h-3 w-24 rounded bg-slate-700/60" />
                    </td>
                  </tr>
                ))}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-rose-400"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-slate-400"
                  >
                    У вас пока нет обращений.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                items.map((item) => {
                  const status = mapStatus(item.status);

                  const statusClasses =
                    status.tone === "emerald"
                      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                      : status.tone === "amber"
                        ? "bg-amber-500/10 text-amber-200 ring-amber-500/30"
                        : status.tone === "sky"
                          ? "bg-sky-500/10 text-sky-300 ring-sky-500/30"
                          : "bg-slate-700/40 text-slate-200 ring-slate-500/30";

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-800/60"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-slate-200">
                        {item.index ?? "—"}
                      </td>
                      <td className="max-w-[280px] px-4 py-2">
                        <Link
                          href={`/requests/${item.id}`}
                          className="line-clamp-2 text-xs font-medium text-sky-200 hover:underline"
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
                      <td className="whitespace-nowrap px-4 py-2 text-slate-300">
                        {formatDate(item.creationDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-slate-300">
                        {formatDate(item.deadlineDate)}
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
                className="animate-pulse space-y-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 w-16 rounded bg-slate-700/60" />
                  <div className="h-5 w-20 rounded-full bg-slate-700/60" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-full rounded bg-slate-700/60" />
                  <div className="h-3 w-3/4 rounded bg-slate-800/80" />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <div className="h-3 w-24 rounded bg-slate-700/60" />
                  <div className="h-3 w-24 rounded bg-slate-700/60" />
                </div>
              </div>
            ))}

          {!loading && error && (
            <p className="px-1 py-4 text-center text-xs text-rose-400">
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-slate-400">
              У вас пока нет обращений.
            </p>
          )}

          {!loading &&
            !error &&
            items.map((item) => {
              const status = mapStatus(item.status);

              const statusClasses =
                status.tone === "emerald"
                  ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                  : status.tone === "amber"
                    ? "bg-amber-500/10 text-amber-200 ring-amber-500/30"
                    : status.tone === "sky"
                      ? "bg-sky-500/10 text-sky-300 ring-sky-500/30"
                      : "bg-slate-700/40 text-slate-200 ring-slate-500/30";

              return (
                <Link
                  key={item.id}
                  href={`/requests/${item.id}`}
                  className="block rounded-lg border border-slate-800 bg-slate-900/80 p-3 transition hover:border-sky-500/60 hover:bg-slate-900"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-400">
                      № {item.index ?? "—"}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusClasses}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs font-medium text-slate-50">
                    {item.headers ?? "(без темы)"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span>Создана: {formatDate(item.creationDate)}</span>
                    <span>Срок: {formatDate(item.deadlineDate)}</span>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}


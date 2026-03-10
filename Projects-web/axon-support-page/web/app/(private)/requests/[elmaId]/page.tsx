"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ElmaRequestStatus } from "@/lib/elmaClient";

type ElmaRequestItem = {
  __id: string;
  __index: number;
  headers?: string;
  problem_description?: string;
  __status?: ElmaRequestStatus;
  creation_date?: string;
  deadline_date?: string | null;
  company?: string[];
  iniciator?: string[];
};

type ApiResponse =
  | {
      item: ElmaRequestItem;
      error?: undefined;
    }
  | {
      error: string;
      item?: undefined;
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

function mapStatus(status?: number) {
  if (status == null) return "—";

  switch (status) {
    case 1:
      return "Новая";
    case 2:
      return "Запланирована";
    case 3:
      return "Назначена";
    case 4:
      return "В работе";
    case 5:
      return "Ожидание";
    case 6:
      return "Решена";
    case 7:
      return "Закрыта";
    default:
      return String(status);
  }
}

export default function RequestDetailsPage({
  params,
}: {
  params: { elmaId: string };
}) {
  const { elmaId } = params;

  const [effectiveElmaId, setEffectiveElmaId] = useState<string | null>(elmaId);

  const [item, setItem] = useState<ElmaRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Подстраховка: иногда params.elmaId почему-то оказывается "undefined",
      // хотя в самом URL лежит корректный UUID. В этом случае пробуем
      // восстановить идентификатор из window.location.pathname.
      let id = effectiveElmaId;

      if (
        !id ||
        id === "undefined" ||
        id === "null"
      ) {
        if (typeof window !== "undefined") {
          const segments = window.location.pathname.split("/").filter(Boolean);
          const fromPath = segments[segments.length - 1];

          if (
            fromPath &&
            fromPath !== "undefined" &&
            fromPath !== "null"
          ) {
            id = fromPath;
            setEffectiveElmaId(fromPath);
          }
        }
      }

      if (
        !id ||
        id === "undefined" ||
        id === "null"
      ) {
        if (!cancelled) {
          setError("Некорректный идентификатор заявки");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/requests/${id}`, {
          method: "GET",
        });
        const data = (await response.json()) as ApiResponse;

        if (!response.ok || "error" in data) {
          setError(
            data.error ??
              "Не удалось загрузить заявку. Попробуйте обновить страницу.",
          );
          return;
        }

        if (!cancelled) {
          setItem(data.item);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Ошибка сети при загрузке заявки. Проверьте подключение и попробуйте ещё раз.",
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
  }, [elmaId]);

  const canOpenChat =
    item && item.__status?.status !== 6 && item.__status?.status !== 7;

  return (
    <div className="space-y-4">
      <Link
        href="/requests"
        className="inline-flex items-center text-xs font-medium text-slate-300 hover:text-slate-50"
      >
        ← Вернуться к списку обращений
      </Link>

      {loading && (
        <p className="text-xs text-slate-400">Загрузка заявки...</p>
      )}

      {!loading && error && (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && item && (
        <div className="space-y-4">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">
                Заявка № {item.__index} · ID {item.__id}
              </p>
              <h1 className="mt-1 text-lg font-semibold text-slate-50">
                {item.headers ?? "(без темы)"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Создана: {formatDate(item.creation_date)} · Срок:{" "}
                {formatDate(item.deadline_date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100">
                {mapStatus(item.__status?.status)}
              </span>
              <Link
                href={`/requests/${item.__id}/chat`}
                className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                aria-disabled={!canOpenChat}
              >
                Переписка по заявке
              </Link>
              {!canOpenChat && (
                <p className="max-w-[200px] text-right text-[10px] text-slate-400">
                  По закрытым заявкам переписка только для чтения.
                </p>
              )}
            </div>
          </header>

          <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-xs font-semibold text-slate-200">
              Описание обращения
            </h2>
            <div className="prose prose-invert max-w-none text-xs text-slate-50">
              {item.problem_description ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: item.problem_description,
                  }}
                />
              ) : (
                <p className="text-slate-400">Описание отсутствует.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


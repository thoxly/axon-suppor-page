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
      isExecutorForTicket?: boolean;
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
  const [isExecutorForTicket, setIsExecutorForTicket] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

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

      console.log("RequestDetailsPage fetch", {
        elmaIdFromParams: elmaId,
        effectiveElmaId,
        pathname:
          typeof window !== "undefined" ? window.location.pathname : null,
        idBeforeFetch: id,
      });

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
          setIsExecutorForTicket(Boolean(data.isExecutorForTicket));
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

  const handleCloseRequest = async () => {
    if (!effectiveElmaId || closing) return;

    const confirmed = window.confirm(
      isExecutorForTicket
        ? "Вы уверены, что хотите завершить заявку?"
        : "Вы уверены, что хотите закрыть заявку?",
    );

    if (!confirmed) return;

    setClosing(true);
    setCloseError(null);

    try {
      const response = await fetch(
        `/api/requests/${effectiveElmaId}/solve`,
        {
          method: "POST",
        },
      );

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        status?: number;
      };

      if (!response.ok || data.ok !== true) {
        setCloseError(
          data.error ?? "Не удалось завершить заявку. Попробуйте ещё раз.",
        );
        return;
      }

      setItem((previous) =>
        previous
          ? {
              ...previous,
              __status: {
                ...(previous.__status ?? { order: 0, status: 6 }),
                status: 6,
              },
            }
          : previous,
      );
    } catch {
      setCloseError(
        "Ошибка сети при завершении заявки. Проверьте подключение и попробуйте ещё раз.",
      );
    } finally {
      setClosing(false);
    }
  };

  const handleReopenRequest = async () => {
    if (!effectiveElmaId || reopening) return;

    const confirmed = window.confirm(
      "Вернуть заявку в статус «В работе»?",
    );

    if (!confirmed) return;

    setReopening(true);
    setReopenError(null);

    try {
      const response = await fetch(
        `/api/requests/${effectiveElmaId}/reopen`,
        {
          method: "POST",
        },
      );

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        status?: number;
      };

      if (!response.ok || data.ok !== true) {
        setReopenError(
          data.error ??
            "Не удалось вернуть заявку в работу. Попробуйте ещё раз.",
        );
        return;
      }

      setItem((previous) =>
        previous
          ? {
              ...previous,
              __status: {
                ...(previous.__status ?? { order: 0, status: 4 }),
                status: 4,
              },
            }
          : previous,
      );
    } catch {
      setReopenError(
        "Ошибка сети при изменении статуса заявки. Проверьте подключение и попробуйте ещё раз.",
      );
    } finally {
      setReopening(false);
    }
  };

  const canOpenChat =
    item && item.__status?.status !== 6 && item.__status?.status !== 7;

  const canCloseRequest =
    item && item.__status?.status !== 6 && item.__status?.status !== 7;

  const canReopenRequest =
    !!item &&
    isExecutorForTicket &&
    item.__status?.status === 6;

  const closeButtonLabel = isExecutorForTicket
    ? "Завершить заявку"
    : "Закрыть заявку";

  const handleMenuActionClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    const details = (event.currentTarget as HTMLElement).closest("details");
    details?.removeAttribute("open");
  };

  return (
    <div className="space-y-4">
      <Link
        href="/requests"
        className="inline-flex items-center text-xs font-medium text-sky-700 hover:text-sky-800"
      >
        ← Вернуться к списку обращений
      </Link>

      {loading && <p className="text-xs text-slate-500">Загрузка заявки...</p>}

      {!loading && error && (
        <p className="text-xs text-rose-500" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && item && (
        <div className="space-y-4">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Заявка № {item.__index} · ID {item.__id}
              </p>
              <h1 className="mt-1 text-lg font-semibold text-slate-900">
                {item.headers ?? "(без темы)"}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Создана: {formatDate(item.creation_date)} · Срок:{" "}
                {formatDate(item.deadline_date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
                {mapStatus(item.__status?.status)}
              </span>
              <details className="relative">
                <summary
                  className="flex list-none items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800 cursor-pointer select-none"
                  aria-label="Действия по заявке"
                  title="Действия"
                >
                  ⋯
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white text-xs text-slate-700 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600">
                    Действия
                  </div>
                  <div className="p-2 space-y-1">
                    <Link
                      href={`/requests/${item.__id}/chat`}
                      onClick={(event) => {
                        if (!canOpenChat) {
                          event.preventDefault();
                          return;
                        }
                        handleMenuActionClick(event);
                      }}
                      aria-disabled={!canOpenChat}
                      title={
                        canOpenChat
                          ? "Открыть чат по заявке"
                          : "По закрытым заявкам переписка только для чтения."
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] transition ${
                        canOpenChat
                          ? "hover:bg-slate-50"
                          : "cursor-not-allowed text-slate-400"
                      }`}
                    >
                      <span>Открыть чат</span>
                      {!canOpenChat && <span className="text-[10px]">—</span>}
                    </Link>

                    {canCloseRequest && (
                      <button
                        type="button"
                        onClick={(event) => {
                          handleMenuActionClick(event);
                          void handleCloseRequest();
                        }}
                        disabled={closing}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                        title={
                          isExecutorForTicket
                            ? "Завершить заявку и перевести её в статус «Решена»"
                            : "Закрыть заявку и перевести её в статус «Решена»"
                        }
                      >
                        <span>{closeButtonLabel}</span>
                        <span className="text-[10px] text-slate-400">
                          {closing ? "..." : "✓"}
                        </span>
                      </button>
                    )}

                    {canReopenRequest && (
                      <button
                        type="button"
                        onClick={(event) => {
                          handleMenuActionClick(event);
                          void handleReopenRequest();
                        }}
                        disabled={reopening}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                        title="Вернуть заявку из статуса «Решена» в статус «В работе»"
                      >
                        <span>Вернуть в работу</span>
                        <span className="text-[10px] text-slate-400">
                          {reopening ? "..." : "↺"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </details>
            </div>
          </header>

          {closeError && (
            <p className="text-xs text-rose-500" role="alert">
              {closeError}
            </p>
          )}
          {reopenError && (
            <p className="text-xs text-rose-500" role="alert">
              {reopenError}
            </p>
          )}

          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-semibold text-slate-900">
              Описание обращения
            </h2>
            <div className="prose max-w-none text-xs text-slate-900">
              {item.problem_description ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: item.problem_description,
                  }}
                />
              ) : (
                <p className="text-slate-500">Описание отсутствует.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type RequestSummary = {
  id: string;
  index: number | null;
  headers?: string | null;
  unreadCount: number;
};

type RequestsApiResponse =
  | {
      items: RequestSummary[];
      error?: string;
    }
  | {
      error: string;
      items?: undefined;
    };

type HeaderShellProps = {
  displayName: string;
  elmaCompanyId: string;
  isExecutor: boolean;
};

export function HeaderShell({
  displayName,
  elmaCompanyId,
  isExecutor,
}: HeaderShellProps) {
  const pathname = usePathname();
  const [openNotifications, setOpenNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const [notifications, setNotifications] = useState<RequestSummary[]>([]);

  const onRequestsPage = pathname === "/requests";

  const displayNameAbbreviation = useMemo(() => {
    if (!displayName) return "";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    const first = parts[0] ?? "";
    return first.slice(0, 2).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingNotifications(true);
      setNotificationsError(null);
      try {
        const response = await fetch("/api/requests/list", { method: "GET" });
        const data = (await response.json()) as RequestsApiResponse;

        if (!response.ok || "error" in data) {
          setNotificationsError(
            data.error ?? "Не удалось загрузить список заявок для уведомлений.",
          );
          return;
        }

        if (!cancelled && data.items) {
          const withUnread = (data.items as RequestSummary[]).filter(
            (item) => (item.unreadCount ?? 0) > 0,
          );
          setNotifications(withUnread.slice(0, 10));
        }
      } catch {
        if (!cancelled) {
          setNotificationsError(
            "Ошибка сети при загрузке уведомлений. Попробуйте позже.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingNotifications(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const notificationsCount = notifications.reduce(
    (total, item) => total + (item.unreadCount ?? 0),
    0,
  );

  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
      <Link href="/requests" className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sm font-semibold text-sky-800">
          SD
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            Service Desk портал
          </span>
          <span className="text-xs text-slate-500">
            Витрина заявок ELMA365
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-4 text-xs text-slate-600">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenNotifications((prev) => !prev)}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            aria-label="Уведомления"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.657A2.999 2.999 0 0 1 12 19.5a2.999 2.999 0 0 1-2.857-1.843M6 8.25a6 6 0 1 1 12 0c0 1.753.379 3.023.84 3.973.334.696.5 1.044.492 1.295a1.5 1.5 0 0 1-1.013 1.39c-.24.082-.61.082-1.35.082H7.03c-.74 0-1.11 0-1.35-.082a1.5 1.5 0 0 1-1.013-1.39c-.008-.251.158-.599.492-1.295.461-.95.84-2.22.84-3.973Z"
              />
            </svg>
            {notificationsCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {notificationsCount}
              </span>
            )}
          </button>

          {openNotifications && (
            <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">
                Чаты по заявкам
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto px-2 py-2 text-[11px]">
                {loadingNotifications && (
                  <p className="px-1 py-2 text-slate-400">
                    Загрузка уведомлений...
                  </p>
                )}
                {!loadingNotifications && notificationsError && (
                  <p className="px-1 py-2 text-rose-500">
                    {notificationsError}
                  </p>
                )}
                {!loadingNotifications &&
                  !notificationsError &&
                  notifications.length === 0 && (
                    <p className="px-1 py-2 text-slate-400">
                      Новых сообщений по заявкам нет.
                    </p>
                  )}
                {!loadingNotifications &&
                  !notificationsError &&
                  notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={`/requests/${item.id}/chat`}
                      className="block rounded-lg px-2 py-2 text-left text-[11px] text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setOpenNotifications(false)}
                    >
                      <div className="mb-0.5 text-[10px] text-slate-500">
                        Заявка № {item.index ?? "—"}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="line-clamp-2 text-xs font-medium">
                          {item.headers ?? "(без темы)"}
                        </div>
                        <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                          +{item.unreadCount}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>

        {isExecutor && (
          <nav className="hidden items-center gap-3 text-xs font-medium md:flex">
            <Link
              href="/requests"
              className={`rounded-full px-3 py-1 transition-colors ${
                onRequestsPage
                  ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Заявки
            </Link>
          </nav>
        )}

        <div className="relative">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-800">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                {displayNameAbbreviation}
              </span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg">
              <div className="mb-2">
                <div className="font-semibold">{displayName}</div>
                <div className="text-[11px] text-slate-500">
                  Компания: {elmaCompanyId}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-800"
                >
                  Выйти
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}


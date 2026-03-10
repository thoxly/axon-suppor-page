"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ApiResponse =
  | { item: { __id: string; __index?: number | null }; error?: undefined }
  | { error: string; item?: undefined };

type UrgencyOption = {
  code: "very_low" | "low" | "medium" | "high" | "very_high";
  label: string;
};

export default function NewRequestPage() {
  const router = useRouter();

  const urgencyOptions = useMemo<UrgencyOption[]>(
    () => [
      { code: "very_low", label: "Очень низкий" },
      { code: "low", label: "Низкий" },
      { code: "medium", label: "Средний" },
      { code: "high", label: "Высокий" },
      { code: "very_high", label: "Критичный" },
    ],
    [],
  );

  const [headers, setHeaders] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [urgencyCode, setUrgencyCode] =
    useState<UrgencyOption["code"]>("medium");
  const [categoryCode, setCategoryCode] = useState("general");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    headers.trim().length > 0 &&
    problemDescription.trim().length > 0 &&
    !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers,
          problemDescription,
          urgencyCode,
          categoryCode,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || "error" in data) {
        setError(
          data.error ?? "Не удалось создать обращение. Попробуйте ещё раз.",
        );
        return;
      }

      if (!data.item || !data.item.__id) {
        setError(
          "Обращение создано, но ELMA365 не вернула идентификатор. Откройте список обращений, чтобы проверить результат.",
        );
        return;
      }

      // После успешного создания переходим в список,
      // который подхватит новую заявку при следующей синхронизации.
      router.push("/requests");
      router.refresh();
    } catch {
      setError(
        "Ошибка сети при создании обращения. Проверьте подключение и попробуйте ещё раз.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/requests"
        className="inline-flex items-center text-xs font-medium text-sky-700 hover:text-sky-800"
      >
        ← Вернуться к списку обращений
      </Link>

      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">
          Создать обращение
        </h1>
        <p className="text-xs text-slate-500">
          Заявка будет создана в ELMA365 от вашего имени.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
      >
        {error && (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
            Тема
          </span>
          <input
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Коротко опишите проблему"
            maxLength={200}
            disabled={submitting}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
            Описание
          </span>
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            className="min-h-[140px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Подробности, шаги воспроизведения, контакт для связи и т.п."
            disabled={submitting}
            required
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
              Приоритет
            </span>
            <select
              value={urgencyCode}
              onChange={(e) =>
                setUrgencyCode(e.target.value as UrgencyOption["code"])
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
              disabled={submitting}
            >
              {urgencyOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
              Категория
            </span>
            <input
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
              placeholder="general"
              disabled={submitting}
            />
            <p className="text-[11px] text-slate-500">
              По умолчанию: <span className="text-slate-700">general</span>
            </p>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/requests"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {submitting ? "Создаём..." : "Создать обращение"}
          </button>
        </div>
      </form>
    </div>
  );
}


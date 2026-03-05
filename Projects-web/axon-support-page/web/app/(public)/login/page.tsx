"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Введите email");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (response.ok) {
        setSuccess(
          "Мы отправили ссылку для входа на вашу почту. Перейдите по ней, чтобы войти в кабинет.",
        );
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (response.status === 403) {
          setError(
            data.error ??
              "Доступ запрещён. Убедитесь, что ваш email добавлен в ELMA365.",
          );
        } else {
          setError(
            data.error ?? "Не удалось выполнить вход. Попробуйте ещё раз позже.",
          );
        }
      }
    } catch {
      setError("Ошибка сети. Проверьте подключение и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/60 p-8 shadow-xl ring-1 ring-slate-800">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-50">
          Service Desk портал
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Введите рабочий email, указанный в ELMA365. Регистрация не
          требуется&nbsp;— доступ только для существующих контактов.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-200"
            >
              Рабочий email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="you@company.ru"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-400" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-500/60"
          >
            {submitting ? "Отправляем ссылку..." : "Получить ссылку для входа"}
          </button>
        </form>
      </div>
    </div>
  );
}


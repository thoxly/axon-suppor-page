"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEmailSubmit = async (event: FormEvent) => {
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
          "Мы сгенерировали одноразовый код для входа. Посмотрите его в консоли сервера и введите ниже.",
        );
        setStep(2);
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

  const handleCodeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail || !trimmedCode) {
      setError("Введите email и код");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
      });

      if (response.ok) {
        setSuccess("Успешный вход, перенаправляем в кабинет…");
        window.location.href = "/requests";
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error ?? "Код не подошёл. Проверьте и попробуйте ещё раз.",
        );
      }
    } catch {
      setError("Ошибка сети. Проверьте подключение и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">
          Service Desk портал
        </h1>
        <p className="mb-2 text-center text-sm text-slate-600">
          Введите рабочий email, указанный в ELMA365. Регистрация не
          требуется&nbsp;— доступ только для существующих контактов.
        </p>
        <p className="mb-6 text-center text-xs text-slate-500">
          В режиме разработки вместо письма вы получаете одноразовый код в
          консоли сервера.
        </p>

        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-900"
              >
                Рабочий email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="you@company.ru"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-600" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-500/60"
            >
              {submitting ? "Генерируем код..." : "Получить код для входа"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-900"
              >
                Одноразовый код
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="Введите код из консоли"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-600" role="status">
                {success}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setError(null);
                  setSuccess(null);
                }}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-slate-800"
              >
                Изменить email
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-500/60"
              >
                {submitting ? "Проверяем код..." : "Войти"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = {
  id: string;
  body: string;
  author_type: string;
  direction: string;
  created_at: string;
};

type GetResponse =
  | {
      messages: Message[];
      canPost: boolean;
      isExecutor?: boolean;
      error?: undefined;
    }
  | {
      error: string;
      messages?: undefined;
      canPost?: undefined;
    };

type PostResponse =
  | {
      message: Message;
      error?: undefined;
    }
  | {
      error: string;
      message?: undefined;
    };

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage({
  params,
}: {
  params: { elmaId: string };
}) {
  const { elmaId } = params;

  const [effectiveElmaId, setEffectiveElmaId] = useState<string | null>(elmaId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canPost, setCanPost] = useState(true);
  const [isExecutor, setIsExecutor] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let id = effectiveElmaId;

      if (!id || id === "undefined" || id === "null") {
        if (typeof window !== "undefined") {
          const segments = window.location.pathname.split("/").filter(Boolean);
          const fromPath = segments[segments.length - 2];

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

      if (!id || id === "undefined" || id === "null") {
        if (!cancelled) {
          setError("Некорректный идентификатор заявки");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/requests/${id}/messages`, {
          method: "GET",
        });
        const data = (await response.json()) as GetResponse;

        if (!response.ok || "error" in data) {
          setError(
            data.error ??
              "Не удалось загрузить переписку. Попробуйте обновить страницу.",
          );
          return;
        }

        if (!cancelled) {
          setMessages(data.messages ?? []);
          setCanPost(data.canPost ?? true);
          setIsExecutor(Boolean(data.isExecutor));
        }
      } catch {
        if (!cancelled) {
          setError(
            "Ошибка сети при загрузке переписки. Проверьте подключение и попробуйте ещё раз.",
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
  }, [elmaId, effectiveElmaId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canPost || submitting) return;

    const text = input.trim();
    if (!text) return;

    setSubmitting(true);
    setError(null);

    try {
      const id = effectiveElmaId ?? elmaId;

      if (!id || id === "undefined" || id === "null") {
        setError("Некорректный идентификатор заявки");
        return;
      }

      const response = await fetch(`/api/requests/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: text }),
      });

      const data = (await response.json()) as PostResponse;

      if (!response.ok || "error" in data) {
        setError(
          data.error ??
            "Не удалось отправить сообщение. Попробуйте ещё раз позже.",
        );
        return;
      }

      if (data.message) {
        setMessages((previous) => [...previous, data.message]);
        setInput("");
      }
    } catch {
      setError(
        "Ошибка сети при отправке сообщения. Проверьте подключение и попробуйте ещё раз.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Link
            href={`/requests/${effectiveElmaId ?? elmaId}`}
            className="text-sky-300 hover:text-sky-200"
          >
            ← К заявке
          </Link>
          <span className="text-slate-500">·</span>
          <span>Переписка по заявке</span>
        </div>
        {!canPost && (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
            Заявка закрыта · новые сообщения недоступны
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 text-xs" ref={bottomRef}>
        {loading && (
          <p className="text-center text-slate-400">
            Загрузка переписки...
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-rose-400" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-slate-400">
            Переписка по этой заявке ещё не велась.
          </p>
        )}

        {!loading &&
          !error &&
          messages.map((message) => {
            const isCurrentUser =
              (message.author_type === "client" && !isExecutor) ||
              (message.author_type === "agent" && isExecutor);

            const alignment = isCurrentUser
              ? "items-end text-right"
              : "items-start text-left";

            const bubbleClasses = isCurrentUser
              ? "bg-sky-500 text-white"
              : "bg-slate-800 text-slate-50";

            return (
              <div
                key={message.id}
                className={`mb-2 flex flex-col gap-1 ${alignment}`}
              >
                <div
                  className={`inline-block max-w-[70%] rounded-2xl px-3 py-2 text-xs ${bubbleClasses}`}
                >
                  {message.body}
                </div>
                <span className="text-[10px] text-slate-400">
                  {isCurrentUser ? "Вы" : "Поддержка"} ·{" "}
                  {formatTime(message.created_at)}
                </span>
              </div>
            );
          })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 bg-slate-950/70 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            className="min-h-[40px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-900/60"
            placeholder={
              canPost
                ? "Напишите сообщение по заявке..."
                : "Переписка по закрытой заявке доступна только для чтения."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!canPost || submitting}
            rows={2}
          />
          <button
            type="submit"
            disabled={!canPost || submitting || !input.trim()}
            className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Отправить
          </button>
        </div>
      </form>
    </div>
  );
}


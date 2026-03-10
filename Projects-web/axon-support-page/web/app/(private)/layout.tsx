import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const displayName =
    (profile.full_name as string | null) ?? (user.email as string | null) ?? "";

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="text-right">
              <div className="font-medium">{displayName}</div>
            </div>
            <nav className="flex items-center gap-3 text-xs font-medium">
              <Link
                href="/requests"
                className="rounded-full px-3 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Мои обращения
              </Link>
              <Link
                href="/login"
                className="rounded-full px-3 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Выйти
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}


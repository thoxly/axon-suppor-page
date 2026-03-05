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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm font-semibold text-white">
              SD
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                Service Desk портал
              </span>
              <span className="text-xs text-slate-400">
                Витрина заявок ELMA365
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="font-medium">{displayName}</div>
            </div>
            <nav className="flex items-center gap-3 text-xs font-medium text-slate-300">
              <Link
                href="/requests"
                className="rounded-md px-2 py-1 hover:bg-slate-800 hover:text-slate-50"
              >
                Мои обращения
              </Link>
              <Link
                href="/login"
                className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-50"
              >
                Выйти
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}


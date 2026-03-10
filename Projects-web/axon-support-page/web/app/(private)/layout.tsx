import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import { HeaderShell } from "./HeaderShell";

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

  const elmaCompanyId =
    (profile.elma_company_id as string | null) ?? "не указана";

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <HeaderShell
          displayName={displayName}
          elmaCompanyId={elmaCompanyId}
          isExecutor={Boolean(profile.is_executor)}
        />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}


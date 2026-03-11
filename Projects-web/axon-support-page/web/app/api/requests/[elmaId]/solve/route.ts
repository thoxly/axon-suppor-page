import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import { query } from "@/lib/db";

type Params = {
  elmaId: string;
};

type TicketRow = {
  status_code: number | null;
  is_executor_for_ticket: boolean;
};

async function loadTicketForUser(
  elmaId: string,
  profileId: string,
  isExecutor: boolean,
): Promise<TicketRow | null> {
  const sql = `
    select
      t.status_code,
      coalesce(
        case
          when p.is_executor
               and p.elma_contact_id = t.elma_executor_id then true
          else false
        end,
        false
      ) as is_executor_for_ticket
    from public.tickets t
    join public.profiles p
      on p.id = $1
     ${isExecutor ? "" : "and p.elma_company_id = t.elma_company_id"}
     and (
       p.elma_contact_id = t.elma_initiator_id
       or (
         p.is_executor
         and p.elma_contact_id = t.elma_executor_id
       )
     )
    where t.elma_id = $2
    limit 1;
  `;

  const { rows } = await query<TicketRow>(sql, [profileId, elmaId]);
  return rows[0] ?? null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    const { elmaId: paramsElmaId } = await context.params;

    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const fromPath = pathSegments[pathSegments.length - 2] ?? null;
    const elmaId = paramsElmaId ?? fromPath;

    if (!elmaId || elmaId === "undefined" || elmaId === "null") {
      return NextResponse.json(
        { error: "Некорректный идентификатор заявки" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateCurrentProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "Профиль пользователя не найден" },
        { status: 403 },
      );
    }

    const ticket = await loadTicketForUser(
      elmaId,
      profile.id as string,
      profile.is_executor,
    );

    if (!ticket) {
      return NextResponse.json(
        { error: "Заявка не найдена или доступ запрещён" },
        { status: 404 },
      );
    }

    const isAlreadyClosed =
      ticket.status_code === 6 || ticket.status_code === 7;

    if (!isAlreadyClosed) {
      await query(
        `
          update public.tickets
             set status_code = 6,
                 updated_at = timezone('utc', now())
           where elma_id = $1;
        `,
        [elmaId],
      );
    }

    return NextResponse.json({
      ok: true,
      status: 6,
    });
  } catch (error) {
    console.error("Solve request error:", error);
    return NextResponse.json(
      { error: "Не удалось завершить заявку" },
      { status: 500 },
    );
  }
}


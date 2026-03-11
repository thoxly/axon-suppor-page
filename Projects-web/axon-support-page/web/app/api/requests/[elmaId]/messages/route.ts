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

type MessageRow = {
  id: string;
  body: string;
  author_type: string;
  direction: string;
  created_at: string;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    const { elmaId: paramsElmaId } = await context.params;

    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const fromPath = pathSegments[pathSegments.length - 2];
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

    const { rows } = await query<MessageRow>(
      `
        select
          id,
          body,
          author_type,
          direction,
          created_at
        from public.ticket_messages
        where ticket_elma_id = $1
        order by created_at asc;
      `,
      [elmaId],
    );

    const isClosed = ticket.status_code === 6 || ticket.status_code === 7;

    // Обновляем метку прочтения: считаем, что при загрузке чата пользователь просмотрел все сообщения
    const lastMessageCreatedAt =
      rows.length > 0 ? rows[rows.length - 1]?.created_at : null;

    if (lastMessageCreatedAt) {
      await query(
        `
          insert into public.ticket_message_reads (
            ticket_elma_id,
            profile_id,
            last_read_at
          )
          values ($1, $2, $3)
          on conflict (ticket_elma_id, profile_id) do update set
            last_read_at = excluded.last_read_at,
            updated_at = timezone('utc', now());
        `,
        [elmaId, profile.id, lastMessageCreatedAt],
      );
    }

    return NextResponse.json({
      messages: rows,
      canPost: !isClosed,
      isExecutor: ticket.is_executor_for_ticket,
    });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить переписку" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    const { elmaId: paramsElmaId } = await context.params;

    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const fromPath = pathSegments[pathSegments.length - 2];
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

    const isClosed = ticket.status_code === 6 || ticket.status_code === 7;

    if (isClosed) {
      return NextResponse.json(
        { error: "По закрытым заявкам переписка не ведётся" },
        { status: 400 },
      );
    }

    const bodyJson = await request.json().catch(() => ({}));
    const text =
      typeof bodyJson.body === "string" ? bodyJson.body.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Текст сообщения не может быть пустым" },
        { status: 400 },
      );
    }

    const authorType = profile.is_executor ? "agent" : "client";

    const insertSql = `
      insert into public.ticket_messages (
        ticket_elma_id,
        author_profile_id,
        author_type,
        direction,
        body
      )
      values ($1, $2, $3, 'outgoing', $4)
      returning id, body, author_type, direction, created_at;
    `;

    const { rows } = await query<MessageRow>(insertSql, [
      elmaId,
      profile.id,
      authorType,
      text,
    ]);

    const created = rows[0];

    return NextResponse.json({ message: created });
  } catch (error) {
    console.error("Message create error:", error);
    return NextResponse.json(
      { error: "Не удалось отправить сообщение" },
      { status: 500 },
    );
  }
}


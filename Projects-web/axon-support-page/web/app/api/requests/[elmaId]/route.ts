import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import { getRequestById } from "@/lib/elmaClient";
import { query } from "@/lib/db";

type Params = {
  elmaId: string;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    const params = await context.params;
    console.error("API /api/requests/[elmaId] params:", params);
    const { elmaId } = params;

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

    const item = await getRequestById(elmaId);

    if (!item) {
      return NextResponse.json(
        { error: "Заявка не найдена" },
        { status: 404 },
      );
    }

    const company = item.company?.[0];
    const initiator = item.iniciator?.[0];

    if (
      !company ||
      !initiator ||
      company !== profile.elma_company_id ||
      initiator !== profile.elma_contact_id
    ) {
      return NextResponse.json(
        { error: "Доступ к заявке запрещён" },
        { status: 403 },
      );
    }

    await query(
      `
      insert into public.tickets (
        elma_id,
        elma_index,
        elma_company_id,
        elma_initiator_id,
        headers,
        problem_description,
        urgency_code,
        category_code,
        status_code,
        creation_date,
        deadline_date,
        raw
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      on conflict (elma_id) do update set
        elma_index = excluded.elma_index,
        elma_company_id = excluded.elma_company_id,
        elma_initiator_id = excluded.elma_initiator_id,
        headers = excluded.headers,
        problem_description = excluded.problem_description,
        urgency_code = excluded.urgency_code,
        category_code = excluded.category_code,
        status_code = excluded.status_code,
        creation_date = excluded.creation_date,
        deadline_date = excluded.deadline_date,
        raw = excluded.raw,
        updated_at = timezone('utc', now());
    `,
      [
        item.__id,
        item.__index ?? null,
        company,
        initiator,
        item.headers ?? null,
        item.problem_description ?? null,
        null,
        null,
        item.__status?.status ?? null,
        item.creation_date ? new Date(item.creation_date) : null,
        item.deadline_date ? new Date(item.deadline_date) : null,
        item as unknown as object,
      ],
    );

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Request details error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить заявку" },
      { status: 500 },
    );
  }
}


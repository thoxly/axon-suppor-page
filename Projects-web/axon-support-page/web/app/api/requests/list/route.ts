import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import { listRequests, type ElmaRequestListItem } from "@/lib/elmaClient";
import { query } from "@/lib/db";

export async function GET() {
  try {
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

    const companyId: string = profile.elma_company_id;
    const contactId: string = profile.elma_contact_id;

    let elmaRequests: ElmaRequestListItem[] = [];

    if (profile.is_executor) {
      const [initiatorRequests, executorRequests] = await Promise.all([
        listRequests({
          companyId,
          initiatorId: contactId,
        }),
        listRequests({
          executorId: contactId,
        }),
      ]);

      const byId = new Map<string, ElmaRequestListItem>();

      [...initiatorRequests, ...executorRequests].forEach((item) => {
        byId.set(item.__id, item);
      });

      elmaRequests = Array.from(byId.values());
    } else {
      elmaRequests = await listRequests({
        companyId,
        initiatorId: contactId,
      });
    }

    if (elmaRequests.length > 0) {
      const values: unknown[] = [];
      const valueStrings: string[] = [];

      elmaRequests.forEach((item, index) => {
        const baseIndex = index * 13;
        const company = item.company?.[0] ?? companyId;
        const initiator = item.iniciator?.[0] ?? contactId;
        const executor = item.executor?.[0] ?? null;

        values.push(
          item.__id,
          item.__index ?? null,
          company,
          initiator,
          executor,
          item.headers ?? null,
          item.problem_description ?? null,
          null, // urgency_code (not normalized in sample)
          null, // category_code
          item.__status?.status ?? null,
          item.creation_date ? new Date(item.creation_date) : null,
          item.deadline_date ? new Date(item.deadline_date) : null,
          item as unknown as object,
        );

        valueStrings.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${
            baseIndex + 4
          }, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${
            baseIndex + 8
          }, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${
            baseIndex + 12
          }, $${baseIndex + 13})`,
        );
      });

      const sql = `
        insert into public.tickets (
          elma_id,
          elma_index,
          elma_company_id,
          elma_initiator_id,
          elma_executor_id,
          headers,
          problem_description,
          urgency_code,
          category_code,
          status_code,
          creation_date,
          deadline_date,
          raw
        )
        values ${valueStrings.join(", ")}
        on conflict (elma_id) do update set
          elma_index = excluded.elma_index,
          elma_company_id = excluded.elma_company_id,
          elma_initiator_id = excluded.elma_initiator_id,
          elma_executor_id = excluded.elma_executor_id,
          headers = excluded.headers,
          problem_description = excluded.problem_description,
          urgency_code = excluded.urgency_code,
          category_code = excluded.category_code,
          status_code = excluded.status_code,
          creation_date = excluded.creation_date,
          deadline_date = excluded.deadline_date,
          raw = excluded.raw,
          updated_at = timezone('utc', now());
      `;

      await query(sql, values);
    }

    const normalized = elmaRequests.map((item) => ({
      id: item.__id,
      index: item.__index,
      headers: item.headers,
      status: item.__status?.status,
      creationDate: item.creation_date,
      deadlineDate: item.deadline_date,
    }));

    return NextResponse.json({ items: normalized });
  } catch (error) {
    console.error("Requests list error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить список заявок" },
      { status: 500 },
    );
  }
}


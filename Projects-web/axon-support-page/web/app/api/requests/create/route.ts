import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import { createRequest, type ElmaUrgencyCode } from "@/lib/elmaClient";
import { query } from "@/lib/db";

function isUrgencyCode(value: unknown): value is ElmaUrgencyCode {
  return (
    value === "very_low" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "very_high"
  );
}

export async function POST(request: NextRequest) {
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

    const bodyJson = await request.json().catch(() => ({}));

    const headersRaw =
      typeof bodyJson.headers === "string" ? bodyJson.headers.trim() : "";
    const descriptionRaw =
      typeof bodyJson.problemDescription === "string"
        ? bodyJson.problemDescription.trim()
        : "";
    const urgencyRaw = bodyJson.urgencyCode;
    const categoryRaw =
      typeof bodyJson.categoryCode === "string"
        ? bodyJson.categoryCode.trim()
        : "";

    if (!headersRaw) {
      return NextResponse.json(
        { error: "Тема заявки обязательна" },
        { status: 400 },
      );
    }

    if (!descriptionRaw) {
      return NextResponse.json(
        { error: "Описание заявки обязательно" },
        { status: 400 },
      );
    }

    if (!isUrgencyCode(urgencyRaw)) {
      return NextResponse.json(
        { error: "Некорректный приоритет (urgency)" },
        { status: 400 },
      );
    }

    const item = await createRequest({
      companyId: profile.elma_company_id as string,
      initiatorId: profile.elma_contact_id as string,
      headers: headersRaw,
      problemDescription: descriptionRaw,
      urgencyCode: urgencyRaw,
      categoryCode: categoryRaw || "general",
    });

    if (!item) {
      return NextResponse.json(
        { error: "ELMA365 не вернула созданную заявку" },
        { status: 502 },
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
        item.company?.[0] ?? (profile.elma_company_id as string),
        item.iniciator?.[0] ?? (profile.elma_contact_id as string),
        item.headers ?? null,
        item.problem_description ?? null,
        urgencyRaw,
        categoryRaw || "general",
        item.__status?.status ?? 1,
        item.creation_date ? new Date(item.creation_date) : new Date(),
        item.deadline_date ? new Date(item.deadline_date) : null,
        item as unknown as object,
      ],
    );

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Requests create error:", error);
    return NextResponse.json(
      { error: "Не удалось создать заявку" },
      { status: 500 },
    );
  }
}


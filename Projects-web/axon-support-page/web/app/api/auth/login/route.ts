import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ELMA_BASE_URL =
  process.env.ELMA_API_BASE_URL ?? "https://elma-dev.copycon.ru/pub/v1";
const ELMA_API_KEY = process.env.ELMA_API_KEY;

type ElmaPerson = {
  __id: string;
  _email?: { email: string }[];
  _companies?: string[];
  _fullname?: {
    lastname?: string;
    firstname?: string;
    middlename?: string;
  };
};

type ElmaListResponse = {
  success: boolean;
  error: string;
  result?: {
    result?: ElmaPerson[];
    total?: number;
  };
};

async function fetchElmaRecordByEmail(
  urlPath: string,
  email: string,
): Promise<ElmaPerson | null> {
  if (!ELMA_API_KEY) {
    console.error("ELMA_API_KEY is not set");
    throw new Error("ELMA API key is not configured");
  }

  const response = await fetch(`${ELMA_BASE_URL}${urlPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ELMA_API_KEY}`,
    },
    body: JSON.stringify({
      active: true,
      filter: {
        tf: {
          _email: email,
        },
      },
      fields: {
        "*": true,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("ELMA list API error:", response.status, text);
    throw new Error("Failed to query ELMA");
  }

  const data = (await response.json()) as ElmaListResponse;

  if (!data.success) {
    console.error("ELMA list API logical error:", data.error);
    throw new Error("ELMA list API returned an error");
  }

  const records = data.result?.result ?? [];
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  return records[0] ?? null;
}

async function findPersonByEmail(
  email: string,
): Promise<{ person: ElmaPerson; isExecutor: boolean } | null> {
  // Сначала ищем среди клиентских контактов
  const contact = await fetchElmaRecordByEmail(
    "/app/_clients/_contacts/list",
    email,
  );

  if (contact) {
    return { person: contact, isExecutor: false };
  }

  // Если не нашли, пробуем среди сотрудников (исполнителей)
  const employee = await fetchElmaRecordByEmail(
    "/app/_system_catalogs/_employees/list",
    email,
  );

  if (employee) {
    return { person: employee, isExecutor: true };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const personResult = await findPersonByEmail(email);

    if (!personResult) {
      return NextResponse.json(
        { error: "Пользователь с таким email не найден или не имеет доступа" },
        { status: 403 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      // Используем тип magiclink, но берём одноразовый код из properties.email_otp
      type: "magiclink",
      email,
      options: {
        redirectTo: process.env.NEXT_PUBLIC_SITE_URL ?? undefined,
      },
    });

    if (error || !data) {
      console.error("Supabase generateLink email_otp error:", error ?? data);
      return NextResponse.json(
        { error: "Не удалось сгенерировать код для входа" },
        { status: 500 },
      );
    }

    const otp =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any).properties?.email_otp as string | undefined;

    if (!otp) {
      console.error("No email_otp in generateLink response", data);
      return NextResponse.json(
        { error: "Не удалось получить одноразовый код" },
        { status: 500 },
      );
    }

    console.log(`[DEV] OTP для ${email}: ${otp}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login endpoint error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}


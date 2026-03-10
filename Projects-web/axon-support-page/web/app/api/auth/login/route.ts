import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ELMA_BASE_URL =
  process.env.ELMA_API_BASE_URL ?? "https://elma-dev.copycon.ru/pub/v1";
const ELMA_API_KEY = process.env.ELMA_API_KEY;

type ElmaContact = {
  __id: string;
  _email?: { email: string }[];
  _companies?: string[];
  _fullname?: {
    lastname?: string;
    firstname?: string;
    middlename?: string;
  };
};

type ElmaContactsResponse = {
  success: boolean;
  error: string;
  result?: {
    result?: ElmaContact[];
    total?: number;
  };
};

type ElmaUser = {
  email?: string;
  fullname?: {
    firstname?: string;
    lastname?: string;
    middlename?: string;
  };
};

type ElmaUsersResponse = {
  success: boolean;
  error: string;
  result?: {
    result?: ElmaUser[];
    total?: number;
  };
};

async function findContactByEmail(email: string): Promise<ElmaContact | null> {
  if (!ELMA_API_KEY) {
    console.error("ELMA_API_KEY is not set");
    throw new Error("ELMA API key is not configured");
  }

  const response = await fetch(
    `${ELMA_BASE_URL}/app/_clients/_contacts/list`,
    {
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
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("ELMA contacts API error:", response.status, text);
    throw new Error("Failed to query ELMA contacts");
  }

  const data = (await response.json()) as ElmaContactsResponse;

  if (!data.success) {
    console.error("ELMA contacts API logical error:", data.error);
    throw new Error("ELMA contacts API returned an error");
  }

  const contacts = data.result?.result ?? [];
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return null;
  }

  return contacts[0] ?? null;
}

async function findUserByEmail(email: string): Promise<ElmaUser | null> {
  if (!ELMA_API_KEY) {
    console.error("ELMA_API_KEY is not set");
    throw new Error("ELMA API key is not configured");
  }

  const response = await fetch(`${ELMA_BASE_URL}/user/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ELMA_API_KEY}`,
    },
    body: JSON.stringify({
      filter: {
        tf: {
          email,
        },
      },
      fields: {
        "*": true,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("ELMA users API error:", response.status, text);
    throw new Error("Failed to query ELMA users");
  }

  const data = (await response.json()) as ElmaUsersResponse;

  if (!data.success) {
    console.error("ELMA users API logical error:", data.error);
    throw new Error("ELMA users API returned an error");
  }

  const users = data.result?.result ?? [];
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }

  return users[0] ?? null;
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

    const [contact, userInfo] = await Promise.all([
      findContactByEmail(email),
      findUserByEmail(email),
    ]);

    if (!contact && !userInfo) {
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


import { createClient } from "@/lib/supabase/server";

const ELMA_BASE_URL =
  process.env.ELMA_API_BASE_URL ?? "https://elma-dev.copycon.ru/pub/v1";
const ELMA_API_KEY = process.env.ELMA_API_KEY;

type ElmaPerson = {
  __id: string;
  _email?: { email: string }[];
  _companies?: string[];
  my_business?: string[];
  _fullname?: {
    lastname?: string;
    firstname?: string;
    middlename?: string;
  };
  f_i_o?: {
    lastname?: string;
    firstname?: string;
    middlename?: string;
  } | null;
  __name?: string;
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

async function fetchPersonByEmail(
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

export async function getOrCreateCurrentProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const email = user.email;
  if (!email) {
    return null;
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error loading profile:", profileError.message);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const personResult = await fetchPersonByEmail(email);

  if (!personResult) {
    console.error(
      "ELMA contact not found for authenticated user, email:",
      email,
    );
    return null;
  }

  const person = personResult.person;

  let elmaCompanyId: string | undefined;

  if (personResult.isExecutor) {
    const businesses = person.my_business ?? [];
    elmaCompanyId = businesses[0];
  } else {
    const companies = person._companies ?? [];
    elmaCompanyId = companies[0];
  }

  if (!elmaCompanyId) {
    console.error(
      "ELMA person has no company for authenticated user, email:",
      email,
    );
    return null;
  }

  const fio = person.f_i_o ?? person._fullname;
  const fullName =
    (fio &&
      [fio.lastname, fio.firstname, fio.middlename].filter(Boolean).join(" ")) ||
    person.__name ||
    null;

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      elma_contact_id: personResult.person.__id,
      elma_company_id: elmaCompanyId,
      full_name: fullName,
      is_executor: personResult.isExecutor,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("Error creating profile:", insertError.message);
    return null;
  }

  return newProfile;
}


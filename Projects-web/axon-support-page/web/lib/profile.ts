import { createClient } from "@/lib/supabase/server";

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

async function fetchContactByEmail(
  email: string,
): Promise<ElmaContact | null> {
  if (!ELMA_API_KEY) {
    console.error("ELMA_API_KEY is not set");
    throw new Error("ELMA API key is not configured");
  }

  const response = await fetch(`${ELMA_BASE_URL}/app/_clients/_contacts/list`, {
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

  const contact = await fetchContactByEmail(email);

  if (!contact) {
    console.error(
      "ELMA contact not found for authenticated user, email:",
      email,
    );
    return null;
  }

  const companies = contact._companies ?? [];
  const elmaCompanyId = companies[0];

  if (!elmaCompanyId) {
    console.error(
      "ELMA contact has no companies for authenticated user, email:",
      email,
    );
    return null;
  }

  const fullname = contact._fullname;
  const fullName =
    fullname &&
    [fullname.lastname, fullname.firstname, fullname.middlename]
      .filter(Boolean)
      .join(" ");

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      elma_contact_id: contact.__id,
      elma_company_id: elmaCompanyId,
      full_name: fullName,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("Error creating profile:", insertError.message);
    return null;
  }

  return newProfile;
}


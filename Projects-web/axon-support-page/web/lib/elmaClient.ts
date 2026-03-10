const ELMA_BASE_URL =
  process.env.ELMA_API_BASE_URL ?? "https://elma-dev.copycon.ru/pub/v1";
const ELMA_API_KEY = process.env.ELMA_API_KEY;

function getAuthHeaders() {
  if (!ELMA_API_KEY) {
    throw new Error("ELMA_API_KEY is not configured");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ELMA_API_KEY}`,
  };
}

export type ElmaRequestStatus = {
  order: number;
  status: number;
};

export type ElmaRequestListItem = {
  __id: string;
  __index: number;
  __name?: string;
  headers?: string;
  problem_description?: string;
  urgency?: unknown;
  category?: unknown;
  company?: string[];
  iniciator?: string[];
  executor?: string[];
  __status?: ElmaRequestStatus;
  creation_date?: string;
  deadline_date?: string | null;
};

export type ElmaRequestListResponse = {
  success: boolean;
  error: string;
  result?: {
    result?: ElmaRequestListItem[];
    total?: number;
  };
};

export type ElmaRequestGetResponse = {
  success: boolean;
  error: string;
  item?: ElmaRequestListItem & {
    status_history?: unknown;
    attached_file?: unknown;
  };
};

export type ElmaUrgencyCode =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high";

export type ElmaCategoryCode = "general" | (string & {});

export async function listRequests(params: {
  companyId?: string;
  initiatorId?: string;
  executorId?: string;
  statusCodes?: number[];
  from?: number;
}): Promise<ElmaRequestListItem[]> {
  const filterTf: Record<string, unknown> = {};

  if (params.companyId) {
    filterTf.company = [params.companyId];
  }

  if (params.initiatorId) {
    filterTf.iniciator = [params.initiatorId];
  }

  if (params.executorId) {
    filterTf.executor = [params.executorId];
  }

  if (params.statusCodes && params.statusCodes.length > 0) {
    filterTf.__status = params.statusCodes;
  }

  const body: Record<string, unknown> = {
    active: true,
    filter: {
      tf: filterTf,
    },
    from: params.from ?? 0,
    fields: {
      "*": true,
    },
  };

  const response = await fetch(`${ELMA_BASE_URL}/app/requests/requests/list`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("ELMA listRequests error:", response.status, text);
    throw new Error("Failed to load requests from ELMA");
  }

  const data = (await response.json()) as ElmaRequestListResponse;

  if (!data.success) {
    console.error("ELMA listRequests logical error:", data.error);
    throw new Error("ELMA listRequests returned an error");
  }

  return data.result?.result ?? [];
}

export async function getRequestById(
  id: string,
): Promise<ElmaRequestGetResponse["item"]> {
  if (!id || id === "undefined" || id === "null") {
    console.error("getRequestById called with invalid id:", id);
    throw new Error("Invalid ELMA request id");
  }

  const response = await fetch(
    `${ELMA_BASE_URL}/app/requests/requests/${id}/get`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("ELMA getRequestById error:", response.status, text);
    throw new Error("Failed to load request from ELMA");
  }

  const data = (await response.json()) as ElmaRequestGetResponse;

  if (!data.success) {
    console.error("ELMA getRequestById logical error:", data.error);
    throw new Error("ELMA getRequestById returned an error");
  }

  return data.item;
}

export type ElmaRequestCreateResponse = {
  success: boolean;
  error: string;
  item?: ElmaRequestListItem;
};

export async function createRequest(params: {
  companyId: string;
  initiatorId: string;
  headers: string;
  problemDescription: string;
  urgencyCode: ElmaUrgencyCode;
  categoryCode?: ElmaCategoryCode;
}): Promise<ElmaRequestCreateResponse["item"]> {
  const body = {
    context: {
      company: [params.companyId],
      iniciator: [params.initiatorId],
      headers: params.headers,
      problem_description: params.problemDescription,
      urgency: [{ code: params.urgencyCode }],
      category: [{ code: params.categoryCode ?? "general" }],
    },
    withEventForceCreate: true,
  };

  const response = await fetch(`${ELMA_BASE_URL}/app/requests/requests/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("ELMA createRequest error:", response.status, text);
    throw new Error("Failed to create request in ELMA");
  }

  const data = (await response.json()) as ElmaRequestCreateResponse;

  if (!data.success) {
    console.error("ELMA createRequest logical error:", data.error);
    throw new Error("ELMA createRequest returned an error");
  }

  return data.item;
}


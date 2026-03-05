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
  executor?: unknown;
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

export async function listRequests(params: {
  companyId: string;
  initiatorId: string;
  statusCodes?: number[];
  from?: number;
}): Promise<ElmaRequestListItem[]> {
  const body: Record<string, unknown> = {
    active: true,
    filter: {
      tf: {
        company: [params.companyId],
        iniciator: [params.initiatorId],
      },
    },
    from: params.from ?? 0,
    fields: {
      "*": true,
    },
  };

  if (params.statusCodes && params.statusCodes.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (body.filter as any).tf.__status = params.statusCodes;
  }

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


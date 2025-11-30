const getBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error("BACKEND_URL environment variable is not set");
  }
  return url;
};

const getBackendApiKey = () => {
  const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
  if (!apiKey) {
    throw new Error("BACKEND_API_KEY environment variable is not set");
  }
  return apiKey;
};

interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function backendGet<T>(
  path: string,
  encryptedUserId?: string
): Promise<T> {
  const apiKey = encryptedUserId || getBackendApiKey();
  const res = await fetch(`${getBackendUrl()}/api/v1${path}`, {
    headers: { "X-API-Key": apiKey },
  });
  const json: BackendResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Backend request failed");
  }
  return json.data as T;
}

export async function backendPost<T>(
  path: string,
  body?: object,
  encryptedUserId?: string
): Promise<T> {
  const apiKey = encryptedUserId || getBackendApiKey();
  const res = await fetch(`${getBackendUrl()}/api/v1${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: BackendResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Backend request failed");
  }
  return json.data as T;
}

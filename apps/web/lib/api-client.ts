/**
 * Type-safe API client for the ClankerLoop backend.
 * Uses explicit types from @repo/api-types for type safety.
 */

const getBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL environment variable is not set");
  }
  return url;
};

const getBackendApiKey = () => {
  const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_API_KEY environment variable is not set"
    );
  }
  return apiKey;
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/**
 * Makes a GET request to the backend API.
 */
export async function apiGet<T>(
  path: string,
  encryptedUserId?: string,
  basePath: string = "/api/v1/problems"
): Promise<T> {
  const apiKey = encryptedUserId || getBackendApiKey();
  const res = await fetch(`${getBackendUrl()}${basePath}${path}`, {
    headers: { "X-API-Key": apiKey },
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Backend request failed");
  }
  return json.data as T;
}

/**
 * Makes a POST request to the backend API.
 */
export async function apiPost<T>(
  path: string,
  body?: object,
  encryptedUserId?: string,
  basePath: string = "/api/v1/problems"
): Promise<T> {
  const apiKey = encryptedUserId || getBackendApiKey();
  const res = await fetch(`${getBackendUrl()}${basePath}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Backend request failed");
  }
  return json.data as T;
}

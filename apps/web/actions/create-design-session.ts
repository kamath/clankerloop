"use server";

export async function createDesignSession(
  encryptedUserId: string,
): Promise<{ sessionId: string }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/design/sessions`,
    {
      method: "POST",
      headers: {
        "X-API-Key": encryptedUserId,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create session: ${errorText}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to create session");
  }

  return json.data;
}

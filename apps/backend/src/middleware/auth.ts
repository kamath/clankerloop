import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { decryptUserId } from "@/utils/auth";

export const apiKeyAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    throw new HTTPException(401, {
      message: "Missing API key. Provide X-API-Key header.",
    });
  }

  try {
    const decryptedUserId = await decryptUserId(apiKey);
    console.log("Decrypted user ID:", decryptedUserId);
  } catch (error) {
    console.error("Failed to decrypt user ID:", error);
    throw new HTTPException(403, {
      message: "Invalid API key. Decryption failed.",
    });
  }

  await next();
});

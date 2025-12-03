import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { decryptUserId } from "@/utils/auth";
import { WorkOS } from '@workos-inc/node';

export const apiKeyAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    throw new HTTPException(401, {
      message: "Missing API key. Provide X-API-Key header.",
    });
  }

  try {
    const decryptedUserId = await decryptUserId(apiKey, c.env);
	const workos = new WorkOS(c.env.WORKOS_API_KEY);


	const user = await workos.userManagement.getUser(
		decryptedUserId,
	);

	console.log("User:", JSON.stringify(user, null, 2));

    console.log("Decrypted user ID:", decryptedUserId);
    c.set("userId", decryptedUserId);
	c.set("isAdmin", user.metadata?.role === 'superduperadmin');
  } catch (error) {
    console.error("Failed to decrypt user ID:", error);
    throw new HTTPException(403, {
      message: "Invalid API key. Decryption failed.",
    });
  }

  await next();
});

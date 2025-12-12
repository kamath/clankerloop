import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { encryptUserId } from "@/lib/auth-utils";
import { createDesignSession } from "@/actions/create-design-session";

export default async function Page() {
  const { user } = await withAuth({
    ensureSignedIn: true,
  });

  if (!user) {
    return redirect("/login");
  }

  const encryptedUserId = encryptUserId(user.id);

  // Create new session and redirect
  const { sessionId } = await createDesignSession(encryptedUserId);

  redirect(`/design/${sessionId}`);
}

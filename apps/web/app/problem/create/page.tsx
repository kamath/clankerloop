import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { encryptUserId } from "@/lib/auth-utils";
import { createProblemWithText } from "./actions";

export default async function CreateProblemPage() {
  const { user } = await withAuth({
    ensureSignedIn: true,
  });

  if (!user) {
    return redirect("/login");
  }

  const encryptedUserId = encryptUserId(user.id);
  const { problemId } = await createProblemWithText(encryptedUserId);
  redirect(`/problem/${problemId}`);
}

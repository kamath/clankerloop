import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { encryptUserId } from "@/lib/auth-utils";
import { ClientFacingUserObject } from "@/lib/auth-types";
import ExcalidrawWrapper from "./components/excalidraw-wrapper";

export default async function Page() {
  const { user } = await withAuth({
    ensureSignedIn: true,
  });
  if (
    !user ||
    !user.email ||
    !user.firstName ||
    !user.lastName ||
    !user.profilePictureUrl ||
    !user.createdAt ||
    !user.updatedAt
  ) {
    return redirect("/login");
  }
  const encryptedUserId = encryptUserId(user.id);
  const clientFacingUser: ClientFacingUserObject = {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
    apiKey: encryptedUserId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  return (
    <ExcalidrawWrapper
      encryptedUserId={encryptedUserId}
      user={clientFacingUser}
    />
  );
}

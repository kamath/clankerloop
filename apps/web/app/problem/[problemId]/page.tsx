import { withAuth } from "@workos-inc/authkit-nextjs";
import ProblemRender from "./components/problem-render";
import { redirect } from "next/navigation";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { encryptUserId } from "@/lib/auth-utils";

export default async function Page({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;
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
  const clientFacingUser: ClientFacingUserObject = {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
    apiKey: encryptUserId(user.id),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  return <ProblemRender problemId={problemId} user={clientFacingUser} />;
}

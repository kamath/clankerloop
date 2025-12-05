"use server";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import {
  getMostRecentProblemByUser,
  listFocusAreas as listFocusAreasFromDb,
} from "@repo/db";
import { encryptUserId } from "@/lib/auth-utils";
import { ClientFacingUserObject } from "@/lib/auth-types";
import NewProblemPageWrapper from "./problem/[problemId]/components/problem-page-wrapper";

export default async function Home() {
  // Check if user is logged in (without requiring sign-in)
  const { user } = await withAuth();

  // If user is logged in, check if they have any problems
  if (user) {
    const mostRecentProblemId = await getMostRecentProblemByUser(user.id);

    // If they have problems, redirect to the most recent one
    if (mostRecentProblemId) {
      return redirect(`/problem/${mostRecentProblemId}`);
    }

    // User is logged in but has no problems - show the new problem page
    // Build the client-facing user object
    const clientFacingUser: ClientFacingUserObject | null =
      user.email && user.firstName && user.lastName
        ? {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: user.profilePictureUrl || "",
            apiKey: encryptUserId(user.id),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : null;

    // Fetch focus areas from database (server-side, no auth needed)
    const focusAreas = await listFocusAreasFromDb();

    return (
      <NewProblemPageWrapper user={clientFacingUser} focusAreas={focusAreas} />
    );
  }

  // User is not logged in - fetch focus areas and show the new problem page
  const focusAreas = await listFocusAreasFromDb();
  return <NewProblemPageWrapper user={null} focusAreas={focusAreas} />;
}

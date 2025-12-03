import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getLatestProblemForUser } from "@repo/db";
import ProblemRender from "./problem/[problemId]/components/problem-render";

export default async function Home() {
  const { user } = await withAuth({
    ensureSignedIn: false,
  });

  // If user is logged in, check for their latest problem
  if (user) {
    const latestProblemId = await getLatestProblemForUser(user.id);
    if (latestProblemId) {
      redirect(`/problem/${latestProblemId}`);
    }
    // If no problem exists, redirect to create page
    redirect("/problem/create");
  }

  // If user is not logged in, render ProblemRender in empty state
  return (
    <ProblemRender
      problemId={null}
      user={null}
      isAdmin={false}
    />
  );
}

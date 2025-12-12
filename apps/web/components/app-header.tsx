"use client";

import Link from "next/link";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { signOutAction } from "@/app/(auth)/signout";
import { IssueReportDialog } from "@/app/problem/[problemId]/components/issue-report-dialog";

interface AppHeaderProps {
  user: ClientFacingUserObject;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <div className="w-full p-4 flex items-center justify-between gap-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/">
          <h1
            className="text-xl font-bold hover:cursor-pointer"
            style={{ fontFamily: "var(--font-comic-relief)" }}
          >
            ClankerLoop
          </h1>
        </Link>
        <p>&middot;</p>
        <div className="font-comic-relief">
          hi {user.firstName.toLowerCase()}{" "}
          <form
            action={async () => {
              await signOutAction();
            }}
            className="inline"
          >
            <button
              type="submit"
              className="text-blue-500 hover:underline hover:cursor-pointer"
            >
              (sign out)
            </button>
          </form>
        </div>
        <IssueReportDialog />
      </div>
    </div>
  );
}

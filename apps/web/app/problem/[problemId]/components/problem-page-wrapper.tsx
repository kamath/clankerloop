"use client";

import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ClientFacingUserObject } from "@/lib/auth-types";
import { signOutAction } from "@/app/(auth)/signout";
import { PlayIcon, SendIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewProblemView from "./new-problem-view";
import type { FocusArea } from "@repo/api-types";

interface NewProblemPageWrapperProps {
  user: ClientFacingUserObject | null;
  focusAreas: FocusArea[];
}

export default function NewProblemPageWrapper({
  user,
  focusAreas,
}: NewProblemPageWrapperProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-muted">
      <div className="w-full p-4 flex items-center justify-between gap-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1
              className="text-xl font-bold hover:cursor-pointer"
              style={{ fontFamily: "var(--font-comic-relief)" }}
            >
              ClankerRank
            </h1>
          </Link>
          <p>&middot;</p>
          {user ? (
            <p className="font-comic-relief">
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
            </p>
          ) : (
            <Link href="/login">
              <p className="font-comic-relief text-blue-500 hover:underline hover:cursor-pointer">
                sign in
              </p>
            </Link>
          )}
        </div>
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 w-full min-h-0"
      >
        <ResizablePanel defaultSize={20} className="min-h-0">
          <NewProblemView user={user} focusAreas={focusAreas} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} className="min-h-0 flex flex-col">
          <ResizablePanelGroup direction="vertical" className="flex-1">
            <ResizablePanel defaultSize={50} className="min-h-0 flex flex-col">
              <div className="flex items-center justify-between p-2 border-b border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Select value="typescript" disabled>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 bg-secondary"
                    disabled
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                  <Button variant="default" size="sm" className="h-7" disabled>
                    <SendIcon className="h-4 w-4 mr-1" />
                    Submit
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  width="100%"
                  defaultLanguage="typescript"
                  language="typescript"
                  value="// Generate a problem to start coding"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    readOnly: true,
                  }}
                  loading={<Skeleton className="h-full w-full" />}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} className="min-h-0">
              <div className="h-full p-4 bg-card">
                <div className="text-sm text-muted-foreground">
                  Generate a problem to see test cases here.
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

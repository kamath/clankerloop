"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function IssueReportDialog() {
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  return (
    <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
      <DialogTrigger asChild>
        <button className="font-comic-relief text-red-600 hover:underline hover:cursor-pointer">
          🐛 report bug
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-comic-relief text-2xl text-yellow-600">
            noooooooo
          </DialogTitle>
          <DialogDescription>
            this app is still early! there are bound to be a few bugs, but the
            goal is to get to zero.
            <br />
            <br />
            to report a bug, either{" "}
            <span className="font-bold">open a github issue</span> or send an
            email to <span className="font-bold">anirudh@kamath.io</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            onClick={() => {
              window.open(
                "https://github.com/kamath/ClankerLoop/issues/new",
                "_blank",
                "noopener,noreferrer",
              );
              setShowIssueDialog(false);
            }}
          >
            Open GitHub Issue
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "mailto:anirudh+ClankerLoop@kamath.io";
              setShowIssueDialog(false);
            }}
          >
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

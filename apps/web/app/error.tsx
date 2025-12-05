"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";
import posthog from "posthog-js";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Client-side error:", error);

    // Capture error as PostHog event
    posthog.capture("error_boundary_triggered", {
      error_message: error.message,
      error_stack: error.stack,
      error_digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <AlertTitle className="text-2xl font-bold font-comic-relief text-yellow-600">
            ah crap
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-lg text-foreground mt-2">
              Something weird happened when loading this page. Please try
              refreshing the page.
            </p>
            {process.env.NODE_ENV === "development" && error.message && (
              <details className="mt-2 w-full overflow-auto">
                <summary className="cursor-pointer text-xs font-medium">
                  Error details (development only)
                </summary>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-destructive/10 rounded border border-destructive/20">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh page
          </Button>
          <Button
            onClick={() => {
              window.open(
                "https://github.com/kamath/ClankerLoop/issues/new",
                "_blank",
                "noopener,noreferrer"
              );
            }}
            variant="outline"
            className="flex-1"
          >
            Open GitHub Issue
          </Button>
        </div>
      </div>
    </div>
  );
}

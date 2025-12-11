"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Test page to preview the error boundary
 * Visit /test-error and click the button to see the error page
 */
export default function TestErrorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("This is a test error to preview the error page!");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">Error Page Preview</h1>
        <p className="text-muted-foreground">
          Click the button below to trigger an error and see your custom error
          page.
        </p>
        <Button
          onClick={() => setShouldThrow(true)}
          variant="destructive"
          className="w-full"
        >
          Trigger Error (Preview Error Page)
        </Button>
        <p className="text-sm text-muted-foreground">
          After viewing, you can delete this test page at{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            apps/web/app/test-error/page.tsx
          </code>
        </p>
      </div>
    </div>
  );
}

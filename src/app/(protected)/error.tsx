"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Protected route error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-lg space-y-3">
        <h1 className="text-lg font-medium">Something went wrong loading this page.</h1>
        <p className="text-sm text-muted-foreground">
          {isDev
            ? error.message
            : "We hit an unexpected error. Try again — if it keeps happening, refresh the page or contact an admin."}
        </p>
        {isDev && error.stack ? (
          <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
            {error.stack}
          </pre>
        ) : null}
        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Reload
          </Button>
        </div>
      </div>
    </main>
  );
}

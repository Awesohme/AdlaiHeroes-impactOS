"use client";

export function PageLoading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-10 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded-full bg-muted animate-pulse" />
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-background p-5 shadow-sm">
            <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
            <div className="mt-4 h-8 w-16 rounded-lg bg-muted animate-pulse" />
            <div className="mt-3 h-3 w-28 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-background p-5 shadow-sm">
        <div className="h-4 w-32 rounded-full bg-muted animate-pulse" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1.25fr_1fr_1fr]">
              <div className="h-10 rounded-lg bg-muted animate-pulse" />
              <div className="h-10 rounded-lg bg-muted animate-pulse" />
              <div className="h-10 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        Loading {title.toLowerCase()}.
      </div>
    </div>
  );
}

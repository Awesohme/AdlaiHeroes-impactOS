"use client";

import Image from "next/image";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_PX: Record<"sm" | "md", number> = {
  sm: 80,
  md: 120,
};

export function MediaPreview({
  driveFileId,
  label,
  size = "md",
  fallback,
  className,
}: {
  driveFileId: string | null | undefined;
  label?: string;
  size?: "sm" | "md";
  fallback?: React.ReactNode;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!driveFileId) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        {fallback ?? "No file on record yet."}
      </div>
    );
  }

  const dim = SIZE_PX[size];
  const thumb = `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w240`;
  const viewUrl = `https://drive.google.com/file/d/${driveFileId}/view`;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {imageFailed ? (
        <div
          className="flex shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] uppercase tracking-wider text-muted-foreground"
          style={{ width: dim, height: dim }}
        >
          No preview
        </div>
      ) : (
        <Image
          src={thumb}
          alt={label ?? "Drive preview"}
          width={dim}
          height={dim}
          onError={() => setImageFailed(true)}
          className="shrink-0 rounded-md border object-cover ring-1 ring-border"
          style={{ width: dim, height: dim }}
          unoptimized
        />
      )}
      <div className="min-w-0 space-y-1">
        {label ? <p className="text-xs font-medium text-foreground">{label}</p> : null}
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View in Drive <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

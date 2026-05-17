"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function BeneficiaryAvatar({
  name,
  driveFileId,
  className,
}: {
  name: string;
  driveFileId?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (driveFileId && !failed) {
    return (
      <Image
        src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w200`}
        alt={`${name} profile`}
        width={40}
        height={40}
        className={cn("h-10 w-10 rounded-full object-cover ring-1 ring-border", className)}
        onError={() => setFailed(true)}
        unoptimized
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary ring-1 ring-border",
        className,
      )}
    >
      {initials || "B"}
    </div>
  );
}

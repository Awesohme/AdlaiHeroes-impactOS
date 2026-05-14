"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2 } from "lucide-react";
import { uploadEnrolmentImageFieldAction } from "@/app/(protected)/beneficiaries/actions";
import { cn } from "@/lib/utils";

export function ImageInput({
  enrolmentId,
  fieldKey,
  value,
  onSaved,
}: {
  enrolmentId: string;
  fieldKey: string;
  value: string | null;
  onSaved: (driveFileId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const existingId = value?.startsWith("drive:") ? value.slice(6) : null;

  function save() {
    if (!file) {
      setFeedback("Pick an image first.");
      return;
    }
    setFeedback(null);
    const fd = new FormData();
    fd.set("field_image", file);
    startTransition(async () => {
      const result = await uploadEnrolmentImageFieldAction(enrolmentId, fieldKey, fd);
      if (result.ok) {
        setFile(null);
        setFeedback("Image saved.");
        if (result.data) onSaved(result.data.driveFileId);
      } else {
        setFeedback(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {existingId ? (
        <div className="flex items-center gap-3">
          <img
            src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(existingId)}&sz=w200`}
            alt="Current"
            className="h-16 w-16 rounded-md object-cover ring-1 ring-border"
          />
          <a
            href={`https://drive.google.com/file/d/${existingId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View in Drive <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <Button type="button" size="sm" onClick={save} disabled={pending || !file}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : existingId ? (
          "Replace image"
        ) : (
          "Upload image"
        )}
      </Button>
      {feedback ? (
        <p
          className={cn(
            "text-xs",
            feedback.endsWith("saved.") ? "text-emerald-700" : "text-destructive",
          )}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

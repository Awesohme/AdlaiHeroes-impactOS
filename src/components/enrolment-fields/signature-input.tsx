"use client";

import { useRef, useState, useTransition } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { uploadEnrolmentSignatureAction } from "@/app/(protected)/beneficiaries/actions";
import { cn } from "@/lib/utils";

export function SignatureInput({
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
  const ref = useRef<SignatureCanvas | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const existingId = value?.startsWith("drive:") ? value.slice(6) : null;

  function clear() {
    ref.current?.clear();
    setFeedback(null);
  }

  function save() {
    const canvas = ref.current;
    if (!canvas || canvas.isEmpty()) {
      setFeedback("Sign on the canvas first.");
      return;
    }
    const dataUrl = canvas.getCanvas().toDataURL("image/png");
    setFeedback(null);
    startTransition(async () => {
      const result = await uploadEnrolmentSignatureAction(enrolmentId, fieldKey, dataUrl);
      if (result.ok) {
        setFeedback("Signature saved.");
        if (result.data) onSaved(result.data.driveFileId);
        canvas.clear();
      } else {
        setFeedback(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {existingId ? (
        <a
          href={`https://drive.google.com/file/d/${existingId}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View current signature <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
      <div className="rounded-md border bg-background">
        <SignatureCanvas
          ref={(instance) => {
            ref.current = instance;
          }}
          penColor="#1a162e"
          canvasProps={{
            width: 480,
            height: 160,
            className: "w-full h-40 rounded-md",
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={pending}>
          Clear
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : existingId ? (
            "Replace signature"
          ) : (
            "Save signature"
          )}
        </Button>
      </div>
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

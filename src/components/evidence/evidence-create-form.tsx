"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createEvidenceAction, type CreateEvidenceState } from "@/app/(protected)/evidence/new/actions";
import type { ProgrammeRow } from "@/lib/programmes";

const initialState: CreateEvidenceState = {};

export function EvidenceCreateForm({
  programmes,
}: {
  programmes: ProgrammeRow[];
}) {
  const [state, formAction] = useActionState(createEvidenceAction, initialState);
  const options = programmes.length ? programmes : [];

  return (
    <form action={formAction} className="programme-form">
      <label>
        <span>Evidence title</span>
        <input defaultValue={state.fields?.title ?? ""} name="title" placeholder="School nomination letters" type="text" />
      </label>
      <label>
        <span>Evidence code</span>
        <input defaultValue={state.fields?.evidence_code ?? ""} name="evidence_code" placeholder="EVD-2026-0004" type="text" />
        <small className="field-hint">Leave blank to auto-generate the next evidence code.</small>
      </label>
      <label>
        <span>Evidence type</span>
        <select defaultValue={state.fields?.evidence_type ?? "Document"} name="evidence_type">
          <option>Document</option>
          <option>Photo</option>
          <option>Video</option>
          <option>Attendance</option>
        </select>
      </label>
      <label>
        <span>Linked programme</span>
        <select defaultValue={state.fields?.programme_code ?? options[0]?.programme_code ?? ""} name="programme_code">
          {options.map((programme) => (
            <option key={programme.programme_code} value={programme.programme_code}>
              {programme.name}
            </option>
          ))}
        </select>
        <small className="field-hint">This anchors the Drive folder routing and downstream reporting links.</small>
      </label>
      <label>
        <span>Verification status</span>
        <select defaultValue={state.fields?.verification_status ?? "in_review"} name="verification_status">
          <option value="in_review">In review</option>
          <option value="verified">Verified</option>
          <option value="consent_check">Consent check</option>
        </select>
      </label>
      <label>
        <span>Google Drive file ID</span>
        <input defaultValue={state.fields?.drive_file_id ?? ""} name="drive_file_id" placeholder="1AbCdEFghIJkLmnOPqRstUv" type="text" />
        <small className="field-hint">Use the Drive file ID from the uploaded document, photo batch, or evidence asset.</small>
      </label>
      <label>
        <span>Drive folder ID</span>
        <input defaultValue={state.fields?.drive_folder_id ?? ""} name="drive_folder_id" placeholder="Optional parent folder ID" type="text" />
      </label>
      <label>
        <span>MIME type</span>
        <input defaultValue={state.fields?.mime_type ?? ""} name="mime_type" placeholder="application/pdf or image/jpeg" type="text" />
      </label>
      {state.error ? (
        <div className="data-banner programme-form__full">
          <strong>Upload blocked.</strong>
          <span>{state.error}</span>
        </div>
      ) : null}
      <div className="programme-form__actions programme-form__full">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--primary" disabled={pending} type="submit">
      {pending ? "Saving..." : "Save evidence metadata"}
    </button>
  );
}

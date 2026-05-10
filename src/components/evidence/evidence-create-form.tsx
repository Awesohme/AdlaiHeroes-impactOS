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
        <span>Evidence file</span>
        <input accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.mp4,.mov,.zip" name="evidence_file" type="file" />
        <small className="field-hint">ImpactOps uploads this directly into the correct Google Drive programme folder for you.</small>
      </label>
      <label>
        <span>Upload routing rule</span>
        <textarea defaultValue="Programme folder -> evidence-type subfolder -> uploaded file" readOnly rows={3} />
        <small className="field-hint">The selected programme becomes the folder anchor, and ImpactOps creates evidence-type subfolders only when needed.</small>
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
      {pending ? "Uploading..." : "Upload evidence"}
    </button>
  );
}

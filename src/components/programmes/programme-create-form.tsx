"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProgrammeAction, type CreateProgrammeState } from "@/app/(protected)/programmes/new/actions";

const initialState: CreateProgrammeState = {};

export function ProgrammeCreateForm() {
  const [state, formAction] = useActionState(createProgrammeAction, initialState);

  return (
    <form action={formAction} className="programme-form">
      <label>
        <span>Programme name</span>
        <input defaultValue={state.fields?.name ?? ""} name="name" placeholder="Education Sponsorship 2027" type="text" />
      </label>
      <label>
        <span>Programme code</span>
        <input defaultValue={state.fields?.programme_code ?? ""} name="programme_code" placeholder="PRG-2027-0001" type="text" />
      </label>
      <label>
        <span>Programme type</span>
        <select defaultValue={state.fields?.programme_type ?? "Education Support"} name="programme_type">
          <option>Education Support</option>
          <option>Health &amp; WASH</option>
          <option>Food Support</option>
          <option>Livelihood Support</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select defaultValue={state.fields?.status ?? "draft"} name="status">
          <option value="draft">Draft</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="monitoring">Monitoring</option>
        </select>
      </label>
      <label>
        <span>Donor</span>
        <input defaultValue={state.fields?.donor ?? ""} name="donor" placeholder="ACE Charitable Foundation" type="text" />
      </label>
      <label>
        <span>Location</span>
        <input defaultValue={state.fields?.location ?? ""} name="location" placeholder="Lagos, Nigeria" type="text" />
      </label>
      <label>
        <span>Start date</span>
        <input defaultValue={state.fields?.starts_on ?? ""} name="starts_on" type="date" />
      </label>
      <label>
        <span>End date</span>
        <input defaultValue={state.fields?.ends_on ?? ""} name="ends_on" type="date" />
      </label>
      {state.error ? (
        <div className="data-banner programme-form__full">
          <strong>Create blocked.</strong>
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
      {pending ? "Creating..." : "Create programme"}
    </button>
  );
}

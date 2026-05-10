"use client";

import { useActionState, useState, type Dispatch, type SetStateAction } from "react";
import { useFormStatus } from "react-dom";
import {
  defaultProgrammeFieldKeys,
  getProgrammeStatusLabel,
  moduleOptions,
  nigeriaLocationOptions,
  programmeFieldCatalog,
  programmeStatusOptions,
  programmeTypeOptions,
  type ProgrammeModuleKey,
} from "@/lib/programme-config";
import type { ProgrammeDataFieldRow, ProgrammeRow } from "@/lib/programmes";
import { saveProgrammeAction, type SaveProgrammeState } from "@/app/(protected)/programmes/new/actions";

const initialState: SaveProgrammeState = {};

type ProgrammeCreateFormProps = {
  mode?: "create" | "edit";
  initialProgramme?: ProgrammeRow | null;
};

export function ProgrammeCreateForm({
  mode = "create",
  initialProgramme,
}: ProgrammeCreateFormProps) {
  const [state, formAction] = useActionState(saveProgrammeAction, initialState);

  const initialLocations = parseJsonArray(state.fields?.location_areas_json) || initialProgramme?.location_areas || ["Abuja, FCT"];
  const initialModules =
    (parseJsonArray(state.fields?.enabled_modules_json) as ProgrammeModuleKey[]) ||
    initialProgramme?.enabled_modules ||
    ["beneficiaries", "activities", "evidence", "reporting", "education_support"];
  const initialFields = parseDataFields(state.fields?.data_fields_json) || initialProgramme?.data_fields || buildDefaultFieldSet();

  const [selectedLocations, setSelectedLocations] = useState<string[]>(initialLocations);
  const [enabledModules, setEnabledModules] = useState<ProgrammeModuleKey[]>(initialModules);
  const [selectedFields, setSelectedFields] = useState<ProgrammeDataFieldRow[]>(initialFields);
  const [name, setName] = useState(state.fields?.name ?? initialProgramme?.name ?? "");
  const [programmeType, setProgrammeType] = useState(state.fields?.programme_type ?? initialProgramme?.programme_type ?? "Education Support");
  const [status, setStatus] = useState(state.fields?.status ?? initialProgramme?.status ?? "draft");
  const [donorFunder, setDonorFunder] = useState(state.fields?.donor_funder ?? initialProgramme?.donor_funder ?? "Adlai Heroes Foundation");
  const [targetGroup, setTargetGroup] = useState(state.fields?.target_group ?? initialProgramme?.target_group ?? "");
  const [expectedBeneficiaries, setExpectedBeneficiaries] = useState(
    state.fields?.expected_beneficiaries ?? formatNullableNumber(initialProgramme?.expected_beneficiaries),
  );
  const [budgetNgn, setBudgetNgn] = useState(state.fields?.budget_ngn ?? formatCurrencyInput(initialProgramme?.budget_ngn));
  const [objectives, setObjectives] = useState(state.fields?.objectives ?? initialProgramme?.objectives ?? "");
  const [description, setDescription] = useState(state.fields?.programme_description ?? initialProgramme?.programme_description ?? "");
  const [startDate, setStartDate] = useState(state.fields?.start_date ?? initialProgramme?.start_date ?? "");
  const [endDate, setEndDate] = useState(state.fields?.end_date ?? initialProgramme?.end_date ?? "");

  const availableFields = programmeFieldCatalog.filter(
    (field) => !selectedFields.some((selectedField) => selectedField.field_key === field.field_key),
  );
  const summaryStatus = mode === "create" && status === "draft" ? "draft" : status;

  return (
    <form action={formAction} className="programme-builder">
      <input name="programme_id" type="hidden" value={initialProgramme?.id ?? ""} />
      <input name="location_areas_json" type="hidden" value={JSON.stringify(selectedLocations)} />
      <input name="enabled_modules_json" type="hidden" value={JSON.stringify(enabledModules)} />
      <input name="data_fields_json" type="hidden" value={JSON.stringify(selectedFields)} />

      <section className="programme-builder__main">
        <article className="workspace-card form-section">
          <div className="form-section__header">
            <span className="form-step">1</span>
            <div>
              <h2>Programme details</h2>
              <p>Capture the delivery frame, funding context, locations, and beneficiary expectations before anything else is linked.</p>
            </div>
          </div>

          <div className="form-grid form-grid--programme">
            <label>
              <span>Programme name</span>
              <input
                defaultValue={name}
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Girls' Education & Dignity Initiative"
                type="text"
              />
            </label>

            <label>
              <span>Programme type</span>
              <select defaultValue={programmeType} name="programme_type" onChange={(event) => setProgrammeType(event.target.value)}>
                {programmeTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Donor / Funder</span>
              <input
                defaultValue={donorFunder}
                name="donor_funder"
                onChange={(event) => setDonorFunder(event.target.value)}
                placeholder="Adlai Heroes Foundation"
                type="text"
              />
            </label>

            <label>
              <span>Programme code</span>
              <input
                defaultValue={state.fields?.programme_code ?? initialProgramme?.programme_code ?? ""}
                name="programme_code"
                placeholder="PRG-2026-0001"
                type="text"
              />
              <small className="field-hint">Leave blank to auto-generate the next programme code.</small>
            </label>

            <label>
              <span>Start date</span>
              <input defaultValue={startDate} name="start_date" onChange={(event) => setStartDate(event.target.value)} type="date" />
            </label>

            <label>
              <span>End date</span>
              <input defaultValue={endDate} name="end_date" onChange={(event) => setEndDate(event.target.value)} type="date" />
            </label>

            <label>
              <span>Target group</span>
              <input
                defaultValue={targetGroup}
                name="target_group"
                onChange={(event) => setTargetGroup(event.target.value)}
                placeholder="Adolescent Girls (10-19 years)"
                type="text"
              />
            </label>

            <label>
              <span>Expected beneficiaries</span>
              <input
                defaultValue={expectedBeneficiaries}
                inputMode="numeric"
                name="expected_beneficiaries"
                onChange={(event) => setExpectedBeneficiaries(event.target.value)}
                placeholder="1200"
                type="text"
              />
            </label>

            <label>
              <span>Budget (NGN)</span>
              <input
                defaultValue={budgetNgn}
                inputMode="decimal"
                name="budget_ngn"
                onChange={(event) => setBudgetNgn(event.target.value)}
                placeholder="25000000"
                type="text"
              />
            </label>

            <label className="form-grid__full">
              <span>Operating locations</span>
              <div className="selection-panel">
                <div className="selection-tags">
                  {selectedLocations.length ? (
                    selectedLocations.map((location) => (
                      <button
                        className="selection-tag"
                        key={location}
                        onClick={() => removeLocation(location, setSelectedLocations)}
                        type="button"
                      >
                        {location}
                        <span>×</span>
                      </button>
                    ))
                  ) : (
                    <span className="selection-empty">Pick one or more locations from the list below.</span>
                  )}
                </div>
                <div className="selection-grid">
                  {nigeriaLocationOptions.map((location) => {
                    const active = selectedLocations.includes(location);

                    return (
                      <button
                        className={`selection-option${active ? " selection-option--active" : ""}`}
                        key={location}
                        onClick={() => toggleLocation(location, setSelectedLocations)}
                        type="button"
                      >
                        {location}
                      </button>
                    );
                  })}
                </div>
              </div>
            </label>

            <label className="form-grid__full">
              <span>Objectives</span>
              <textarea
                defaultValue={objectives}
                maxLength={500}
                name="objectives"
                onChange={(event) => setObjectives(event.target.value)}
                placeholder="Summarise the operational and beneficiary outcome the programme is meant to achieve."
                rows={4}
              />
            </label>

            <label className="form-grid__full">
              <span>Programme description</span>
              <textarea
                defaultValue={description}
                maxLength={1000}
                name="programme_description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe how this programme will be delivered, what modules it will rely on, and what field teams should expect to capture."
                rows={5}
              />
            </label>

            <label>
              <span>Programme status</span>
              <select defaultValue={summaryStatus} name="status" onChange={(event) => setStatus(event.target.value)}>
                {programmeStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className="workspace-card form-section">
          <div className="form-section__header">
            <span className="form-step">2</span>
            <div>
              <h2>Advanced setup</h2>
              <p>Keep the core setup light by default. Open this only when the programme truly needs tailored data fields or module access.</p>
            </div>
          </div>

          <details className="advanced-panel">
            <summary>Open advanced programme setup</summary>
            <div className="advanced-panel__body">
              <div className="field-config">
                <div className="field-catalog">
                  <div className="field-catalog__header">
                    <strong>Available fields</strong>
                    <span>Pick the data the team should collect for this programme.</span>
                  </div>
                  <div className="field-catalog__list">
                    {availableFields.map((field) => (
                      <article className="field-card" key={field.field_key}>
                        <div>
                          <strong>{field.label}</strong>
                          <p>{field.description}</p>
                        </div>
                        <div className="field-card__meta">
                          <span className="field-chip">{field.field_type.replace("_", "/")}</span>
                          <button className="mini-button" onClick={() => addField(field.field_key, setSelectedFields)} type="button">
                            Add
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="field-selected">
                  <div className="field-catalog__header">
                    <strong>Included fields</strong>
                    <span>Reorder the list and mark the ones that must always be captured.</span>
                  </div>
                  <div className="field-selected__list">
                    {selectedFields.map((field, index) => (
                      <article className="field-selected__row" key={field.field_key}>
                        <div className="field-selected__identity">
                          <div className="field-drag">
                            <button className="icon-button" disabled={index === 0} onClick={() => moveField(index, -1, setSelectedFields)} type="button">
                              ↑
                            </button>
                            <button
                              className="icon-button"
                              disabled={index === selectedFields.length - 1}
                              onClick={() => moveField(index, 1, setSelectedFields)}
                              type="button"
                            >
                              ↓
                            </button>
                          </div>
                          <div>
                            <strong>{field.label}</strong>
                            <p>{field.field_type.replace("_", "/")}</p>
                          </div>
                        </div>
                        <div className="field-selected__controls">
                          <label className="toggle-chip">
                            <input
                              checked={field.required}
                              onChange={() => toggleFieldRequired(field.field_key, setSelectedFields)}
                              type="checkbox"
                            />
                            <span>Required</span>
                          </label>
                          <button className="mini-button mini-button--ghost" onClick={() => removeField(field.field_key, setSelectedFields)} type="button">
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <article className="workspace-card modules-card modules-card--nested">
                <div className="modules-card__header">
                  <strong>Modules enabled</strong>
                  <p>Only turn on the operational modules this programme genuinely needs from day one.</p>
                </div>
                <div className="module-list">
                  {moduleOptions.map((module) => {
                    const active = enabledModules.includes(module.key);

                    return (
                      <label className={`module-toggle${active ? " module-toggle--active" : ""}`} key={module.key}>
                        <div>
                          <strong>{module.label}</strong>
                          <p>{module.description}</p>
                        </div>
                        <input
                          checked={active}
                          onChange={() => toggleModule(module.key, setEnabledModules)}
                          type="checkbox"
                        />
                      </label>
                    );
                  })}
                </div>
              </article>
            </div>
          </details>
        </article>

        <article className="workspace-card form-section form-section--compact">
          <div className="form-section__header">
            <span className="form-step">3</span>
            <div>
              <h2>Programme summary</h2>
              <p>A quick check before you save or publish.</p>
            </div>
          </div>
          <div className="compact-summary-grid">
            <div>
              <span>Name</span>
              <strong>{name || "Untitled programme"}</strong>
            </div>
            <div>
              <span>Type</span>
              <strong>{programmeType || "Pending"}</strong>
            </div>
            <div>
              <span>Locations</span>
              <strong>{selectedLocations.length ? selectedLocations.join(", ") : "Pending"}</strong>
            </div>
            <div>
              <span>Modules</span>
              <strong>{enabledModules.length}</strong>
            </div>
            <div>
              <span>Beneficiaries</span>
              <strong>{expectedBeneficiaries || "—"}</strong>
            </div>
            <div>
              <span>Budget</span>
              <strong>{budgetNgn ? `NGN ${formatBudget(budgetNgn)}` : "—"}</strong>
            </div>
          </div>
        </article>
        
        {state.error ? (
          <div className="data-banner programme-form__full">
            <strong>Save blocked.</strong>
            <span>{state.error}</span>
          </div>
        ) : null}

        <div className="programme-builder__actions">
          <SubmitButton intent="draft" label={mode === "edit" ? "Save changes" : "Save draft"} />
          <SubmitButton intent="publish" label={mode === "edit" ? "Update programme" : "Publish programme"} primary />
        </div>
      </section>

      <aside className="programme-builder__side">
        <article className="workspace-card preview-card preview-card--compact">
          <div className="preview-card__header">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>{name || "Untitled programme"}</h2>
            </div>
            <span className={`status-pill status-pill--${mapStatusTone(summaryStatus)}`}>{getProgrammeStatusLabel(summaryStatus)}</span>
          </div>
          <div className="preview-card__meta">
            <p>{programmeType || "Programme type pending"}</p>
            <p>{selectedLocations.join(", ") || "No locations selected yet"}</p>
            <p>{timelineLabel(startDate, endDate)}</p>
          </div>
          <dl className="preview-card__stats">
            <div>
              <dt>Expected beneficiaries</dt>
              <dd>{expectedBeneficiaries || "—"}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{budgetNgn ? `NGN ${formatBudget(budgetNgn)}` : "—"}</dd>
            </div>
            <div>
              <dt>Donor / Funder</dt>
              <dd>{donorFunder || "—"}</dd>
            </div>
          </dl>
        </article>
      </aside>
    </form>
  );
}

function SubmitButton({
  intent,
  label,
  primary = false,
}: {
  intent: "draft" | "publish";
  label: string;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`button ${primary ? "button--primary" : "button--ghost"}`}
      disabled={pending}
      name="intent"
      type="submit"
      value={intent}
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function buildDefaultFieldSet(): ProgrammeDataFieldRow[] {
  return defaultProgrammeFieldKeys.map((fieldKey, index) => {
    const definition = programmeFieldCatalog.find((field) => field.field_key === fieldKey);

    return {
      field_key: fieldKey,
      label: definition?.label ?? fieldKey,
      field_type: definition?.field_type ?? "text",
      required: index < 4,
      position: index,
      enabled: true,
    };
  });
}

function parseJsonArray(raw?: string) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : null;
  } catch {
    return null;
  }
}

function parseDataFields(raw?: string) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProgrammeDataFieldRow[]) : null;
  } catch {
    return null;
  }
}

function toggleLocation(
  location: string,
  setSelectedLocations: Dispatch<SetStateAction<string[]>>,
) {
  setSelectedLocations((current) =>
    current.includes(location) ? current.filter((item) => item !== location) : [...current, location],
  );
}

function removeLocation(
  location: string,
  setSelectedLocations: Dispatch<SetStateAction<string[]>>,
) {
  setSelectedLocations((current) => current.filter((item) => item !== location));
}

function addField(
  fieldKey: string,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  const definition = programmeFieldCatalog.find((field) => field.field_key === fieldKey);

  if (!definition) {
    return;
  }

  setSelectedFields((current) => [
    ...current,
    {
      field_key: definition.field_key,
      label: definition.label,
      field_type: definition.field_type,
      required: false,
      position: current.length,
      enabled: true,
    },
  ]);
}

function removeField(
  fieldKey: string,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  setSelectedFields((current) =>
    current.filter((field) => field.field_key !== fieldKey).map((field, index) => ({ ...field, position: index })),
  );
}

function moveField(
  index: number,
  direction: -1 | 1,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  setSelectedFields((current) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= current.length) {
      return current;
    }

    const cloned = [...current];
    const [item] = cloned.splice(index, 1);
    cloned.splice(nextIndex, 0, item);

    return cloned.map((field, position) => ({ ...field, position }));
  });
}

function toggleFieldRequired(
  fieldKey: string,
  setSelectedFields: Dispatch<SetStateAction<ProgrammeDataFieldRow[]>>,
) {
  setSelectedFields((current) =>
    current.map((field) => (field.field_key === fieldKey ? { ...field, required: !field.required } : field)),
  );
}

function toggleModule(
  moduleKey: ProgrammeModuleKey,
  setEnabledModules: Dispatch<SetStateAction<ProgrammeModuleKey[]>>,
) {
  setEnabledModules((current) =>
    current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey],
  );
}

function formatNullableNumber(value?: number | null) {
  return value ? String(value) : "";
}

function formatCurrencyInput(value?: number | null) {
  return value ? value.toLocaleString("en-NG") : "";
}

function formatBudget(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-NG") : value;
}

function timelineLabel(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return "Date range not set yet";
  }

  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }

  return startDate ? `Starts ${startDate}` : `Ends ${endDate}`;
}

function mapStatusTone(status: string) {
  if (status === "active" || status === "completed") {
    return "active";
  }

  if (status === "monitoring" || status === "at_risk") {
    return "monitoring";
  }

  return "planned";
}

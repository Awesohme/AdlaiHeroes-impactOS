"use client";

import { useState } from "react";
import type { BeneficiaryRow } from "@/lib/beneficiaries";
import type { ProgrammeRow } from "@/lib/programmes";

export function BeneficiariesOverview({
  rows,
  programmes,
  source,
  error,
}: {
  rows: BeneficiaryRow[];
  programmes: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [safeguardingFilter, setSafeguardingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCode, setSelectedCode] = useState(rows[0]?.beneficiary_code ?? "");

  const filteredRows = rows.filter((row) => {
    const queryMatch =
      !query ||
      row.full_name.toLowerCase().includes(query.toLowerCase()) ||
      row.beneficiary_code.toLowerCase().includes(query.toLowerCase()) ||
      row.guardian_phone.toLowerCase().includes(query.toLowerCase());
    const programmeMatch = programmeFilter === "all" || row.programme_name === programmeFilter;
    const safeguardingMatch = safeguardingFilter === "all" || row.risk_flag === safeguardingFilter;
    const statusMatch = statusFilter === "all" || row.current_status === statusFilter;

    return queryMatch && programmeMatch && safeguardingMatch && statusMatch;
  });

  const selected = filteredRows.find((row) => row.beneficiary_code === selectedCode) ?? filteredRows[0] ?? rows[0];
  const programmeNames = [...new Set(programmes.map((programme) => programme.name))];
  const metrics = {
    total: rows.length,
    consentCaptured: rows.filter((row) => row.consent_status.includes("captured")).length,
    flagged: rows.filter((row) => row.risk_flag === "review").length,
    active: rows.filter((row) => row.current_status === "active").length,
  };

  return (
    <>
      {source === "mock" ? (
        <div className="data-banner">
          <strong>Beneficiary fallback data active.</strong>
          <span>{error ?? "Live beneficiary records are still sparse, so the registry is using the shaped fallback set."}</span>
        </div>
      ) : (
        <div className="data-banner data-banner--live">
          <strong>Live beneficiary registry.</strong>
          <span>The selected detail panel and filters are reading secure beneficiary records with real programme context.</span>
        </div>
      )}

      <section className="dashboard-metrics">
        <article className="dashboard-metric-card">
          <span>Total Beneficiaries</span>
          <strong>{metrics.total}</strong>
          <p>People with structured beneficiary records linked to programme operations.</p>
        </article>
        <article className="dashboard-metric-card">
          <span>Consent Captured</span>
          <strong>{metrics.consentCaptured}</strong>
          <p>Records currently ready for evidence and operational use.</p>
        </article>
        <article className="dashboard-metric-card">
          <span>Safeguarding Watch</span>
          <strong>{metrics.flagged}</strong>
          <p>Profiles needing a closer human review before wider operational use.</p>
        </article>
        <article className="dashboard-metric-card">
          <span>Active In Programme</span>
          <strong>{metrics.active}</strong>
          <p>Beneficiaries currently active across the linked programme stack.</p>
        </article>
      </section>

      <section className="registry-layout">
        <article className="workspace-card registry-panel">
          <div className="registry-toolbar">
            <input
              className="search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, ID or phone..."
              type="search"
              value={query}
            />
            <div className="registry-toolbar__actions">
              <button className="button button--ghost button--compact" type="button">
                Import Beneficiaries
              </button>
              <button className="button button--primary button--compact" type="button">
                Add Beneficiary
              </button>
            </div>
          </div>

          <div className="portfolio-filters">
            <FilterSelect label="Programme" onChange={setProgrammeFilter} options={["all", ...programmeNames]} value={programmeFilter} />
            <FilterSelect label="Safeguarding" onChange={setSafeguardingFilter} options={["all", "clear", "review"]} value={safeguardingFilter} />
            <FilterSelect label="Status" onChange={setStatusFilter} options={["all", "active", "pending", "follow_up", "exited"]} value={statusFilter} />
          </div>

          <div className="registry-table">
            <div className="registry-table__head">
              <span>Beneficiary ID</span>
              <span>Name</span>
              <span>Programme</span>
              <span>Community</span>
              <span>Last Activity</span>
              <span>Consent</span>
              <span>Risk Flag</span>
              <span>Current Status</span>
            </div>
            {filteredRows.map((row) => (
              <button
                className={`registry-row${selected?.beneficiary_code === row.beneficiary_code ? " registry-row--active" : ""}`}
                key={row.beneficiary_code}
                onClick={() => setSelectedCode(row.beneficiary_code)}
                type="button"
              >
                <span>{row.beneficiary_code}</span>
                <strong>{row.full_name}</strong>
                <span>{row.programme_name}</span>
                <span>{row.community}</span>
                <span>{row.last_activity}</span>
                <span className={`status-pill status-pill--${row.consent_status.includes("captured") ? "active" : "planned"}`}>
                  {formatStatus(row.consent_status)}
                </span>
                <span className={`status-pill status-pill--${row.risk_flag === "review" ? "monitoring" : "active"}`}>
                  {row.risk_flag === "review" ? "Review" : "Clear"}
                </span>
                <span className={`status-pill status-pill--${row.current_status === "active" ? "active" : row.current_status === "follow_up" ? "monitoring" : "planned"}`}>
                  {formatStatus(row.current_status)}
                </span>
              </button>
            ))}
          </div>
        </article>

        {selected ? (
          <aside className="workspace-card registry-detail">
            <div className="registry-detail__hero">
              <div className="avatar-shell">{selected.full_name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h2>{selected.full_name}</h2>
                <p>{selected.beneficiary_code}</p>
                <span>{selected.programme_name}</span>
              </div>
            </div>

            <div className="registry-badges">
              <span className="status-pill status-pill--active">{formatStatus(selected.consent_status)}</span>
              <span className={`status-pill status-pill--${selected.risk_flag === "review" ? "monitoring" : "active"}`}>
                {selected.risk_flag === "review" ? "Safeguarding Review" : "Risk Clear"}
              </span>
              <span className="status-pill status-pill--planned">{formatStatus(selected.current_status)}</span>
            </div>

            <div className="detail-section">
              <h3>Personal & Contact Information</h3>
              <dl>
                <div>
                  <dt>Guardian / Caregiver</dt>
                  <dd>{selected.guardian_name}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selected.guardian_phone}</dd>
                </div>
                <div>
                  <dt>Community</dt>
                  <dd>{selected.community}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{selected.state}</dd>
                </div>
                <div>
                  <dt>School</dt>
                  <dd>{selected.school_name}</dd>
                </div>
              </dl>
            </div>

            <div className="detail-section">
              <h3>Programme Participation</h3>
              <div className="detail-card">
                <strong>{selected.programme_name}</strong>
                <p>{selected.programme_code ?? "Programme code not linked yet"}</p>
                <div className="detail-chip-list">
                  {selected.programme_modules.length ? (
                    selected.programme_modules.map((module) => <span className="field-chip" key={module}>{formatStatus(module)}</span>)
                  ) : (
                    <span className="field-chip">Modules pending</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Participation Signals</h3>
              <div className="detail-list">
                {selected.highlights.map((highlight) => (
                  <div className="distribution-row" key={highlight}>
                    <span>{formatStatus(highlight)}</span>
                    <strong>Live</strong>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </section>
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? `All ${label}` : formatStatus(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

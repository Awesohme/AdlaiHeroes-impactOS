"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProgrammeRow } from "@/lib/programmes";

export function ProgrammesOverview({
  rows,
  source,
  error,
  notice,
}: {
  rows: ProgrammeRow[];
  source: "supabase" | "mock";
  error?: string;
  notice?: string;
}) {
  const [yearFilter, setYearFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [donorFilter, setDonorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRows = rows.filter((row) => {
    const yearMatch =
      yearFilter === "all" || row.start_date?.startsWith(yearFilter) || row.end_date?.startsWith(yearFilter);
    const locationMatch = locationFilter === "all" || row.location_areas.includes(locationFilter);
    const donorMatch = donorFilter === "all" || row.donor_funder === donorFilter;
    const typeMatch = typeFilter === "all" || row.programme_type === typeFilter;
    const statusMatch = statusFilter === "all" || row.status === statusFilter;

    return yearMatch && locationMatch && donorMatch && typeMatch && statusMatch;
  });

  const totals = getProgrammeMetrics(rows);
  const distribution = summarizeTypes(filteredRows);
  const budget = filteredRows.reduce((sum, row) => sum + (row.budget_ngn ?? 0), 0);
  const activeBudget = filteredRows
    .filter((row) => row.status === "active" || row.status === "monitoring")
    .reduce((sum, row) => sum + (row.budget_ngn ?? 0), 0);
  const years = uniqueValues(
    rows.flatMap((row) => [row.start_date?.slice(0, 4), row.end_date?.slice(0, 4)]).filter(Boolean) as string[],
  );
  const locations = uniqueValues(rows.flatMap((row) => row.location_areas));
  const donors = uniqueValues(rows.map((row) => row.donor_funder).filter(Boolean));
  const types = uniqueValues(rows.map((row) => row.programme_type));

  return (
    <>
      {notice ? (
        <div className="data-banner data-banner--live">
          <strong>{notice}</strong>
          <span>Programme setup, field configuration, and module toggles are now saved on the live workspace.</span>
        </div>
      ) : null}

      {source === "mock" ? (
        <div className="data-banner">
          <strong>Fallback data active.</strong>
          <span>{error ?? "Connect Supabase and add richer programme records to switch this workspace fully live."}</span>
        </div>
      ) : (
        <div className="data-banner data-banner--live">
          <strong>Live programme data.</strong>
          <span>The list, metrics, filters, and edit routes are reading directly from the signed-in Supabase session.</span>
        </div>
      )}

      <section className="dashboard-metrics">
        <article className="dashboard-metric-card">
          <span>Total Programmes</span>
          <strong>{rows.length}</strong>
          <p>Saved records across planning, delivery, and monitoring.</p>
        </article>
        <article className="dashboard-metric-card">
          <span>Active Programmes</span>
          <strong>{totals.active}</strong>
          <p>{rows.length ? `${Math.round((totals.active / rows.length) * 100)}% of total` : "No live records yet"}</p>
        </article>
        <article className="dashboard-metric-card">
          <span>Planning</span>
          <strong>{totals.planned}</strong>
          <p>{rows.length ? `${Math.round((totals.planned / rows.length) * 100)}% of total` : "No records yet"}</p>
        </article>
        <article className="dashboard-metric-card dashboard-metric-card--risk">
          <span>At Risk</span>
          <strong>{totals.atRisk}</strong>
          <p>{rows.length ? `${Math.round((totals.atRisk / rows.length) * 100)}% of total` : "No flagged records"}</p>
        </article>
      </section>

      <section className="portfolio-grid">
        <article className="workspace-card portfolio-panel">
          <div className="portfolio-filters">
            <FilterSelect label="Year" onChange={setYearFilter} options={["all", ...years]} value={yearFilter} />
            <FilterSelect label="State" onChange={setLocationFilter} options={["all", ...locations]} value={locationFilter} />
            <FilterSelect label="Donor" onChange={setDonorFilter} options={["all", ...donors]} value={donorFilter} />
            <FilterSelect label="Programme Type" onChange={setTypeFilter} options={["all", ...types]} value={typeFilter} />
            <FilterSelect label="Status" onChange={setStatusFilter} options={["all", "draft", "planned", "active", "monitoring", "completed", "at_risk"]} value={statusFilter} />
            <button
              className="button button--ghost button--compact"
              onClick={() => {
                setYearFilter("all");
                setLocationFilter("all");
                setDonorFilter("all");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="portfolio-table">
            <div className="portfolio-table__head">
              <span>Programme</span>
              <span>Type</span>
              <span>Location</span>
              <span>Dates</span>
              <span>Beneficiaries</span>
              <span>Budget (NGN)</span>
              <span>Progress</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filteredRows.map((row) => (
              <article className="portfolio-row" key={row.programme_code}>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.programme_code}</p>
                </div>
                <div>
                  <span className="type-chip">{row.programme_type}</span>
                </div>
                <div>
                  <p>{row.location_areas.join(", ") || "TBD"}</p>
                </div>
                <div>
                  <p>{row.timeline_label}</p>
                </div>
                <div>
                  <strong>{row.expected_beneficiaries?.toLocaleString() ?? "—"}</strong>
                </div>
                <div>
                  <strong>{row.budget_ngn ? row.budget_ngn.toLocaleString("en-NG") : "—"}</strong>
                </div>
                <div>
                  <div className="progress-stack">
                    <div className="progress-bar">
                      <span style={{ width: `${Math.max(row.progress, 8)}%` }} />
                    </div>
                    <strong>{row.progress}%</strong>
                  </div>
                </div>
                <div>
                  <span className={`status-pill status-pill--${statusTone(row.status)}`}>{formatStatus(row.status)}</span>
                </div>
                <div>
                  <Link className="row-link" href={`/programmes/${row.programme_code}/edit`} prefetch={false}>
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="table-footnote">
            <span>
              Showing {filteredRows.length} of {rows.length} programmes
            </span>
            <span>Drafts save setup state, while publish pushes new records into the planned pipeline.</span>
          </div>
        </article>

        <aside className="portfolio-side">
          <article className="workspace-card insight-card">
            <div className="insight-card__header">
              <h2>Programme Distribution by Type</h2>
            </div>
            <div className="distribution-list">
              {distribution.map((item) => (
                <div className="distribution-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>
                    {item.count} ({Math.round((item.count / Math.max(filteredRows.length, 1)) * 100)}%)
                  </strong>
                </div>
              ))}
            </div>
          </article>

          <article className="workspace-card insight-card">
            <div className="insight-card__header">
              <h2>Timeline Snapshot</h2>
            </div>
            <div className="distribution-list">
              <div className="distribution-row">
                <span>Starting This Month</span>
                <strong>{filteredRows.filter((row) => isUpcoming(row.start_date)).length} programmes</strong>
              </div>
              <div className="distribution-row">
                <span>Ending This Quarter</span>
                <strong>{filteredRows.filter((row) => isEndingSoon(row.end_date)).length} programmes</strong>
              </div>
              <div className="distribution-row">
                <span>Ending This Year</span>
                <strong>{filteredRows.filter((row) => row.end_date?.slice(0, 4) === String(new Date().getFullYear())).length} programmes</strong>
              </div>
              <div className="distribution-row">
                <span>Overdue / At Risk</span>
                <strong>{filteredRows.filter((row) => row.status === "at_risk").length} programmes</strong>
              </div>
            </div>
          </article>

          <article className="workspace-card insight-card">
            <div className="insight-card__header">
              <h2>Budget Overview (NGN)</h2>
            </div>
            <div className="budget-summary">
              <div>
                <span>Total Budget</span>
                <strong>{budget.toLocaleString("en-NG")}</strong>
              </div>
              <div>
                <span>Committed</span>
                <strong>{activeBudget.toLocaleString("en-NG")} ({budget ? Math.round((activeBudget / budget) * 100) : 0}%)</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{Math.max(budget - activeBudget, 0).toLocaleString("en-NG")} ({budget ? Math.round(((budget - activeBudget) / budget) * 100) : 0}%)</strong>
              </div>
              <div className="budget-progress">
                <span style={{ width: `${budget ? Math.max(Math.round((activeBudget / budget) * 100), 8) : 8}%` }} />
              </div>
            </div>
          </article>
        </aside>
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
            {option === "all" ? `All ${label === "Year" ? "Years" : label === "State" ? "States" : `${label}s`}` : formatStatus(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function getProgrammeMetrics(rows: ProgrammeRow[]) {
  return {
    active: rows.filter((row) => row.status === "active").length,
    planned: rows.filter((row) => row.status === "planned" || row.status === "draft").length,
    atRisk: rows.filter((row) => row.status === "at_risk").length,
  };
}

function summarizeTypes(rows: ProgrammeRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    counts.set(row.programme_type, (counts.get(row.programme_type) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function formatStatus(value: string) {
  if (value === "all") {
    return "All";
  }

  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (status === "active" || status === "completed") {
    return "active";
  }

  if (status === "monitoring" || status === "at_risk") {
    return "monitoring";
  }

  return "planned";
}

function isUpcoming(value: string | null) {
  if (!value) {
    return false;
  }

  const now = new Date();
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isEndingSoon(value: string | null) {
  if (!value) {
    return false;
  }

  const now = new Date();
  const date = new Date(value);
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const dateQuarter = Math.floor(date.getMonth() / 3);
  return date.getFullYear() === now.getFullYear() && currentQuarter === dateQuarter;
}

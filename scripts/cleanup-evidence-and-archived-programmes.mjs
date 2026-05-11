#!/usr/bin/env node
import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const confirmed = args.has("--confirm");

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const evidenceRows = await selectAll("evidence", "id,drive_file_id,drive_folder_id,title");
const evidenceNoteRows = await selectAll("evidence_notes", "id", { optional: true });
const archivedProgrammes = await selectAll(
  "programmes",
  "id,programme_code,name,drive_folder_id,archived_at",
  { filter: (query) => query.not("archived_at", "is", null) },
);
const archivedProgrammeIds = archivedProgrammes.map((row) => row.id);
const archivedEnrolments = archivedProgrammeIds.length
  ? await selectAll("enrolments", "id", {
      filter: (query) => query.in("programme_id", archivedProgrammeIds),
      optional: true,
    })
  : [];
const archivedActivities = archivedProgrammeIds.length
  ? await selectAll("activities", "id", {
      filter: (query) => query.in("programme_id", archivedProgrammeIds),
      optional: true,
    })
  : [];

const driveTargets = unique(
  [
    ...evidenceRows.map((row) => row.drive_file_id),
    ...archivedProgrammes.map((row) => row.drive_folder_id),
  ].filter(Boolean),
);

printPreview({
  evidence: evidenceRows.length,
  evidenceNotes: evidenceNoteRows.length,
  archivedProgrammes: archivedProgrammes.length,
  archivedEnrolments: archivedEnrolments.length,
  archivedActivities: archivedActivities.length,
  driveTargets: driveTargets.length,
});

if (!confirmed) {
  console.log("\nPreview only. Re-run with --confirm to delete these records and Drive targets.");
  process.exit(0);
}

console.log("\nDeleting Drive targets...");
const driveResults = await deleteDriveTargets(driveTargets);
for (const result of driveResults) {
  if (result.ok) {
    console.log(`  ok     ${result.id}`);
  } else {
    console.log(`  failed ${result.id}: ${result.error}`);
  }
}

console.log("\nDeleting Supabase records...");
const deleted = [];
deleted.push(await deleteAllRows("evidence_notes", { optional: true }));
deleted.push(await deleteAllRows("evidence"));

const enrolmentIds = archivedEnrolments.map((row) => row.id);
const activityIds = archivedActivities.map((row) => row.id);

if (archivedProgrammeIds.length) {
  if (activityIds.length) deleted.push(await deleteWhereIn("attendance", "activity_id", activityIds, { optional: true }));
  if (enrolmentIds.length) deleted.push(await deleteWhereIn("beneficiary_notes", "enrolment_id", enrolmentIds, { optional: true }));
  deleted.push(await deleteWhereIn("beneficiary_notes", "programme_id", archivedProgrammeIds, { optional: true }));
  if (enrolmentIds.length) deleted.push(await deleteWhereIn("enrolment_scorecards", "enrolment_id", enrolmentIds, { optional: true }));
  deleted.push(await deleteWhereIn("activities", "programme_id", archivedProgrammeIds, { optional: true }));
  deleted.push(await deleteWhereIn("programme_funds", "programme_id", archivedProgrammeIds, { optional: true }));
  deleted.push(await deleteWhereIn("programme_milestones", "programme_id", archivedProgrammeIds, { optional: true }));
  deleted.push(await deleteWhereIn("programme_stages", "programme_id", archivedProgrammeIds, { optional: true }));
  deleted.push(await deleteWhereIn("programme_data_fields", "programme_id", archivedProgrammeIds, { optional: true }));
  deleted.push(await deleteWhereIn("enrolments", "programme_id", archivedProgrammeIds, { optional: true }));
  deleted.push(await deleteWhereIn("programmes", "id", archivedProgrammeIds));
}

for (const line of deleted.filter(Boolean)) {
  console.log(`  ${line}`);
}

const failedDriveDeletes = driveResults.filter((result) => !result.ok);
if (failedDriveDeletes.length) {
  console.log(
    `\nCleanup finished, but ${failedDriveDeletes.length} Drive target(s) could not be deleted. Review the failures above manually.`,
  );
  process.exitCode = 1;
} else {
  console.log("\nCleanup finished.");
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function selectAll(table, columns, options = {}) {
  const pageSize = 500;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (options.filter) query = options.filter(query);
    const { data, error } = await query;
    if (error) {
      if (options.optional && isMissingRelation(error)) return [];
      fail(`Could not read ${table}: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function deleteAllRows(table, options = {}) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) {
    if (options.optional && isMissingRelation(error)) return `${table}: skipped (not found)`;
    fail(`Could not delete ${table}: ${error.message}`);
  }
  return `${table}: deleted ${count ?? "unknown"} row(s)`;
}

async function deleteWhereIn(table, column, ids, options = {}) {
  let total = 0;
  for (const chunk of chunkArray(ids, 200)) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in(column, chunk);
    if (error) {
      if (options.optional && isMissingRelation(error)) return `${table}: skipped (not found)`;
      fail(`Could not delete ${table}: ${error.message}`);
    }
    total += count ?? 0;
  }
  return `${table}: deleted ${total} row(s)`;
}

async function deleteDriveTargets(ids) {
  if (!ids.length) return [];
  const token = await getDriveAccessToken();
  const results = [];
  for (const id of ids) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (response.ok || response.status === 404) {
      results.push({ id, ok: true });
      continue;
    }
    let error = response.statusText;
    try {
      const payload = await response.json();
      error = payload.error?.message || error;
    } catch {
      // Keep status text.
    }
    results.push({ id, ok: false, error });
  }
  return results;
}

async function getDriveAccessToken() {
  const hasOauth =
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const body = hasOauth ? oauthRefreshBody() : serviceAccountBody();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      detail = payload.error_description || payload.error || detail;
    } catch {
      // Keep status text.
    }
    fail(`Could not get Google Drive access token: ${detail}`);
  }
  const payload = await response.json();
  return payload.access_token;
}

function oauthRefreshBody() {
  return new URLSearchParams({
    client_id: requiredEnv("GOOGLE_DRIVE_CLIENT_ID"),
    client_secret: requiredEnv("GOOGLE_DRIVE_CLIENT_SECRET"),
    refresh_token: requiredEnv("GOOGLE_DRIVE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
}

function serviceAccountBody() {
  const credentials = serviceAccountCredentials();
  if (!credentials.email || !credentials.privateKey) {
    fail("Missing Google Drive OAuth refresh-token env vars or service-account env vars.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJwtPart({ alg: "RS256", typ: "JWT" });
  const claim = encodeJwtPart({
    iss: credentials.email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  });
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(credentials.privateKey.replace(/\\n/g, "\n"));
  return new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${unsigned}.${signature.toString("base64url")}`,
  });
}

function serviceAccountCredentials() {
  const candidate =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    "";
  if (candidate.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(candidate);
      return {
        email: parsed.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
        privateKey: parsed.private_key || "",
      };
    } catch {
      return {
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
        privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
      };
    }
  }
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "",
  };
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) fail(`Missing required environment variable: ${key}`);
  return value;
}

function printPreview(counts) {
  console.log("ImpactOps cleanup preview");
  console.log(`  evidence rows:                 ${counts.evidence}`);
  console.log(`  evidence note rows:            ${counts.evidenceNotes}`);
  console.log(`  archived programme rows:       ${counts.archivedProgrammes}`);
  console.log(`  archived enrolment rows:       ${counts.archivedEnrolments}`);
  console.log(`  archived activity rows:        ${counts.archivedActivities}`);
  console.log(`  Google Drive targets to delete:${counts.driveTargets.toString().padStart(8, " ")}`);
}

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function unique(items) {
  return [...new Set(items)];
}

function isMissingRelation(error) {
  return error.code === "42P01" || error.code === "42703" || error.message.includes("does not exist");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

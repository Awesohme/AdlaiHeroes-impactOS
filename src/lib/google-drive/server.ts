import { createSign } from "node:crypto";

const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
];
const DRIVE_SCOPE = GOOGLE_DRIVE_SCOPES.join(" ");
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";
const GOOGLE_DOCS_API = "https://docs.googleapis.com/v1/documents";

type AccessTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type DriveFileSummary = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
};

export type ProgrammeFolderRecord = {
  id: string;
  programme_code: string;
  name: string;
  drive_folder_id: string | null;
};

type UploadEvidenceInput = {
  file: File;
  evidenceType: string;
  programme: ProgrammeFolderRecord;
};

type UploadEvidenceResult = {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  driveFolderId: string;
  programmeFolderId: string;
  webViewLink: string | null;
};

type DriveAuthMode = "oauth-refresh-token" | "service-account";

type DriveEnvStatus = {
  mode: DriveAuthMode | null;
  rootFolderId: string;
  oauthClientId: string;
  hasOauthClientSecret: boolean;
  hasOauthRefreshToken: boolean;
  serviceAccountEmail: string;
  hasServiceAccountPrivateKey: boolean;
};

type DriveDebugSnapshot = {
  mode: DriveAuthMode | null;
  rootFolderId: string;
  tokenEmail: string;
  driveUserEmail: string;
  driveUserDisplayName: string;
  scopes: string[];
  rootLookupOk: boolean;
  rootLookupMessage: string;
};

type GoogleTokenErrorPayload = {
  error_description?: string;
  error?: string;
};

type ServiceAccountCredentials = {
  email: string;
  privateKey: string;
};

let tokenCache: AccessTokenCache | null = null;

export function getGoogleDriveEnvStatus(): DriveEnvStatus {
  const serviceAccount = getServiceAccountCredentials();
  const rootFolderId = normalizeDriveFolderId(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() ?? "");
  const oauthClientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() ?? "";
  const hasOauthClientSecret = Boolean(process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim());
  const hasOauthRefreshToken = Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim());

  return {
    mode: resolveDriveAuthMode(),
    rootFolderId,
    oauthClientId,
    hasOauthClientSecret,
    hasOauthRefreshToken,
    serviceAccountEmail: serviceAccount.email,
    hasServiceAccountPrivateKey: Boolean(serviceAccount.privateKey),
  };
}

export function hasGoogleDriveServerEnv() {
  const status = getGoogleDriveEnvStatus();

  if (!status.rootFolderId) {
    return false;
  }

  if (status.mode === "oauth-refresh-token") {
    return Boolean(status.oauthClientId && status.hasOauthClientSecret && status.hasOauthRefreshToken);
  }

  if (status.mode === "service-account") {
    return Boolean(status.serviceAccountEmail && status.hasServiceAccountPrivateKey);
  }

  return false;
}

export async function testGoogleDriveSetup() {
  const rootFolderId = getRequiredRootFolderId();
  const rootFolder = await getDriveFile(rootFolderId);

  if (rootFolder.mimeType !== FOLDER_MIME_TYPE) {
    throw new Error("The configured Google Drive root ID is reachable, but it is not a folder.");
  }

  const healthcheckFolder = await findOrCreateFolder({
    folderName: "ImpactOps Healthcheck",
    parentId: rootFolderId,
  });

  return {
    authMode: resolveDriveAuthMode(),
    rootFolderId: rootFolder.id,
    rootFolderName: rootFolder.name,
    healthcheckFolderId: healthcheckFolder.id,
    healthcheckFolderName: healthcheckFolder.name,
  };
}

export async function testGoogleDocsSetup() {
  const rootFolderId = getRequiredRootFolderId();
  const reportsFolder = await findOrCreateFolder({
    folderName: "ImpactOps Reports Healthcheck",
    parentId: rootFolderId,
  });
  const draft = await createGoogleDocFile({
    title: `ImpactOps Docs Healthcheck ${new Date().toISOString()}`,
    parentId: reportsFolder.id,
  });
  await writeGoogleDocContent({
    documentId: draft.id,
    content:
      "ImpactOps successfully created and wrote to this Google Doc during the platform readiness check.",
  });
  await trashDriveFile(draft.id);

  return {
    reportsFolderId: reportsFolder.id,
    reportDraftId: draft.id,
  };
}

export async function getDriveDebugSnapshot(): Promise<DriveDebugSnapshot> {
  const accessToken = await getAccessToken();
  const rootFolderId = getRequiredRootFolderId();
  const [tokenInfo, aboutInfo, rootLookup] = await Promise.all([
    fetchTokenInfo(accessToken),
    fetchDriveAbout(accessToken),
    getDriveFile(rootFolderId)
      .then((file) => ({ ok: true, message: `${file.name} (${file.id})` }))
      .catch((error) => ({
        ok: false,
        message: error instanceof Error ? error.message : "Unknown root lookup error.",
      })),
  ]);

  return {
    mode: resolveDriveAuthMode(),
    rootFolderId,
    tokenEmail: tokenInfo.email,
    driveUserEmail: aboutInfo.emailAddress,
    driveUserDisplayName: aboutInfo.displayName,
    scopes: tokenInfo.scope ? tokenInfo.scope.split(" ").filter(Boolean) : [],
    rootLookupOk: rootLookup.ok,
    rootLookupMessage: rootLookup.message,
  };
}

export async function uploadEvidenceFileToDrive({
  file,
  evidenceType,
  programme,
}: UploadEvidenceInput): Promise<UploadEvidenceResult> {
  const mimeType = file.type || "application/octet-stream";
  const programmeFolderId =
    programme.drive_folder_id ||
    (
      await findOrCreateFolder({
        folderName: formatProgrammeFolderName(programme.programme_code, programme.name),
        parentId: getRequiredRootFolderId(),
      })
    ).id;

  const destinationFolderId = await resolveEvidenceTypeFolder(programmeFolderId, evidenceType);
  const uploaded = await uploadFile({
    file,
    parentId: destinationFolderId,
    mimeType,
  });

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    fileSizeBytes: Number(uploaded.size ?? file.size ?? 0),
    mimeType: uploaded.mimeType || mimeType,
    driveFolderId: destinationFolderId,
    programmeFolderId,
    webViewLink: uploaded.webViewLink ?? null,
  };
}

type UploadConsentInput = {
  file: File;
  programme: ProgrammeFolderRecord;
};

export async function uploadConsentFileToDrive({
  file,
  programme,
}: UploadConsentInput): Promise<{
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  programmeFolderId: string;
  driveFolderId: string;
}> {
  const mimeType = file.type || "application/octet-stream";
  const programmeFolderId =
    programme.drive_folder_id ||
    (
      await findOrCreateFolder({
        folderName: formatProgrammeFolderName(programme.programme_code, programme.name),
        parentId: getRequiredRootFolderId(),
      })
    ).id;

  const consentFolder = await findOrCreateFolder({
    folderName: "Consent",
    parentId: programmeFolderId,
  });

  const uploaded = await uploadFile({
    file,
    parentId: consentFolder.id,
    mimeType,
  });

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    fileSizeBytes: Number(uploaded.size ?? file.size ?? 0),
    mimeType: uploaded.mimeType || mimeType,
    programmeFolderId,
    driveFolderId: consentFolder.id,
  };
}

type UploadFlyerInput = {
  file: File;
  programme: ProgrammeFolderRecord;
};

type UploadFlyerResult = {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  driveFolderId: string;
  programmeFolderId: string;
  webViewLink: string | null;
};

type UploadBeneficiaryPhotoInput = {
  file: File;
  beneficiaryCode: string;
  beneficiaryName: string;
};

type UploadBeneficiaryPhotoResult = {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  driveFolderId: string;
  webViewLink: string | null;
};

type CreateProgrammeReportDocInput = {
  programme: ProgrammeFolderRecord;
  title: string;
  content: string;
};

type CreateProgrammeReportDocResult = {
  fileId: string;
  webViewLink: string | null;
  driveFolderId: string;
  programmeFolderId: string;
};

type UploadProgrammeReportDocxInput = {
  programme: ProgrammeFolderRecord;
  fileName: string;
  buffer: Uint8Array;
};

type UploadProgrammeReportDocxResult = {
  fileId: string;
  webViewLink: string | null;
  driveFolderId: string;
  programmeFolderId: string;
};

export async function uploadProgrammeFlyerToDrive({
  file,
  programme,
}: UploadFlyerInput): Promise<UploadFlyerResult> {
  const mimeType = file.type || "application/octet-stream";
  const programmeFolderId =
    programme.drive_folder_id ||
    (
      await findOrCreateFolder({
        folderName: formatProgrammeFolderName(programme.programme_code, programme.name),
        parentId: getRequiredRootFolderId(),
      })
    ).id;

  const flyersFolder = await findOrCreateFolder({
    folderName: "Flyers",
    parentId: programmeFolderId,
  });

  const uploaded = await uploadFile({
    file,
    parentId: flyersFolder.id,
    mimeType,
  });

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    fileSizeBytes: Number(uploaded.size ?? file.size ?? 0),
    mimeType: uploaded.mimeType || mimeType,
    driveFolderId: flyersFolder.id,
    programmeFolderId,
    webViewLink: uploaded.webViewLink ?? null,
  };
}

export async function findOrCreateProgrammeReportsFolder(programme: ProgrammeFolderRecord) {
  const programmeFolderId =
    programme.drive_folder_id ||
    (
      await findOrCreateFolder({
        folderName: formatProgrammeFolderName(programme.programme_code, programme.name),
        parentId: getRequiredRootFolderId(),
      })
    ).id;

  const reportsFolder = await findOrCreateFolder({
    folderName: "Reports",
    parentId: programmeFolderId,
  });

  return {
    programmeFolderId,
    reportsFolderId: reportsFolder.id,
  };
}

export async function createProgrammeReportGoogleDoc({
  programme,
  title,
  content,
}: CreateProgrammeReportDocInput): Promise<CreateProgrammeReportDocResult> {
  const { programmeFolderId, reportsFolderId } = await findOrCreateProgrammeReportsFolder(programme);
  const draft = await createGoogleDocFile({
    title,
    parentId: reportsFolderId,
  });
  await writeGoogleDocContent({
    documentId: draft.id,
    content,
  });

  return {
    fileId: draft.id,
    webViewLink: draft.webViewLink ?? null,
    driveFolderId: reportsFolderId,
    programmeFolderId,
  };
}

export async function uploadProgrammeReportDocxToDrive({
  programme,
  fileName,
  buffer,
}: UploadProgrammeReportDocxInput): Promise<UploadProgrammeReportDocxResult> {
  const { programmeFolderId, reportsFolderId } = await findOrCreateProgrammeReportsFolder(programme);
  const uploaded = await uploadBytesFile({
    buffer,
    fileName,
    parentId: reportsFolderId,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return {
    fileId: uploaded.id,
    webViewLink: uploaded.webViewLink ?? null,
    driveFolderId: reportsFolderId,
    programmeFolderId,
  };
}

export async function uploadBeneficiaryPhotoToDrive({
  file,
  beneficiaryCode,
  beneficiaryName,
}: UploadBeneficiaryPhotoInput): Promise<UploadBeneficiaryPhotoResult> {
  const mimeType = file.type || "application/octet-stream";
  const rootFolder = await findOrCreateFolder({
    folderName: "Beneficiary Photos",
    parentId: getRequiredRootFolderId(),
  });
  const beneficiaryFolder = await findOrCreateFolder({
    folderName: formatBeneficiaryFolderName(beneficiaryCode, beneficiaryName),
    parentId: rootFolder.id,
  });
  const uploaded = await uploadFile({
    file,
    parentId: beneficiaryFolder.id,
    mimeType,
  });

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    fileSizeBytes: Number(uploaded.size ?? file.size ?? 0),
    mimeType: uploaded.mimeType || mimeType,
    driveFolderId: beneficiaryFolder.id,
    webViewLink: uploaded.webViewLink ?? null,
  };
}

type UploadEnrolmentAssetInput = {
  file: File;
  beneficiaryCode: string;
  beneficiaryName: string;
  fieldKey: string;
  subfolder: "Signatures" | "Field Images";
};

type UploadEnrolmentAssetResult = {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  driveFolderId: string;
};

export async function uploadEnrolmentAssetToDrive({
  file,
  beneficiaryCode,
  beneficiaryName,
  subfolder,
}: UploadEnrolmentAssetInput): Promise<UploadEnrolmentAssetResult> {
  const mimeType = file.type || "application/octet-stream";
  const rootFolder = await findOrCreateFolder({
    folderName: "Beneficiary Photos",
    parentId: getRequiredRootFolderId(),
  });
  const beneficiaryFolder = await findOrCreateFolder({
    folderName: formatBeneficiaryFolderName(beneficiaryCode, beneficiaryName),
    parentId: rootFolder.id,
  });
  const assetFolder = await findOrCreateFolder({
    folderName: subfolder,
    parentId: beneficiaryFolder.id,
  });
  const uploaded = await uploadFile({
    file,
    parentId: assetFolder.id,
    mimeType,
  });
  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    fileSizeBytes: Number(uploaded.size ?? file.size ?? 0),
    mimeType: uploaded.mimeType || mimeType,
    driveFolderId: assetFolder.id,
  };
}

async function resolveEvidenceTypeFolder(programmeFolderId: string, evidenceType: string) {
  const subfolder = evidenceTypeFolderName(evidenceType);

  if (!subfolder) {
    return programmeFolderId;
  }

  const folder = await findOrCreateFolder({
    folderName: subfolder,
    parentId: programmeFolderId,
  });

  return folder.id;
}

function evidenceTypeFolderName(evidenceType: string) {
  switch (evidenceType.trim()) {
    case "Document":
      return "Documents";
    case "Photo":
      return "Photos";
    case "Video":
      return "Videos";
    case "Attendance":
      return "Attendance";
    default:
      return "Other";
  }
}

async function uploadFile({
  file,
  parentId,
  mimeType,
}: {
  file: File;
  parentId: string;
  mimeType: string;
}) {
  const boundary = `impactops-${Date.now().toString(36)}`;
  const metadata = {
    name: file.name,
    parents: [parentId],
  };
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const suffix = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(prefix.length + fileBytes.length + suffix.length);
  body.set(prefix, 0);
  body.set(fileBytes, prefix.length);
  body.set(suffix, prefix.length + fileBytes.length);

  return driveRequest<DriveFileSummary>(
    `${GOOGLE_DRIVE_UPLOAD_API}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,parents,webViewLink`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
}

async function uploadBytesFile({
  buffer,
  fileName,
  parentId,
  mimeType,
}: {
  buffer: Uint8Array;
  fileName: string;
  parentId: string;
  mimeType: string;
}) {
  const boundary = `impactops-${Date.now().toString(36)}`;
  const metadata = {
    name: fileName,
    parents: [parentId],
  };
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(prefix.length + buffer.length + suffix.length);
  body.set(prefix, 0);
  body.set(buffer, prefix.length);
  body.set(suffix, prefix.length + buffer.length);

  return driveRequest<DriveFileSummary>(
    `${GOOGLE_DRIVE_UPLOAD_API}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,parents,webViewLink`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
}

async function getDriveFile(fileId: string) {
  return driveRequest<DriveFileSummary>(
    `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents&supportsAllDrives=true`,
    {
      method: "GET",
    },
  );
}

async function fetchTokenInfo(accessToken: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return {
      email: "",
      scope: "",
    };
  }

  const payload = (await response.json()) as {
    email?: string;
    scope?: string;
  };

  return {
    email: payload.email ?? "",
    scope: payload.scope ?? "",
  };
}

async function fetchDriveAbout(accessToken: string) {
  const response = await fetch(
    `${GOOGLE_DRIVE_API}/about?fields=user(displayName,emailAddress)&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      emailAddress: "",
      displayName: "",
    };
  }

  const payload = (await response.json()) as {
    user?: {
      emailAddress?: string;
      displayName?: string;
    };
  };

  return {
    emailAddress: payload.user?.emailAddress ?? "",
    displayName: payload.user?.displayName ?? "",
  };
}

async function findOrCreateFolder({
  folderName,
  parentId,
}: {
  folderName: string;
  parentId: string;
}) {
  const existing = await listFiles(
    `mimeType='${FOLDER_MIME_TYPE}' and trashed=false and name=${toDriveLiteral(folderName)} and '${parentId}' in parents`,
  );

  if (existing[0]) {
    return existing[0];
  }

  return driveRequest<DriveFileSummary>(`${GOOGLE_DRIVE_API}/files?supportsAllDrives=true&fields=id,name,mimeType,parents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentId],
    }),
  });
}

async function createGoogleDocFile({
  title,
  parentId,
}: {
  title: string;
  parentId: string;
}) {
  return driveRequest<DriveFileSummary>(
    `${GOOGLE_DRIVE_API}/files?supportsAllDrives=true&fields=id,name,mimeType,parents,webViewLink`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: title,
        mimeType: GOOGLE_DOC_MIME_TYPE,
        parents: [parentId],
      }),
    },
  );
}

async function writeGoogleDocContent({
  documentId,
  content,
}: {
  documentId: string;
  content: string;
}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${GOOGLE_DOCS_API}/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      detail = payload.error?.message || detail;
    } catch {
      // Keep status text fallback.
    }

    throw new Error(`Google Docs request failed: ${detail}`);
  }
}

async function trashDriveFile(fileId: string) {
  return driveRequest<DriveFileSummary>(
    `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: true }),
    },
  );
}

async function listFiles(query: string) {
  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,mimeType,parents)",
    pageSize: "5",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    corpora: "allDrives",
  });
  const response = await driveRequest<{ files?: DriveFileSummary[] }>(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, {
    method: "GET",
  });

  return response.files ?? [];
}

async function driveRequest<T>(url: string, init: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText;

    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      detail = payload.error?.message || detail;
    } catch {
      // Keep status text fallback.
    }

    throw new Error(`Google Drive request failed: ${detail}`);
  }

  return (await response.json()) as T;
}

async function getAccessToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const mode = resolveDriveAuthMode();

  if (!mode) {
    throw new Error("Google Drive auth is not configured. Add OAuth refresh-token env vars or service-account env vars.");
  }

  const body = mode === "oauth-refresh-token" ? buildOauthRefreshBody() : buildServiceAccountBody();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText;
    let payload: GoogleTokenErrorPayload | null = null;

    try {
      payload = (await response.json()) as GoogleTokenErrorPayload;
      detail = describeGoogleTokenExchangeError(payload) || detail;
    } catch {
      // Keep status text fallback.
    }

    throw new Error(`Google token exchange failed: ${detail}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(payload.expires_in - 60, 30) * 1000,
  };

  return tokenCache.accessToken;
}

function buildOauthRefreshBody() {
  return new URLSearchParams({
    client_id: getRequiredEnv("GOOGLE_DRIVE_CLIENT_ID"),
    client_secret: getRequiredEnv("GOOGLE_DRIVE_CLIENT_SECRET"),
    refresh_token: getRequiredEnv("GOOGLE_DRIVE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
}

function describeGoogleTokenExchangeError(payload: GoogleTokenErrorPayload) {
  const errorCode = payload.error?.trim().toLowerCase() ?? "";
  const description = payload.error_description?.trim() ?? "";
  const combined = `${errorCode} ${description}`.trim().toLowerCase();

  if (combined.includes("invalid_grant")) {
    return "Refresh token was rejected. Confirm GOOGLE_DRIVE_REFRESH_TOKEN belongs to this exact OAuth client, then redeploy Vercel so the live app picks up the new value.";
  }

  if (combined.includes("invalid_client")) {
    return "OAuth client ID or secret was rejected. Confirm GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in Vercel match the client used to issue the refresh token.";
  }

  if (combined.includes("unauthorized_client")) {
    return "This OAuth client cannot use the configured refresh-token flow. Confirm the Google Cloud OAuth client type and allowed APIs, then issue a fresh refresh token.";
  }

  if (combined.includes("invalid_scope")) {
    return "The refresh token is missing one or more required Google scopes. Re-issue it with both Drive file access and Google Docs access.";
  }

  if (description) {
    return description;
  }

  return payload.error || "";
}

function buildServiceAccountBody() {
  const assertion = createSignedAssertion();

  return new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
}

function createSignedAssertion() {
  const credentials = getServiceAccountCredentials();
  const email = credentials.email;
  const privateKey = normalizePrivateKey(credentials.privateKey);
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJwtPart({ alg: "RS256", typ: "JWT" });
  const claimSet = encodeJwtPart({
    iss: email,
    scope: DRIVE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  });
  const unsigned = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${unsigned}.${signature.toString("base64url")}`;
}

function encodeJwtPart(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function getRequiredEnv(
  name:
    | "GOOGLE_DRIVE_CLIENT_ID"
    | "GOOGLE_DRIVE_CLIENT_SECRET"
    | "GOOGLE_DRIVE_REFRESH_TOKEN"
    | "GOOGLE_DRIVE_ROOT_FOLDER_ID"
    | "GOOGLE_SERVICE_ACCOUNT_EMAIL"
    | "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
) {
  if (name === "GOOGLE_SERVICE_ACCOUNT_EMAIL" || name === "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") {
    const credentials = getServiceAccountCredentials();
    const value = name === "GOOGLE_SERVICE_ACCOUNT_EMAIL" ? credentials.email : credentials.privateKey;

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }

  if (name === "GOOGLE_DRIVE_ROOT_FOLDER_ID") {
    return getRequiredRootFolderId();
  }

  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getRequiredRootFolderId() {
  const value = normalizeDriveFolderId(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() ?? "");

  if (!value) {
    throw new Error("Missing required environment variable: GOOGLE_DRIVE_ROOT_FOLDER_ID");
  }

  return value;
}

function resolveDriveAuthMode(): DriveAuthMode | null {
  const hasOauth =
    Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()) &&
    Boolean(process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim()) &&
    Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim());

  if (hasOauth) {
    return "oauth-refresh-token";
  }

  const serviceAccount = getServiceAccountCredentials();
  const hasServiceAccount = Boolean(serviceAccount.email && serviceAccount.privateKey);

  if (hasServiceAccount) {
    return "service-account";
  }

  return null;
}

function getServiceAccountCredentials(): ServiceAccountCredentials {
  const jsonCandidate =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    "";

  if (jsonCandidate.startsWith("{")) {
    try {
      const parsed = JSON.parse(jsonCandidate) as {
        client_email?: string;
        private_key?: string;
      };

      return {
        email: parsed.client_email?.trim() || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "",
        privateKey: parsed.private_key?.trim() || "",
      };
    } catch {
      return {
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "",
        privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ?? "",
      };
    }
  }

  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "",
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ?? "",
  };
}

function formatProgrammeFolderName(programmeCode: string, programmeName: string) {
  return `${programmeCode} - ${programmeName}`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

function formatBeneficiaryFolderName(beneficiaryCode: string, beneficiaryName: string) {
  return `${beneficiaryCode} - ${beneficiaryName}`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

function toDriveLiteral(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function normalizeDriveFolderId(value: string) {
  const folderMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  return value;
}

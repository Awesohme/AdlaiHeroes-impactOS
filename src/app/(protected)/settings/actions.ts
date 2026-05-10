"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getDriveDebugSnapshot, testGoogleDriveSetup } from "@/lib/google-drive/server";

export async function testGoogleDriveConnectionAction() {
  try {
    await testGoogleDriveSetup();
    const snapshot = await getDriveDebugSnapshot();
    redirect(
      `/settings?drive_test=ok&drive_mode=${encodeURIComponent(snapshot.mode ?? "")}&drive_token_email=${encodeURIComponent(snapshot.tokenEmail)}&drive_user_email=${encodeURIComponent(snapshot.driveUserEmail)}&drive_scope=${encodeURIComponent(snapshot.scopes.join(", "))}&drive_root_status=${encodeURIComponent(snapshot.rootLookupMessage)}`,
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("Google Drive readiness test failed", error);
    const snapshot = await getDriveDebugSnapshot().catch(() => null);
    const message =
      error instanceof Error
        ? error.message.slice(0, 220)
        : "Unknown Google Drive setup error.";
    redirect(
      `/settings?drive_test=error&drive_error=${encodeURIComponent(message)}&drive_mode=${encodeURIComponent(snapshot?.mode ?? "")}&drive_token_email=${encodeURIComponent(snapshot?.tokenEmail ?? "")}&drive_user_email=${encodeURIComponent(snapshot?.driveUserEmail ?? "")}&drive_scope=${encodeURIComponent(snapshot?.scopes.join(", ") ?? "")}&drive_root_status=${encodeURIComponent(snapshot?.rootLookupMessage ?? "")}`,
    );
  }
}

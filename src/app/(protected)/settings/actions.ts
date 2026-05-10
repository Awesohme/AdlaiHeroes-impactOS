"use server";

import { redirect } from "next/navigation";
import { testGoogleDriveSetup } from "@/lib/google-drive/server";

export async function testGoogleDriveConnectionAction() {
  try {
    await testGoogleDriveSetup();
    redirect("/settings?drive_test=ok");
  } catch (error) {
    console.error("Google Drive readiness test failed", error);
    const message =
      error instanceof Error
        ? error.message.slice(0, 220)
        : "Unknown Google Drive setup error.";
    redirect(`/settings?drive_test=error&drive_error=${encodeURIComponent(message)}`);
  }
}

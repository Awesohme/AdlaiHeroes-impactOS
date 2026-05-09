import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adlai ImpactOps",
  description: "Programme operations, evidence, and donor reporting for Adlai Heroes Foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { ClarityProvider } from "@/components/analytics/clarity-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ClarityProvider />
        <NextTopLoader color="#9333ea" height={2.5} showSpinner={false} shadow={false} />
        {children}
      </body>
    </html>
  );
}

import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fabric Reality Lab",
  description: "A 3D network wind tunnel for HPC and AI fabrics. Deterministic simulation, explainable failures and architecture experiments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}<Script src="/portfolio-embed.js" strategy="afterInteractive" /></body>
    </html>
  );
}

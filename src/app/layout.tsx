import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { config } from "@/lib/config";
import { DevButton } from "@/components/dev/dev-button";
import { SupportChat } from "@/components/support/support-chat";

const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

// Display serif for marketing headings only (see .marketing h1/h2 in globals.css).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  // Italic: the second voice of marketing titles (docs/DESIGN.md).
  style: ["normal", "italic"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const APP_URL = config.appUrl;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Septune: automated technical SEO checks for every deploy",
    template: "%s · Septune",
  },
  description:
    "Automated technical SEO for developers. Septune fails the pull request that would drop pages from Google and watches production after the merge.",
  keywords: [
    "technical SEO",
    "automated SEO",
    "SEO regression testing",
    "SEO monitoring",
    "GitHub Action",
    "Next.js SEO",
    "SEO MCP server",
  ],
  authors: [{ name: "Septune" }],
  openGraph: {
    title: "Septune: technical SEO that survives your deploys",
    description:
      "Fails the pull request that would drop pages from Google, then keeps watching production.",
    // Relative path resolved per-page against metadataBase. Pages override
    // this with their own path (see /pricing) so og:url is never wrong.
    url: "/",
    siteName: "Septune",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Septune: technical SEO that survives your deploys",
    description:
      "Fails the pull request that would drop pages from Google, then keeps watching production.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${fraunces.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">
        {children}
        {/* Dev tooling never ships to production bundles (statically eliminated). */}
        {process.env.NODE_ENV === "development" && <DevButton />}
        <SupportChat />
      </body>
    </html>
  );
}

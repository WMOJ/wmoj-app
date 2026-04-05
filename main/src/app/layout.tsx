import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google"; // [MODIFY] Replaced Geist
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CountdownProvider } from "@/contexts/CountdownContext";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { ActiveContestRedirect } from "@/components/ActiveContestRedirect";
import { AppShell } from "@/components/layout/AppShell";
import { ToastContainer } from "@/components/ui/Toast";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://wmoj.ca'),
  title: {
    default: "WMOJ - Open Source Competitive Programming Platform",
    template: "%s | WMOJ",
  },
  description: "A modern open-source judge and competitive programming platform. Practice problems, compete in contests, and improve your skills.",
  keywords: ["competitive programming", "problem solving", "algorithm", "data structures", "contest", "programming"],
  authors: [{ name: "WMOJ Team" }],
  creator: "WMOJ",
  publisher: "WMOJ",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "WMOJ",
    title: "WMOJ - Open Source Competitive Programming Platform",
    description: "A modern open-source judge and competitive programming platform.",
    images: [
      {
        url: "/og-image.png", // Assuming an OG image exists or will exist; decent fallback even if 404 for now
        width: 1200,
        height: 630,
        alt: "WMOJ Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WMOJ - Open Source Competitive Programming Platform",
    description: "A modern open-source judge and competitive programming platform.",
    // images: ["/twitter-image.png"], // Optional
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light scroll-smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <CountdownProvider>
              <AppShell>
                {children}
              </AppShell>
              <CountdownOverlay />
              <ActiveContestRedirect />
              <ToastContainer />
            </CountdownProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/components/auth-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { SiteHeader } from "@/components/site-header";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RootVillage",
    template: "%s · RootVillage",
  },
  description:
    "Köy hafızasını görünür kıl. Aileleri, ataları ve anıları sonraki nesillere aktar.",
  applicationName: "RootVillage",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RootVillage",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentProfile() : null;

  return (
    <html lang="tr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <AuthProvider initialUser={user} initialProfile={profile}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">
            {children}
          </main>
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/components/auth-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { SiteHeader } from "@/components/site-header";
import { getCurrentProfile } from "@/lib/data";
import { LocaleProvider } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Şop",
    template: "%s · Şop",
  },
  description:
    "Kürtlerin yerlerini, ailelerini, anlatılarını ve kültürel mirasını ilişkilendiren yaşayan hafıza atlası.",
  applicationName: "Şop",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Şop",
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
        <LocaleProvider>
          <AuthProvider initialUser={user} initialProfile={profile}>
            <SiteHeader />
            <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">
              {children}
            </main>
            <InstallPrompt />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

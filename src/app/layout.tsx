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
  themeColor: "#0F2A24",
  width: "device-width",
  initialScale: 1,
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
    <html
      lang="tr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-show-install=""
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=document.documentElement;d.setAttribute('data-show-install','');if(new URLSearchParams(location.search).get('install')==='1')d.setAttribute('data-force-install','');else d.removeAttribute('data-force-install');d.removeAttribute('data-standalone');}catch(e){}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__sopInstallPrompt=e;window.dispatchEvent(new Event('sop:install-ready'));});if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(function(r){r.update&&r.update();}).catch(function(){});}})();",
          }}
        />
      </head>
      <body className="min-h-dvh overflow-x-clip font-sans antialiased">
        <LocaleProvider>
          <AuthProvider initialUser={user} initialProfile={profile}>
            <InstallPrompt />
            <SiteHeader />
            <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">
              {children}
            </main>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

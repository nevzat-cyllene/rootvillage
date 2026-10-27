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
    <html lang="tr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=document.documentElement;var s=window.matchMedia('(display-mode: standalone)').matches||!!window.navigator.standalone;if(s)d.setAttribute('data-standalone','1');if(new URLSearchParams(location.search).get('install')==='1')d.setAttribute('data-force-install','');var ua=navigator.userAgent;var mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(ua)||(navigator.maxTouchPoints||0)>0||window.matchMedia('(pointer: coarse)').matches||window.matchMedia('(max-width: 900px)').matches;if(!s&&mobile)d.setAttribute('data-show-install','');}catch(e){}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__sopInstallPrompt=e;document.documentElement.setAttribute('data-show-install','');window.dispatchEvent(new Event('sop:install-ready'));});if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}})();",
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

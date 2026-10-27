"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { ProfileMenu } from "@/components/profile-menu";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/locale";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();
  const girisHref =
    pathname && pathname !== "/giris"
      ? `/giris?next=${encodeURIComponent(pathname)}`
      : "/giris";

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft/80 bg-[#fafafa]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#fafafa]/75">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="pressable">
          <Logo size={26} />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/archive"
            className="pressable hidden rounded-full px-2.5 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text sm:inline sm:px-3"
          >
            {t("nav.archive")}
          </Link>
          <Link
            href="/villages"
            className="pressable rounded-full px-2.5 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text sm:px-3"
          >
            {t("nav.villages")}
          </Link>
          {loading ? (
            <span className="px-3 text-[12px] text-text-tertiary">…</span>
          ) : user ? (
            <ProfileMenu />
          ) : (
            <Link
              href={girisHref}
              className="pressable inline-flex min-h-10 items-center justify-center rounded-full bg-[#1A4A3E] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_22px_rgba(26,74,62,0.28)] hover:bg-[#163D33]"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

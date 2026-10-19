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
            href="/villages"
            className="pressable rounded-full px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text"
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
              className="pressable inline-flex items-center justify-center rounded-full border border-border-soft bg-bg-surface px-3.5 py-1.5 text-[13px] font-medium text-text titanium-surface hover:border-border"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

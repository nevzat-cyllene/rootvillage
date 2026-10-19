"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";

export function SiteHeader() {
  const { user, profile, displayName, signOut, loading } = useAuth();
  const pathname = usePathname();
  const girisHref =
    pathname && pathname !== "/giris"
      ? `/giris?next=${encodeURIComponent(pathname)}`
      : "/giris";

  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const initial = (displayName ?? "?").slice(0, 1).toUpperCase();

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7762/ingest/a3a263e2-4994-425b-8858-1c3468f5f9c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "337fe7",
      },
      body: JSON.stringify({
        sessionId: "337fe7",
        hypothesisId: "E",
        location: "site-header.tsx:effect",
        message: "header auth state",
        data: {
          loading,
          hasUser: !!user,
          displayName: displayName ? "set" : null,
          pathname,
          showing: loading ? "loading" : user ? "profile" : "giris-link",
        },
        timestamp: Date.now(),
        runId: "pre-fix",
      }),
    }).catch(() => {});
  }, [loading, user, displayName, pathname]);
  // #endregion

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
            Köyler
          </Link>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="pressable rounded-full px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text"
            >
              Yönetim
            </Link>
          )}
          {loading ? (
            <span className="px-3 text-[12px] text-text-tertiary">…</span>
          ) : user ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="flex items-center gap-2 rounded-full border border-border-soft bg-bg-surface py-1 pl-1 pr-2.5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl as string}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
                    {initial}
                  </span>
                )}
                <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-text sm:inline">
                  {displayName}
                </span>
              </div>
              <Button
                variant="ghost"
                className="!px-3 !py-1.5 text-[13px]"
                onClick={() => void signOut().then(() => window.location.assign("/"))}
              >
                Çıkış
              </Button>
            </div>
          ) : (
            <Link
              href={girisHref}
              className="pressable inline-flex items-center justify-center rounded-full border border-border-soft bg-bg-surface px-3.5 py-1.5 text-[13px] font-medium text-text titanium-surface hover:border-border"
            >
              Giriş
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

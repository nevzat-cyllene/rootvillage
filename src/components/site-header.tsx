"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";

export function SiteHeader() {
  const { user, profile, signInWithGoogle, signOut, loading } = useAuth();

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
          {!loading &&
            (user ? (
              <div className="flex items-center gap-2 pl-1">
                <span className="hidden max-w-[140px] truncate text-[13px] text-text-secondary sm:inline">
                  {profile?.display_name ?? "Üye"}
                </span>
                <Button variant="ghost" className="!px-3 !py-1.5 text-[13px]" onClick={() => void signOut()}>
                  Çıkış
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="!px-3.5 !py-1.5 text-[13px]"
                onClick={() => void signInWithGoogle()}
              >
                Giriş
              </Button>
            ))}
        </nav>
      </div>
    </header>
  );
}

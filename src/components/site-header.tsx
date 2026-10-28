"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { ProfileMenu } from "@/components/profile-menu";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

const archiveNavGroups: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Yerler",
    items: [
      { href: "/villages", label: "Köyler" },
      { href: "/villages", label: "Aşiretler" },
      { href: "/archive?type=region", label: "Bölgeler" },
      { href: "/archive?type=city", label: "Şehirler" },
      { href: "/archive?type=district", label: "İlçeler" },
      { href: "/archive?type=hamlet", label: "Mezralar" },
      { href: "/archive?type=monument", label: "Yapılar / anıtlar" },
      { href: "/archive?type=historic_site", label: "Tarihî mekânlar" },
    ],
  },
  {
    title: "Hafıza",
    items: [
      { href: "/archive?type=event", label: "Tarihî olaylar" },
      { href: "/archive?type=story", label: "Hikâyeler / destanlar" },
      { href: "/archive?type=quote", label: "Alıntılar" },
      { href: "/archive?type=person", label: "Tarihî kişiler" },
    ],
  },
  {
    title: "Kültür",
    items: [
      { href: "/archive?type=cultural_practice", label: "Kültürel öğeler" },
      { href: "/archive?type=village", label: "Arşivdeki köy kayıtları" },
    ],
  },
];

function ArchiveChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={cn("text-text-tertiary transition", open && "rotate-180")}
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveMenu() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="pressable inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text sm:px-3"
      >
        {t("nav.archive")}
        <ArchiveChevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 max-h-[min(70vh,520px)] w-[min(calc(100vw-2rem),280px)] overflow-y-auto rounded-[14px] border border-border-soft bg-bg-surface shadow-[var(--shadow)] animate-fade-up"
        >
          <div className="border-b border-border-soft p-1.5">
            <Link
              href="/archive"
              role="menuitem"
              className="block rounded-[10px] px-3 py-2 text-[13px] font-semibold text-text hover:bg-black/[0.04]"
              onClick={() => setOpen(false)}
            >
              Tüm arşiv
            </Link>
          </div>

          {archiveNavGroups.map((group) => (
            <div key={group.title} className="border-b border-border-soft p-1.5 last:border-b-0">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                {group.title}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  role="menuitem"
                  className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-black/[0.04] hover:text-text"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          <ArchiveMenu />
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

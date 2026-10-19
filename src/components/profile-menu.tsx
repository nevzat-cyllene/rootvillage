"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLocale, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

function Chevron({ open }: { open: boolean }) {
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

export function ProfileMenu() {
  const { user, profile, displayName, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const avatarUrl =
    profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const initial = (displayName ?? "?").slice(0, 1).toUpperCase();
  const email = user?.email ?? "";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setLangOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickLang(next: Locale) {
    setLocale(next);
    setLangOpen(false);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative pl-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="pressable flex items-center gap-1.5 rounded-full border border-border-soft bg-bg-surface py-1 pl-1 pr-2 titanium-surface hover:border-border"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-[13px] font-medium text-text sm:inline">
          {displayName}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[260px] overflow-hidden rounded-[14px] border border-border-soft bg-bg-surface shadow-[var(--shadow)] animate-fade-up"
        >
          <div className="border-b border-border-soft px-3.5 py-3">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">
              {displayName}
            </p>
            {email && (
              <p className="mt-0.5 truncate text-[12px] text-text-secondary">{email}</p>
            )}
          </div>

          <div className="p-1.5">
            <Link
              href="/hesap"
              role="menuitem"
              className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-text hover:bg-black/[0.04]"
              onClick={() => setOpen(false)}
            >
              {t("menu.account")}
            </Link>

            <div className="relative">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-text hover:bg-black/[0.04]"
                onClick={() => setLangOpen((v) => !v)}
              >
                <span>{t("menu.language")}</span>
                <span className="text-[12px] font-normal text-text-tertiary">
                  {locale === "tr" ? t("lang.tr") : t("lang.en")}
                </span>
              </button>
              {langOpen && (
                <div className="mx-1 mb-1 overflow-hidden rounded-[10px] border border-border-soft bg-bg-elevated">
                  {(["tr", "en"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={cn(
                        "flex w-full px-3 py-2 text-left text-[13px] hover:bg-black/[0.04]",
                        locale === code && "font-semibold text-text",
                        locale !== code && "text-text-secondary",
                      )}
                      onClick={() => pickLang(code)}
                    >
                      {t(code === "tr" ? "lang.tr" : "lang.en")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {profile?.role === "admin" && (
              <Link
                href="/admin"
                role="menuitem"
                className="block rounded-[10px] px-3 py-2 text-[13px] font-medium text-text hover:bg-black/[0.04]"
                onClick={() => setOpen(false)}
              >
                {t("menu.admin")}
              </Link>
            )}
          </div>

          <div className="border-t border-border-soft p-1.5">
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger/8"
              onClick={() => {
                setOpen(false);
                void signOut().then(() => window.location.assign("/"));
              }}
            >
              {t("menu.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sop-install-dismissed-at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || wasDismissedRecently()) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Premium top invite: show quickly on mobile/desktop even before BIP.
    const timer = window.setTimeout(() => {
      if (!isStandalone()) setVisible(true);
    }, 900);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.removeProperty("--install-banner-h");
      return;
    }
    document.documentElement.style.setProperty("--install-banner-h", "58px");
    return () => {
      document.documentElement.style.removeProperty("--install-banner-h");
    };
  }, [visible]);

  if (!visible || isStandalone()) return null;

  async function onInstall() {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        dismiss();
      }
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Uygulamayı yükle"
      className={cn(
        "install-prompt fixed inset-x-0 top-0 z-[60]",
        "border-b border-white/40 bg-[linear-gradient(105deg,#0F2A24_0%,#1A4A3E_42%,#243B55_100%)]",
        "pt-[env(safe-area-inset-top)] shadow-[0_12px_40px_rgba(15,42,36,0.28)]",
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2.5 sm:px-6">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/12 text-[18px] text-white ring-1 ring-white/20"
          aria-hidden
        >
          ↓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-[-0.02em] text-white sm:text-[14px]">
            Şop’u telefonuna indirmek ister misin?
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/70 sm:line-clamp-1">
            {isIos && !deferred
              ? "Safari’de Paylaş → Ana Ekrana Ekle ile ana ekranına kur."
              : deferred
                ? "Tek dokunuşla ana ekrana ekle; köy hafızası cebinde."
                : "Tarayıcı menüsünden “Ana ekrana ekle / Uygulamayı yükle” seç."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {deferred ? (
            <Button
              className="!border-0 !bg-white !px-3.5 !py-2 !text-[12px] !text-[#16352E] shadow-sm hover:!bg-white/90"
              disabled={installing}
              onClick={() => void onInstall()}
            >
              {installing ? "…" : "İndir"}
            </Button>
          ) : isIos ? (
            <span className="hidden rounded-full bg-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 ring-1 ring-white/15 sm:inline">
              Paylaş → Ekle
            </span>
          ) : (
            <span className="hidden rounded-full bg-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 ring-1 ring-white/15 sm:inline">
              Menü → Yükle
            </span>
          )}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
            onClick={() => {
              setVisible(false);
              dismiss();
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

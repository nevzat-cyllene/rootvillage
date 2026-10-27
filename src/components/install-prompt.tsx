"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Bump when invite behavior changes so old dismissals don't stick. */
const DISMISS_KEY = "sop-install-dismissed-at-v3";
const DISMISS_MS = 2 * 24 * 60 * 60 * 1000;
const LEGACY_DISMISS_KEYS = ["sop-install-dismissed-at", "sop-install-dismissed-at-v2"];

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

/** Phone/tablet only — never show on desktop mouse layouts. */
function isMobileClient(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini|mobile/.test(ua)) {
    return true;
  }
  // iPadOS 13+ desktop UA
  if (
    window.navigator.platform === "MacIntel" &&
    (window.navigator.maxTouchPoints ?? 0) > 1
  ) {
    return true;
  }
  // Touch phone/tablet without "Mobile" in UA
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(max-width: 900px)").matches
  );
}

function wasDismissedRecently(): boolean {
  try {
    for (const key of LEGACY_DISMISS_KEYS) {
      localStorage.removeItem(key);
    }
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
    if (!isMobileClient()) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        (window.navigator.maxTouchPoints ?? 0) > 1);
    setIsIos(ios);

    // Show immediately on mobile — do not wait for beforeinstallprompt.
    setVisible(true);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
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
        "install-prompt fixed inset-x-0 top-0 z-[80]",
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
          ) : (
            <span className="rounded-full bg-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 ring-1 ring-white/15">
              {isIos ? "Paylaş → Ekle" : "Menü → Yükle"}
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

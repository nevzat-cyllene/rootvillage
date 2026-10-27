"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __sopInstallPrompt?: BeforeInstallPromptEvent;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function isForcedInstall(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("install") === "1";
  } catch {
    return false;
  }
}

/** Prefer phones/tablets; CSS also hides true desktop mouse layouts. */
function isMobileClient(): boolean {
  if (typeof window === "undefined") return true; // SSR: render; CSS hides desktop
  const ua = window.navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini|mobile/.test(ua)) {
    return true;
  }
  // Chrome Client Hints when available
  const uaData = (
    window.navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (uaData?.mobile) return true;
  // iPadOS desktop UA
  if (
    window.navigator.platform === "MacIntel" &&
    (window.navigator.maxTouchPoints ?? 0) > 1
  ) {
    return true;
  }
  // Phone with "Desktop site" requested: still narrow + touch
  const narrow =
    window.matchMedia("(max-width: 900px)").matches || window.innerWidth <= 900;
  const touch =
    window.matchMedia("(pointer: coarse)").matches ||
    (window.navigator.maxTouchPoints ?? 0) > 1 ||
    window.matchMedia("(hover: none)").matches;
  return narrow && touch;
}

function dbgLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7762/ingest/a3a263e2-4994-425b-8858-1c3468f5f9c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ffc48a" },
    body: JSON.stringify({
      sessionId: "ffc48a",
      runId: "post-fix-2",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function InstallPrompt() {
  // SSR + first paint: visible. Desktop is hidden via CSS; standalone hides in effect.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = isStandalone();
    const forced = isForcedInstall();
    const mobile = isMobileClient();
    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        (window.navigator.maxTouchPoints ?? 0) > 1);
    setIsIos(ios);

    document.documentElement.toggleAttribute("data-force-install", forced);

    dbgLog("A_B_C", "install-prompt.tsx:mount", "install mount gate", {
      standalone,
      forced,
      mobile,
      capturedEarly: Boolean(window.__sopInstallPrompt),
      ua: window.navigator.userAgent,
      platform: window.navigator.platform,
      maxTouchPoints: window.navigator.maxTouchPoints,
      coarse: window.matchMedia("(pointer: coarse)").matches,
      hoverNone: window.matchMedia("(hover: none)").matches,
      narrow: window.matchMedia("(max-width: 900px)").matches,
      innerWidth: window.innerWidth,
      path: window.location.pathname,
      search: window.location.search,
    });

    if (standalone) {
      setVisible(false);
      return;
    }
    if (!mobile && !forced) {
      setVisible(false);
      return;
    }
    setVisible(true);

    const acceptPrompt = (prompt: BeforeInstallPromptEvent) => {
      setDeferred(prompt);
      setVisible(true);
    };
    const onBip = (e: Event) => {
      e.preventDefault();
      window.__sopInstallPrompt = e as BeforeInstallPromptEvent;
      acceptPrompt(e as BeforeInstallPromptEvent);
      dbgLog("D", "install-prompt.tsx:bip", "beforeinstallprompt fired", {
        path: window.location.pathname,
      });
    };
    const onEarlyPrompt = () => {
      if (window.__sopInstallPrompt) acceptPrompt(window.__sopInstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("sop:install-ready", onEarlyPrompt);
    onEarlyPrompt();

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          dbgLog("D", "install-prompt.tsx:sw", "service worker registered", {
            scope: registration.scope,
            active: Boolean(registration.active),
            controller: Boolean(navigator.serviceWorker.controller),
          });
        })
        .catch((error: unknown) => {
          dbgLog("D", "install-prompt.tsx:sw-error", "service worker failed", {
            error: String(error),
          });
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("sop:install-ready", onEarlyPrompt);
      document.documentElement.removeAttribute("data-force-install");
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.removeProperty("--install-banner-h");
      return;
    }
    document.documentElement.style.setProperty("--install-banner-h", "58px");
    const banner = document.querySelector(".install-prompt");
    const style = banner ? window.getComputedStyle(banner) : null;
    dbgLog("E", "install-prompt.tsx:visible", "banner visible effect", {
      hasBanner: Boolean(banner),
      display: style?.display ?? null,
      visibility: style?.visibility ?? null,
      opacity: style?.opacity ?? null,
      zIndex: style?.zIndex ?? null,
      htmlClass: document.documentElement.className,
    });
    return () => {
      document.documentElement.style.removeProperty("--install-banner-h");
    };
  }, [visible]);

  if (!visible) return null;

  async function onInstall() {
    if (!deferred) {
      setShowInstallHelp(true);
      return;
    }
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferred(null);
      delete window.__sopInstallPrompt;
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
            <Button
              className="!border-0 !bg-white !px-3.5 !py-2 !text-[12px] !text-[#16352E] shadow-sm hover:!bg-white/90"
              onClick={() => void onInstall()}
            >
              Yükle
            </Button>
          )}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
            onClick={() => {
              setVisible(false);
            }}
          >
            ×
          </button>
        </div>
      </div>
      {showInstallHelp && !deferred && (
        <div className="border-t border-white/15 bg-black/10 px-4 py-2 text-center text-[11px] font-medium text-white/90">
          {isIos
            ? "Safari: Paylaş simgesi → Ana Ekrana Ekle"
            : "Tarayıcı menüsü (⋮) → Uygulamayı yükle veya Ana ekrana ekle"}
        </div>
      )}
    </div>
  );
}

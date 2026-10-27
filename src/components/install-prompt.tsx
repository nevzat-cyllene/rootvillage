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

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    (window.navigator.platform === "MacIntel" &&
      (window.navigator.maxTouchPoints ?? 0) > 1)
  );
}

function markShowInstall(on: boolean) {
  if (on) document.documentElement.setAttribute("data-show-install", "");
  else document.documentElement.removeAttribute("data-show-install");
}

function dbgLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  const payload = JSON.stringify({
    sessionId: "ffc48a",
    runId: "auto-banner-1",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  });
  fetch("http://127.0.0.1:7762/ingest/a3a263e2-4994-425b-8858-1c3468f5f9c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ffc48a" },
    body: payload,
  }).catch(() => {});
  fetch("/api/debug-ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  }).catch(() => {});
  // #endregion
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = isStandalone();
    const forced = isForcedInstall();
    const ios = detectIos();
    const hasBip = Boolean(window.__sopInstallPrompt);
    // Always unlock banner in browser tabs (standalone still hides).
    const showSurface = !standalone;
    setIsIos(ios);
    if (ios) setShowInstallHelp(true);

    document.documentElement.toggleAttribute("data-force-install", forced);
    markShowInstall(showSurface);

    const cssWouldHideDesktop =
      window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)")
        .matches &&
      !forced &&
      !showSurface;

    dbgLog("H1_H2_H5", "install-prompt.tsx:mount", "auto banner gate", {
      standalone,
      forced,
      showSurface,
      hasBip,
      cssWouldHideDesktop,
      displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
      // @ts-expect-error iOS
      iosStandalone: window.navigator.standalone === true,
      ua: window.navigator.userAgent.slice(0, 140),
      innerWidth: window.innerWidth,
      maxTouchPoints: window.navigator.maxTouchPoints,
      coarse: window.matchMedia("(pointer: coarse)").matches,
      fine: window.matchMedia("(pointer: fine)").matches,
      hover: window.matchMedia("(hover: hover)").matches,
      path: window.location.pathname + window.location.search,
    });

    if (standalone) {
      document.documentElement.setAttribute("data-standalone", "1");
      setVisible(false);
      dbgLog("H3", "install-prompt.tsx:standalone", "hidden standalone", {});
      return;
    }
    document.documentElement.removeAttribute("data-standalone");
    setVisible(true);

    const acceptPrompt = (prompt: BeforeInstallPromptEvent) => {
      setDeferred(prompt);
      markShowInstall(true);
      setVisible(true);
      setShowInstallHelp(false);
      dbgLog("H5", "install-prompt.tsx:bip", "BIP accepted → show banner", {});
    };
    const onBip = (e: Event) => {
      e.preventDefault();
      window.__sopInstallPrompt = e as BeforeInstallPromptEvent;
      acceptPrompt(e as BeforeInstallPromptEvent);
    };
    const onEarlyPrompt = () => {
      if (window.__sopInstallPrompt) acceptPrompt(window.__sopInstallPrompt);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("sop:install-ready", onEarlyPrompt);
    window.addEventListener("appinstalled", onInstalled);
    onEarlyPrompt();

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // After paint: confirm computed visibility (H1 CSS hide)
    requestAnimationFrame(() => {
      const el = document.querySelector(".install-prompt");
      const style = el ? window.getComputedStyle(el) : null;
      dbgLog("H1", "install-prompt.tsx:paint", "computed banner style", {
        hasEl: Boolean(el),
        display: style?.display ?? null,
        visibility: style?.visibility ?? null,
        showAttr: document.documentElement.hasAttribute("data-show-install"),
        forceAttr: document.documentElement.hasAttribute("data-force-install"),
      });
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("sop:install-ready", onEarlyPrompt);
      window.removeEventListener("appinstalled", onInstalled);
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
      if (choice.outcome === "accepted") setVisible(false);
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
                : "Yükle’ye bas → tarayıcı menüsünden Ana ekrana ekle."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            className="!border-0 !bg-white !px-3.5 !py-2 !text-[12px] !text-[#16352E] shadow-sm hover:!bg-white/90"
            disabled={installing}
            onClick={() => void onInstall()}
          >
            {installing ? "…" : deferred ? "İndir" : "Yükle"}
          </Button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
            onClick={() => setVisible(false)}
          >
            ×
          </button>
        </div>
      </div>
      {(showInstallHelp || isForcedInstall()) && !deferred && (
        <div className="border-t border-white/15 bg-black/10 px-4 py-2.5 text-center text-[11px] font-medium leading-relaxed text-white/90">
          {isIos ? (
            <>
              1) Alttaki <strong>Paylaş</strong> simgesine dokun
              <br />
              2) <strong>Ana Ekrana Ekle</strong> → Ekle
            </>
          ) : (
            <>
              Chrome: sağ üst <strong>⋮</strong> → <strong>Uygulamayı yükle</strong> veya{" "}
              <strong>Ana ekrana ekle</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}

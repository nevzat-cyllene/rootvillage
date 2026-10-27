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

function dbgLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  const payload = JSON.stringify({
    sessionId: "ffc48a",
    runId: "banner-force-1",
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
  const [mode, setMode] = useState<"install" | "standalone" | "hidden">("install");
  const [isIos, setIsIos] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = isStandalone();
    const forced = isForcedInstall();
    const ios = detectIos();
    setIsIos(ios);
    if (ios) setShowInstallHelp(true);

    document.documentElement.toggleAttribute("data-force-install", forced);
    document.documentElement.removeAttribute("data-standalone");
    document.documentElement.setAttribute("data-show-install", "");

    dbgLog("H3_H6", "install-prompt.tsx:mount", "banner mode decide", {
      standalone,
      forced,
      hasBip: Boolean(window.__sopInstallPrompt),
      displayMode: window.matchMedia("(display-mode: standalone)").matches
        ? "standalone"
        : window.matchMedia("(display-mode: minimal-ui)").matches
          ? "minimal-ui"
          : window.matchMedia("(display-mode: fullscreen)").matches
            ? "fullscreen"
            : "browser",
      // @ts-expect-error iOS
      iosStandalone: window.navigator.standalone === true,
      ua: window.navigator.userAgent.slice(0, 160),
      innerWidth: window.innerWidth,
      path: window.location.href,
    });

    if (standalone) {
      setMode("standalone");
      document.documentElement.style.setProperty("--install-banner-h", "58px");
      return;
    }

    setMode("install");

    const acceptPrompt = (prompt: BeforeInstallPromptEvent) => {
      setDeferred(prompt);
      setMode("install");
      setShowInstallHelp(false);
      dbgLog("H5", "install-prompt.tsx:bip", "BIP accepted", {});
    };
    const onBip = (e: Event) => {
      e.preventDefault();
      window.__sopInstallPrompt = e as BeforeInstallPromptEvent;
      acceptPrompt(e as BeforeInstallPromptEvent);
    };
    const onEarlyPrompt = () => {
      if (window.__sopInstallPrompt) acceptPrompt(window.__sopInstallPrompt);
    };
    const onInstalled = () => setMode("hidden");

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("sop:install-ready", onEarlyPrompt);
    window.addEventListener("appinstalled", onInstalled);
    onEarlyPrompt();

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    requestAnimationFrame(() => {
      const el = document.querySelector(".install-prompt");
      const style = el ? window.getComputedStyle(el) : null;
      dbgLog("H1_H6", "install-prompt.tsx:paint", "forced banner paint", {
        hasEl: Boolean(el),
        display: style?.display ?? null,
        visibility: style?.visibility ?? null,
        opacity: style?.opacity ?? null,
        zIndex: style?.zIndex ?? null,
        rect: el ? el.getBoundingClientRect().toJSON() : null,
      });
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("sop:install-ready", onEarlyPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (mode === "hidden") {
      document.documentElement.style.removeProperty("--install-banner-h");
      return;
    }
    document.documentElement.style.setProperty("--install-banner-h", "58px");
    return () => {
      document.documentElement.style.removeProperty("--install-banner-h");
    };
  }, [mode]);

  if (mode === "hidden") return null;

  async function onInstall() {
    if (!deferred) {
      setShowInstallHelp(true);
      return;
    }
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setMode("hidden");
    } finally {
      setInstalling(false);
      setDeferred(null);
      delete window.__sopInstallPrompt;
    }
  }

  const isStandaloneMode = mode === "standalone";

  return (
    <>
      {/* Beat any stale cached CSS that used display:none !important */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            ".install-prompt{display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;inset-inline:0!important;top:0!important;z-index:99999!important;}",
        }}
      />
      <div
        role="dialog"
        aria-label={isStandaloneMode ? "Kurulu uygulama" : "Uygulamayı yükle"}
        className={cn(
          "install-prompt",
          isStandaloneMode
            ? "border-b border-amber-200/40 bg-[linear-gradient(105deg,#5C3B0A_0%,#8A5A12_50%,#5C3B0A_100%)]"
            : "border-b border-white/40 bg-[linear-gradient(105deg,#0F2A24_0%,#1A4A3E_42%,#243B55_100%)]",
          "pt-[env(safe-area-inset-top)] shadow-[0_12px_40px_rgba(15,42,36,0.28)]",
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2.5 sm:px-6">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/12 text-[18px] text-white ring-1 ring-white/20"
            aria-hidden
          >
            {isStandaloneMode ? "✓" : "↓"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold tracking-[-0.02em] text-white sm:text-[14px]">
              {isStandaloneMode
                ? "Şu an kurulu Şop uygulamasındasın"
                : "Şop’u telefonuna indirmek ister misin?"}
            </p>
            <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-white/70 sm:line-clamp-2">
              {isStandaloneMode
                ? "İndirme bandı yalnızca Chrome/Safari sekmesinde çıkar. Ana ekran ikonunu değil, tarayıcıda rootvillage.vercel.app aç."
                : isIos && !deferred
                  ? "Safari’de Paylaş → Ana Ekrana Ekle ile ana ekranına kur."
                  : deferred
                    ? "Tek dokunuşla ana ekrana ekle; köy hafızası cebinde."
                    : "Yükle’ye bas → tarayıcı menüsünden Ana ekrana ekle."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!isStandaloneMode && (
              <Button
                className="!border-0 !bg-white !px-3.5 !py-2 !text-[12px] !text-[#16352E] shadow-sm hover:!bg-white/90"
                disabled={installing}
                onClick={() => void onInstall()}
              >
                {installing ? "…" : deferred ? "İndir" : "Yükle"}
              </Button>
            )}
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label="Kapat"
              onClick={() => setMode("hidden")}
            >
              ×
            </button>
          </div>
        </div>
        {!isStandaloneMode && (showInstallHelp || isForcedInstall()) && !deferred && (
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
    </>
  );
}

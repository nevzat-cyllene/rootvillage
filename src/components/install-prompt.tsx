"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem("rv-install-dismissed");
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS safari
      window.navigator.standalone === true;

    if (standalone || dismissed === "1") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    // Show gentle iOS tip after a short delay
    const timer = window.setTimeout(() => {
      if (ios && !standalone) setVisible(true);
    }, 2500);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 animate-fade-up">
      <div className="mx-auto flex max-w-lg items-start gap-3 rounded-[18px] border border-border-soft bg-bg-surface/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold tracking-[-0.02em]">Dîwan’ı yükle</p>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">
            {isIos && !deferred
              ? "Safari’de Paylaş → Ana Ekrana Ekle ile telefonuna kur."
              : "Ana ekranına ekle; köy hafızasına anında ulaş."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {deferred && (
            <Button
              className="!py-1.5 !px-3 text-[13px]"
              onClick={async () => {
                await deferred.prompt();
                setVisible(false);
                localStorage.setItem("rv-install-dismissed", "1");
              }}
            >
              Yükle
            </Button>
          )}
          <Button
            variant="ghost"
            className="!py-1.5 !px-3 text-[13px]"
            onClick={() => {
              setVisible(false);
              localStorage.setItem("rv-install-dismissed", "1");
            }}
          >
            Sonra
          </Button>
        </div>
      </div>
    </div>
  );
}

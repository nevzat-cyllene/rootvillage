"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Logo } from "@/components/logo";
import { GoogleContinueButton } from "@/components/google-continue-button";
import { useAuth } from "@/components/auth-provider";

function SignInPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/villages";

  useEffect(() => {
    if (!loading && user) {
      router.replace(next.startsWith("/") ? next : "/villages");
    }
  }, [loading, user, next, router]);

  return (
    <div className="relative mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_center,rgba(91,107,124,0.14),transparent_70%)]"
      />

      <div className="relative animate-fade-up rounded-[20px] border border-border-soft bg-bg-surface/90 p-8 shadow-[var(--shadow)] backdrop-blur-sm sm:p-10">
        <Logo size={36} className="mb-8" />

        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-text">
          Giriş yap
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          RootVillage’e devam etmek için Google hesabınla oturum aç.
          İlk kez geliyorsan hesabın otomatik oluşur.
        </p>

        <div className="mt-8">
          <GoogleContinueButton
            className="!w-full !rounded-[12px] !px-4 !py-3 !text-[15px]"
            redirectTo={next.startsWith("/") ? next : "/villages"}
          />
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-text-tertiary">
          Gezmek için giriş gerekmez. Yazmak, eklemek ve yorum için
          hesabın yeterli.
        </p>
      </div>

      <p className="relative mt-6 text-center text-[13px] text-text-secondary">
        <Link href="/villages" className="underline-offset-2 hover:text-text hover:underline">
          Giriş yapmadan köylere göz at
        </Link>
      </p>
    </div>
  );
}

export default function GirisPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-20 text-center text-[14px] text-text-secondary">
          Yükleniyor…
        </div>
      }
    >
      <SignInPanel />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type Mode = "login" | "register";

function AuthForm() {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/villages";
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    urlError === "auth" ? "Oturum açılamadı. Tekrar deneyin." : null,
  );

  useEffect(() => {
    if (!loading && user) {
      router.replace(next.startsWith("/") ? next : "/villages");
      router.refresh();
    }
  }, [loading, user, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          setMessage(res.error);
          return;
        }
        router.replace(next.startsWith("/") ? next : "/villages");
        router.refresh();
        return;
      }

      if (password.length < 6) {
        setMessage("Şifre en az 6 karakter olmalı.");
        return;
      }
      if (password !== confirm) {
        setMessage("Şifreler eşleşmiyor.");
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        setMessage("Ad ve soyad gerekli.");
        return;
      }

      const res = await signUpWithPassword({
        email,
        password,
        firstName,
        lastName,
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      if (res.needsConfirm) {
        setMessage("Kayıt alındı. E-postanızdaki bağlantıyı onaylayın.");
        setMode("login");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/villages");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setMessage(null);
    setBusy(true);
    const res = await signInWithGoogle(next.startsWith("/") ? next : "/villages");
    if (res.error) {
      setMessage(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[72dvh] max-w-[420px] flex-col justify-center py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_center,rgba(91,107,124,0.12),transparent_70%)]"
      />

      <div className="relative animate-fade-up rounded-[20px] border border-border-soft bg-bg-surface p-7 shadow-[var(--shadow)] sm:p-8">
        <Logo size={32} className="mb-7" />

        <div className="mb-6 flex rounded-full bg-bg-elevated p-1">
          {(
            [
              ["login", "Giriş yap"],
              ["register", "Kayıt ol"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setMessage(null);
              }}
              className={cn(
                "flex-1 rounded-full py-2 text-[13px] font-medium transition",
                mode === key
                  ? "bg-bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <h1 className="text-[24px] font-semibold tracking-[-0.035em]">
          {mode === "login" ? "Hesabına giriş yap" : "Hesap oluştur"}
        </h1>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="firstName"
                autoComplete="given-name"
                placeholder="Ad"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                name="lastName"
                autoComplete="family-name"
                placeholder="Soyad"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          )}
          <Input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {mode === "register" && (
            <Input
              type="password"
              name="confirm"
              autoComplete="new-password"
              placeholder="Şifre tekrar"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          )}

          {message && (
            <p className="rounded-[10px] bg-danger/8 px-3 py-2 text-[13px] text-danger">
              {message}
            </p>
          )}

          <Button type="submit" className="!w-full !py-3" disabled={busy}>
            {mode === "login" ? "Giriş yap" : "Kayıt ol"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-soft" />
          <span className="text-[12px] text-text-tertiary">veya</span>
          <div className="h-px flex-1 bg-border-soft" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="!w-full !rounded-[12px] !py-3 !text-[14px]"
          disabled={busy}
          onClick={() => void onGoogle()}
        >
          <GoogleMark />
          Google ile devam et
        </Button>
      </div>

      <p className="relative mt-5 text-center text-[13px] text-text-secondary">
        <Link href="/villages" className="hover:text-text hover:underline">
          Köylere göz at
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
      <AuthForm />
    </Suspense>
  );
}

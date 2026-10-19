"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, Input, Surface } from "@/components/ui";
import { useLocale } from "@/lib/locale";

export default function HesapPage() {
  const { user, profile, displayName, loading, updateDisplayName } = useAuth();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const avatarUrl =
    profile?.avatar_url ??
    (user?.user_metadata?.avatar_url as string | undefined) ??
    null;
  const initial = (displayName ?? "?").slice(0, 1).toUpperCase();

  useEffect(() => {
    setName(displayName ?? "");
  }, [displayName]);

  if (loading) {
    return (
      <p className="py-16 text-center text-[14px] text-text-secondary">…</p>
    );
  }

  if (!user) {
    return (
      <Surface className="mx-auto max-w-md text-center">
        <p className="text-[15px] text-text-secondary">{t("account.signInRequired")}</p>
        <Link href="/giris?next=/hesap" className="mt-5 inline-block">
          <Button>{t("nav.signIn")}</Button>
        </Link>
      </Surface>
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await updateDisplayName(name);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(t("account.saved"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <h1 className="text-[28px] font-semibold tracking-[-0.04em]">
        {t("account.title")}
      </h1>
      <p className="mt-2 text-[15px] text-text-secondary">{t("account.subtitle")}</p>

      <Surface className="mt-8">
        <div className="mb-6 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-[22px] font-semibold text-accent">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold">{displayName}</p>
            <p className="truncate text-[13px] text-text-secondary">{user.email}</p>
          </div>
        </div>

        <form onSubmit={(e) => void onSave(e)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">
              {t("account.displayName")}
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-text-secondary">
              {t("account.email")}
            </span>
            <Input value={user.email ?? ""} readOnly disabled />
          </label>

          {error && (
            <p className="rounded-[10px] bg-danger/8 px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-[10px] bg-success/10 px-3 py-2 text-[13px] text-success">
              {message}
            </p>
          )}

          <Button type="submit" disabled={busy} className="!px-5">
            {t("account.save")}
          </Button>
        </form>
      </Surface>
    </div>
  );
}

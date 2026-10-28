"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge, Button, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { TreeAccess } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TreeAccessGate({
  villageId,
  villageName,
  access,
}: {
  villageId: string;
  villageName: string;
  access: TreeAccess | null;
}) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestAccess() {
    if (!user) {
      await requireAuth();
      return;
    }
    setBusy(true);
    setError(null);
    const { error: requestError } = await createClient().from("tree_access").insert({
      village_id: villageId,
      user_id: user.id,
      role: "viewer",
      status: "pending",
    });
    setBusy(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    router.refresh();
  }

  const pending = access?.status === "pending";
  const rejected = access?.status === "rejected" || access?.status === "revoked";

  return (
    <Surface className="mx-auto mt-8 max-w-2xl overflow-hidden !p-0 shadow-[0_24px_70px_rgba(18,54,48,0.14)]">
      <div className="border-b border-[#B7D7CE]/60 bg-[radial-gradient(circle_at_top_right,_rgba(155,196,184,0.38),_transparent_42%),linear-gradient(135deg,#0D3B32,#1E6658)] px-6 py-7 text-white sm:px-8">
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-inner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 10V7a6 6 0 0 1 12 0v3M5 10h14v10H5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 14v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">Özel soy ağacı</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.04em]">{villageName} için erişim korumalı</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/78">
          Aile bağları, kişi kayıtları ve ilişki haritası kamuya açık değildir. Bu alan, veri sahiplerinin izniyle görüntülenir.
        </p>
      </div>
      <div className="px-6 py-6 sm:px-8">
        <div className="rounded-[16px] border border-[#D8E8E2] bg-[#F4FAF8] p-4 text-[13px] leading-relaxed text-[#31584E]">
          KVKK ve kişisel verilerin korunmasına ilişkin ilkeler gereği, aile bilgileri yalnızca yetkilendirilmiş kişilere açılır. Erişim talebiniz kayıt sahibine iletilir; onay sonrası burada görüntüleyebilirsiniz.
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {pending ? (
            <Badge tone="accent">Talebiniz incelemede</Badge>
          ) : rejected ? (
            <Badge tone="warn">Erişim şu an açık değil</Badge>
          ) : (
            <Button disabled={busy} onClick={() => void requestAccess()}>
              {busy ? "Talep gönderiliyor…" : user ? "Erişim talep et" : "Giriş yap ve talep et"}
            </Button>
          )}
          <span className="text-[12px] text-text-tertiary">Yetki verildiğinde sayfa otomatik olarak açılır.</span>
        </div>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
      </div>
    </Surface>
  );
}

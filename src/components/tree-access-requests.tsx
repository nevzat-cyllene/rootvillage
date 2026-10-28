"use client";

import { Badge, Button, EmptyState, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { TreeAccess, TreeAccessRole } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TreeAccessRequests({ requests }: { requests: TreeAccess[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(request: TreeAccess, status: "approved" | "rejected", role: TreeAccessRole = "viewer") {
    setBusyId(request.id);
    const { data: { user } } = await createClient().auth.getUser();
    if (user) {
      await createClient().from("tree_access").update({
        status,
        role,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      }).eq("id", request.id);
    }
    setBusyId(null);
    router.refresh();
  }

  if (!requests.length) {
    return <EmptyState title="Bekleyen erişim talebi yok" description="Kayıtlı kullanıcıların soy ağacı erişim talepleri burada görünür." />;
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#286F61]">Gizli erişim</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em]">Soy ağacı talepleri</h2>
        </div>
        <Badge tone="accent">{requests.length} bekliyor</Badge>
      </div>
      <ul className="space-y-3">
        {requests.map((request) => (
          <li key={request.id}>
            <Surface>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold">{request.profile?.display_name ?? "Kayıtlı kullanıcı"}</p>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    {request.village?.name ?? "Köy"} · {relativeTime(request.requested_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busyId === request.id} onClick={() => void decide(request, "approved", "viewer")}>Görüntüleme izni ver</Button>
                  <Button variant="secondary" disabled={busyId === request.id} onClick={() => void decide(request, "approved", "contributor")}>Katkı izni ver</Button>
                  <Button variant="ghost" disabled={busyId === request.id} onClick={() => void decide(request, "rejected")}>Reddet</Button>
                </div>
              </div>
            </Surface>
          </li>
        ))}
      </ul>
    </section>
  );
}

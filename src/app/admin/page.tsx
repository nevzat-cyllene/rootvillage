import { redirect } from "next/navigation";
import { AdminProposals } from "@/components/admin-proposals";
import { PageHeader, Surface } from "@/components/ui";
import { getCurrentProfile, getPendingProposals } from "@/lib/data";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/");

  const proposals = await getPendingProposals();

  return (
    <div>
      <PageHeader
        eyebrow="Yönetim"
        title="Öneri kuyruğu"
        description="Bekleyen düzeltme ve kaldırma taleplerini onayla veya reddet."
      />
      <Surface className="mb-6">
        <p className="text-[13px] text-text-secondary">
          Admin yapmak için Supabase SQL:{" "}
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[12px]">
            update profiles set role = &apos;admin&apos; where id = &apos;SENIN_UUID&apos;;
          </code>
        </p>
      </Surface>
      <AdminProposals proposals={proposals} />
    </div>
  );
}

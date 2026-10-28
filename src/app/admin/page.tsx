import { redirect } from "next/navigation";
import { AdminProposals } from "@/components/admin-proposals";
import { TreeAccessRequests } from "@/components/tree-access-requests";
import { PageHeader, Surface } from "@/components/ui";
import {
  getCurrentProfile,
  getPendingProposals,
  getPendingTreeAccessRequests,
} from "@/lib/data";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const [proposals, accessRequests] = await Promise.all([
    getPendingProposals(),
    getPendingTreeAccessRequests(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Yönetim"
        title="Özel veri kontrolü"
        description="Soy ağacı erişimlerini ve katkı önerilerini tek yerden yönet."
      />
      <Surface className="mb-6">
        <p className="text-[13px] text-text-secondary">
          Yönetici yetkisi yalnızca nevzatkyak5@gmail.com hesabına bağlıdır. Soy ağacı erişimleri ve katkı izinleri aşağıdan onaylanır.
        </p>
      </Surface>
      <TreeAccessRequests requests={accessRequests} />
      <div className="mt-10">
        <AdminProposals proposals={proposals} />
      </div>
    </div>
  );
}

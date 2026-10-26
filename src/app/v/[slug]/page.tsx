import { Suspense } from "react";
import { notFound } from "next/navigation";
import { VillageWorkspace } from "@/components/village-workspace";
import { getFamiliesByVillage, getVillageBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await getVillageBySlug(slug);
  if (!village) return { title: "Köy bulunamadı" };
  return {
    title: village.name,
    description: village.description ?? `${village.name} aileleri ve ataları`,
  };
}

export default async function VillagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await getVillageBySlug(slug);
  if (!village) notFound();

  const families = await getFamiliesByVillage(village.id);

  return (
    <Suspense fallback={<div className="p-6 text-[13px] text-text-secondary">Köy yükleniyor…</div>}>
      <VillageWorkspace
        villageId={village.id}
        villageName={village.name}
        villageTurkishName={village.name_tr}
        families={families}
      />
    </Suspense>
  );
}

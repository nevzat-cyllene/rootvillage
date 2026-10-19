import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsPanel } from "@/components/comments-panel";
import { CreateFamilyForm } from "@/components/create-family-form";
import { ShareButton } from "@/components/share-button";
import { Badge, EmptyState, PageHeader, Surface } from "@/components/ui";
import { getComments, getFamiliesByVillage, getVillageBySlug } from "@/lib/data";

export const revalidate = 30;

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

  const [families, comments] = await Promise.all([
    getFamiliesByVillage(village.id),
    getComments("village", village.id),
  ]);

  const incomplete = families.filter((f) => f.is_incomplete || (f.people_count ?? 0) === 0);

  return (
    <div>
      <PageHeader
        eyebrow="Köy"
        title={village.name}
        description={
          village.description ??
          "Bu köydeki aile kayıtları. Eksik bir alan varsa paylaşarak tamamlanabilir."
        }
        actions={
          <ShareButton
            title={`${village.name} · RootVillage`}
            text={`${village.name} aile kayıtları · RootVillage`}
            label="Köyü paylaş"
          />
        }
      />

      {incomplete.length > 0 && (
        <Surface className="mb-8 border-dashed !border-[#e5d7b8] !bg-[#fffbf2]">
          <p className="text-[14px] font-semibold tracking-[-0.02em]">Tamamlanmamış aileler</p>
          <p className="mt-1 text-[13px] text-text-secondary">
            Bu kayıtlarda henüz kişi yok. İlgili kişilere ileterek doldurulabilir.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {incomplete.slice(0, 8).map((f) => (
              <li key={f.id}>
                <Link
                  href={`/family/${f.id}`}
                  className="inline-flex rounded-full border border-[#ead9a8] bg-white px-3 py-1 text-[13px] font-medium"
                >
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">Aileler</h2>
        <p className="text-[13px] text-text-secondary">{families.length} kayıt</p>
      </div>

      {families.length === 0 ? (
        <EmptyState
          title="Henüz aile yok"
          description="İlk aile kaydını ekleyerek başlayın."
        />
      ) : (
        <ul className="stagger mb-10 grid gap-3 sm:grid-cols-2">
          {families.map((f) => (
            <li key={f.id}>
              <Link
                href={`/family/${f.id}`}
                className="pressable block rounded-[var(--radius)] titanium-surface p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{f.name}</h3>
                    {f.aka && (
                      <p className="mt-0.5 text-[12px] text-text-secondary">aka {f.aka}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge>{f.people_count ?? 0} kişi</Badge>
                    {f.disputed && <Badge tone="warn">Tartışmalı</Badge>}
                    {(f.is_incomplete || (f.people_count ?? 0) === 0) && (
                      <Badge tone="accent">Eksik</Badge>
                    )}
                  </div>
                </div>
                {f.notes && (
                  <p className="mt-2 line-clamp-2 text-[13px] text-text-secondary">{f.notes}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Surface className="mb-4">
        <h2 className="mb-1 text-[18px] font-semibold tracking-[-0.02em]">Yeni aile ekle</h2>
        <p className="mb-4 text-[13px] text-text-secondary">
          Aile adını ekle. Kayıtlar sonra düzenlenebilir; kaldırılma talepleri arşivde kalır.
        </p>
        <CreateFamilyForm villageId={village.id} />
      </Surface>

      <CommentsPanel
        targetType="village"
        targetId={village.id}
        initialComments={comments}
      />
    </div>
  );
}

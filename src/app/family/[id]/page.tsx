import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CommentsPanel,
  DisputeToggle,
  SoftDeleteButton,
} from "@/components/comments-panel";
import { CreatePersonForm, EditPersonQuick } from "@/components/create-person-form";
import { PersonRelationStudio } from "@/components/person-relation-studio";
import { ShareButton } from "@/components/share-button";
import { Badge, EmptyState, PageHeader, Surface } from "@/components/ui";
import {
  getComments,
  getFamilyById,
  getPeopleByFamily,
  getRelationsForPeople,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatYearRange } from "@/lib/utils";

export const revalidate = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const family = await getFamilyById(id);
  if (!family) return { title: "Aile bulunamadı" };
  return { title: family.name };
}

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const family = await getFamilyById(id);
  if (!family) notFound();

  const supabase = await createClient();
  const { data: villageRow } = await supabase
    .from("villages")
    .select("name, slug")
    .eq("id", family.village_id)
    .maybeSingle();

  const people = await getPeopleByFamily(family.id);
  const relations = await getRelationsForPeople(people.map((p) => p.id));
  const comments = await getComments("family", family.id);

  const nameById = new Map(people.map((p) => [p.id, p.full_name]));
  const parentsOf = (personId: string) =>
    relations
      .filter((r) => r.person_id === personId && r.relation_type === "parent")
      .map((r) => nameById.get(r.related_person_id))
      .filter(Boolean);

  return (
    <div>
      <div className="mb-3 text-[13px] text-text-secondary">
        {villageRow && (
          <Link href={`/v/${villageRow.slug}`} className="hover:text-text">
            {villageRow.name}
          </Link>
        )}
        <span className="mx-1.5">/</span>
        <span>{family.name}</span>
      </div>

      <PageHeader
        eyebrow="Aile"
        title={family.name}
        description={
          family.notes ??
          (family.aka ? `Aka: ${family.aka}` : "Kişileri ekle, ebeveyn bağla, anı bırak.")
        }
        actions={
          <>
            <ShareButton
              title={`${family.name} ailesi · Dîwan`}
              text={`“${family.name}” aile kaydı · Dîwan`}
              label="Aileyi paylaş"
            />
            <DisputeToggle table="families" id={family.id} disputed={family.disputed} />
            <SoftDeleteButton table="families" id={family.id} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {family.disputed && <Badge tone="warn">Bilgi tartışmalı</Badge>}
        {(family.is_incomplete || people.length === 0) && (
          <Badge tone="accent">Doldurulmayı bekliyor</Badge>
        )}
        <Badge>{people.length} kişi</Badge>
      </div>

      <PersonRelationStudio familyId={family.id} people={people} relations={relations} />

      {people.length === 0 ? (
        <EmptyState
          title="Henüz kimse yok"
          description="Önce aşağıdan ilk kişiyi ekle (kendin, amcan, kim olursa). Sonra ağaçta + Ebeveyn / + Çocuk / + Kardeş ile büyüt."
        />
      ) : (
        <details className="mb-8 rounded-[14px] border border-border-soft bg-bg-surface/80 open:pb-2">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-medium tracking-[-0.02em]">
            Liste görünümü ({people.length})
          </summary>
          <ul className="stagger space-y-2 px-3 pb-3">
            {people.map((p) => {
              const parents = parentsOf(p.id);
              return (
                <li
                  key={p.id}
                  className="rounded-[14px] border border-border-soft bg-bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/person/${p.id}`}
                        className="text-[16px] font-semibold tracking-[-0.02em] hover:underline"
                      >
                        {p.full_name}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-text-secondary">
                        {formatYearRange(p.birth_year, p.death_year)}
                        {parents.length > 0 && ` · ebeveyn: ${parents.join(", ")}`}
                      </p>
                      {p.notes && (
                        <p className="mt-1 text-[13px] text-text-tertiary line-clamp-2">{p.notes}</p>
                      )}
                      {p.disputed && (
                        <div className="mt-2">
                          <Badge tone="warn">Tartışmalı</Badge>
                        </div>
                      )}
                    </div>
                    <EditPersonQuick person={p} />
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <Surface className="mb-4">
        <h2 className="mb-1 text-[18px] font-semibold tracking-[-0.02em]">Kişi ekle</h2>
        <p className="mb-4 text-[13px] text-text-secondary">
          İlk kişiyi buradan ekleyin. İlişkiler harita üzerinden bağlanır.
        </p>
        <CreatePersonForm familyId={family.id} people={people} />
      </Surface>

      <CommentsPanel
        targetType="family"
        targetId={family.id}
        initialComments={comments}
      />
    </div>
  );
}

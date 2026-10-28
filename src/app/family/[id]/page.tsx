import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CommentsPanel,
  DisputeToggle,
  SoftDeleteButton,
} from "@/components/comments-panel";
import { CreatePersonForm } from "@/components/create-person-form";
import { FamilyMembersList } from "@/components/family-members-list";
import { PersonRelationStudio } from "@/components/person-relation-studio";
import { ShareButton } from "@/components/share-button";
import { Badge, EmptyState, PageHeader, Surface } from "@/components/ui";
import {
  getComments,
  getCurrentProfile,
  getFamilyById,
  getPeopleByFamily,
  getRelationshipGraph,
  getTreeAccess,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

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

  const [profile, treeAccess] = await Promise.all([
    getCurrentProfile(),
    getTreeAccess(family.village_id),
  ]);
  const isAdmin = profile?.role === "admin";
  const canPropose = isAdmin || (treeAccess?.status === "approved" && treeAccess.role === "contributor");
  const people = await getPeopleByFamily(family.id);
  const relationshipGraph = await getRelationshipGraph(people);
  const relations = relationshipGraph.relations;
  const comments = await getComments("family", family.id);

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
              title={`${family.name} ailesi · Şop`}
              text={`“${family.name}” aile kaydı · Şop`}
              label="Aileyi paylaş"
            />
            {isAdmin && <DisputeToggle table="families" id={family.id} disputed={family.disputed} />}
            {canPropose && <SoftDeleteButton table="families" id={family.id} />}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {family.disputed && <Badge tone="warn">Bilgi tartışmalı</Badge>}
        {(family.is_incomplete || people.length === 0 || !family.founder_person_id) && (
          <Badge tone="accent">Doldurulmayı bekliyor</Badge>
        )}
        {family.founder_person_id && (
          <Badge tone="accent">
            Kurucu:{" "}
            {people.find((p) => p.id === family.founder_person_id)?.full_name ?? "atanmış"}
          </Badge>
        )}
        <Badge>{people.length} kişi</Badge>
      </div>

      {isAdmin && <PersonRelationStudio
        familyId={family.id}
        people={relationshipGraph.people}
        homePeople={people}
        relations={relations}
        founderPersonId={family.founder_person_id}
      />}

      {people.length === 0 ? (
        <EmptyState
          title="Henüz kimse yok"
          description="İlk eklenen kişi ailenin kurucusu olur (ör. Hacı Mehmet). Sonra onun çocuklarını bağlayın."
        />
      ) : (
        <FamilyMembersList
          familyId={family.id}
          familyName={family.name}
          people={people}
          relations={relations}
          founderPersonId={family.founder_person_id}
          canPropose={canPropose}
        />
      )}

      {isAdmin && <Surface className="mb-4">
        <h2 className="mb-1 text-[18px] font-semibold tracking-[-0.02em]">Kişi ekle</h2>
        <p className="mb-4 text-[13px] text-text-secondary">
          İlk kişi kurucu sayılır. Atlas’ta yalnızca kurucunun çocukları açılır.
        </p>
        <CreatePersonForm familyId={family.id} people={people} />
      </Surface>}

      {canPropose && <CommentsPanel
        targetType="family"
        targetId={family.id}
        initialComments={comments}
      />}
    </div>
  );
}

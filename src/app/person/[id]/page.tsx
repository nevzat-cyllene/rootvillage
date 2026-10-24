import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CommentsPanel,
  DisputeToggle,
  SoftDeleteButton,
} from "@/components/comments-panel";
import { EditPersonQuick } from "@/components/create-person-form";
import { ShareButton } from "@/components/share-button";
import { Badge, PageHeader, Surface } from "@/components/ui";
import {
  getComments,
  getFamilyById,
  getPeopleByFamily,
  getPersonById,
  getRelationsForPeople,
} from "@/lib/data";
import { formatYearRange } from "@/lib/utils";

export const revalidate = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPersonById(id);
  if (!person) return { title: "Kişi bulunamadı" };
  return { title: person.full_name };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPersonById(id);
  if (!person) notFound();

  const family = await getFamilyById(person.family_id);
  const people = family ? await getPeopleByFamily(family.id) : [];
  const relations = await getRelationsForPeople([person.id]);
  const comments = await getComments("person", person.id);

  const nameById = new Map(people.map((p) => [p.id, p.full_name]));
  const parents = relations
    .filter((r) => r.relation_type === "parent")
    .map((r) => ({
      id: r.related_person_id,
      name: nameById.get(r.related_person_id) ?? "Bilinmiyor",
    }));

  return (
    <div>
      <div className="mb-3 text-[13px] text-text-secondary">
        {family && (
          <>
            <Link href={`/family/${family.id}`} className="hover:text-text">
              {family.name}
            </Link>
            <span className="mx-1.5">/</span>
          </>
        )}
        <span>{person.full_name}</span>
      </div>

      <PageHeader
        eyebrow="Kişi"
        title={person.full_name}
        description={formatYearRange(person.birth_year, person.death_year)}
        actions={
          <>
            <ShareButton
              title={`${person.full_name} · Dîwan`}
              text={`${person.full_name} hakkında Dîwan kaydı`}
            />
            <DisputeToggle table="people" id={person.id} disputed={person.disputed} />
            <SoftDeleteButton table="people" id={person.id} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {person.disputed && <Badge tone="warn">Bilgi tartışmalı</Badge>}
        {person.gender && <Badge>{person.gender}</Badge>}
      </div>

      <Surface className="mb-6">
        <h2 className="text-[15px] font-semibold">Notlar</h2>
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-text-secondary">
          {person.notes || "Henüz not yok. Düzenle ile ekleyebilirsin."}
        </p>
        <div className="mt-4">
          <EditPersonQuick person={person} />
        </div>
      </Surface>

      {parents.length > 0 && (
        <Surface className="mb-6">
          <h2 className="text-[15px] font-semibold">Ebeveynler</h2>
          <ul className="mt-3 space-y-2">
            {parents.map((p) => (
              <li key={p.id}>
                <Link href={`/person/${p.id}`} className="text-[14px] font-medium hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <CommentsPanel
        targetType="person"
        targetId={person.id}
        initialComments={comments}
      />
    </div>
  );
}

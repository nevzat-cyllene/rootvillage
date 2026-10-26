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
  getPersonById,
  getRelationshipGraph,
} from "@/lib/data";
import {
  generationKinLabel,
  linksForPerson,
  resolvePersonGeneration,
} from "@/lib/tree";
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
  const relationshipGraph = await getRelationshipGraph([person]);
  const people = relationshipGraph.people;
  const relations = relationshipGraph.relations;
  const comments = await getComments("person", person.id);

  const links = linksForPerson(person.id, people, relations);
  const familyPeople = people.filter((p) => p.family_id === person.family_id);
  const generation = resolvePersonGeneration(
    person.id,
    familyPeople,
    relations,
    new Map(),
    family?.founder_person_id,
  );

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
              title={`${person.full_name} · Şop`}
              text={`${person.full_name} hakkında Şop kaydı`}
            />
            <DisputeToggle table="people" id={person.id} disputed={person.disputed} />
            <SoftDeleteButton table="people" id={person.id} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {person.disputed && <Badge tone="warn">Bilgi tartışmalı</Badge>}
        {person.gender && <Badge>{person.gender}</Badge>}
        <Badge>{generationKinLabel(generation)}</Badge>
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

      {links.parents.length > 0 && (
        <Surface className="mb-6">
          <h2 className="text-[15px] font-semibold">Ebeveynler</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {links.parents.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/person/${p.id}`}
                  className="flex items-center justify-between rounded-[14px] border border-border-soft bg-bg-elevated/50 px-3.5 py-2.5 text-[14px] font-medium transition hover:border-[#9BC4B8]/50 hover:bg-white"
                >
                  <span>{p.full_name}</span>
                  <span className="text-[11px] text-text-tertiary">Ebeveyn</span>
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      {links.children.length > 0 && (
        <Surface className="mb-6">
          <h2 className="text-[15px] font-semibold">Çocuklar</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {links.children.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/person/${p.id}`}
                  className="flex items-center justify-between rounded-[14px] border border-border-soft bg-bg-elevated/50 px-3.5 py-2.5 text-[14px] font-medium transition hover:border-[#9BC4B8]/50 hover:bg-white"
                >
                  <span>{p.full_name}</span>
                  <span className="text-[11px] text-text-tertiary">Çocuk</span>
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

import Link from "next/link";
import { CreateVillageForm } from "@/components/create-village-form";
import { Badge, EmptyState, PageHeader, Surface } from "@/components/ui";
import { getVillages } from "@/lib/data";

export const revalidate = 30;

export default async function VillagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const villages = await getVillages(q);

  return (
    <div>
      <PageHeader
        eyebrow="RootVillage"
        title="Köyler"
        description="Mevcut köyleri keşfedin veya yeni bir köy kaydı oluşturun."
      />

      <form className="mb-8 animate-fade-up">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Köy ara…"
          className="w-full rounded-[14px] border border-border-soft bg-bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-text-secondary focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
        />
      </form>

      {villages.length === 0 ? (
        <EmptyState
          title={q ? "Sonuç yok" : "Henüz köy yok"}
          description={
            q
              ? "Başka bir arama dene veya aşağıdan yeni köy ekle."
              : "İlk köyü sen oluştur — linki akrabalarına at."
          }
        />
      ) : (
        <ul className="stagger mb-10 grid gap-3 sm:grid-cols-2">
          {villages.map((v) => (
            <li key={v.id}>
              <Link
                href={`/v/${v.slug}`}
                className="pressable flex h-full flex-col rounded-[var(--radius)] titanium-surface p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{v.name}</h2>
                  <Badge>{v.family_count ?? 0} aile</Badge>
                </div>
                <p className="mt-2 line-clamp-2 flex-1 text-[13px] text-text-secondary">
                  {v.description || "Aileler ve kişiler bekliyor."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section id="yeni" className="scroll-mt-24">
        <Surface>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Yeni köy ekle</h2>
          <p className="mt-1 mb-4 text-[13px] text-text-secondary">
            Yeni bir köy başlığı aç; aileler ve kişiler onun altında toplanır.
          </p>
          <CreateVillageForm />
        </Surface>
      </section>
    </div>
  );
}

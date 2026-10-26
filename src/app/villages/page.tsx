import Link from "next/link";
import { CreateVillageForm } from "@/components/create-village-form";
import { Badge, Button, EmptyState, PageHeader, Surface } from "@/components/ui";
import { getVillages } from "@/lib/data";

export const revalidate = 30;

const archiveTypes = ["Bölge", "Şehir", "Mezra", "Tarihî yapı", "Olay", "Hikâye", "Alıntı", "Kültürel öğe"];

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
        eyebrow="Yerler · aşiretler · anlatılar"
        title="Köyler ve sülaleler"
        description="Köy kayıtları, ailelerin ve kişilerin bağlandığı ana yapı olarak korunur. Yer ve kültür kayıtları için Hafıza Arşivi genişliyor."
        actions={
          <Link href="/archive">
            <Button variant="secondary">Hafıza Arşivi</Button>
          </Link>
        }
      />

      <form className="mb-8 animate-fade-up">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Köyü yerel veya Türkçe adıyla ara…"
          className="w-full rounded-[14px] border border-border-soft bg-bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-text-secondary focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
        />
      </form>

      {villages.length === 0 ? (
        <EmptyState
          title={q ? "Sonuç yok" : "Henüz köy yok"}
          description={q ? "Başka bir ad deneyin veya aşağıdan ilk köyü ekleyin." : "İlk köyü ekleyin; aileler ve kişiler onun altında toplanır."}
        />
      ) : (
        <ul className="stagger mb-10 grid gap-3 sm:grid-cols-2">
          {villages.map((village) => (
            <li key={village.id}>
              <Link
                href={`/v/${village.slug}`}
                className="pressable flex h-full flex-col rounded-[var(--radius)] titanium-surface p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{village.name}</h2>
                    {village.name_tr && <p className="mt-1 text-[12px] text-text-secondary">{village.name_tr}</p>}
                  </div>
                  <Badge>{village.family_count ?? 0} aile</Badge>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-[13px] text-text-secondary">
                  {village.description || "Aileler ve kişiler bekliyor."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section id="yeni" className="scroll-mt-24 grid items-start gap-5 lg:grid-cols-2">
        <Surface>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">Soy haritası</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em]">Yeni köy ekle</h2>
          <p className="mt-1 mb-5 text-[13px] leading-relaxed text-text-secondary">
            Köy, ailelerin ve kişilerin toplandığı köktür. Yerel/Kürtçe adı ana ad olarak kalır; Türkçe karşılığını ayrıca ekleyebilirsiniz.
          </p>
          <CreateVillageForm />
        </Surface>

        <Surface className="heritage-entry-surface">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">Hafıza Arşivi</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em]">Köyden fazlasını kaydet</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            Bölge, şehir, mezra, tarihî yapı, olay, hikâye ve kültürel dokular ayrı birer arşiv kaydı olabilir. Köy–aile yapısı da olduğu gibi kalır.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {archiveTypes.map((type) => <Badge key={type} tone="accent">{type}</Badge>)}
          </div>
          <Link href="/archive#yeni" className="mt-6 inline-block">
            <Button>Arşive kayıt ekle</Button>
          </Link>
        </Surface>
      </section>
    </div>
  );
}

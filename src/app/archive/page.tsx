import Link from "next/link";
import { CreateHeritageEntryForm } from "@/components/create-heritage-entry-form";
import { HeritageEntryCard } from "@/components/heritage-entry-card";
import { Button, EmptyState, PageHeader, Surface } from "@/components/ui";
import { getHeritageEntries } from "@/lib/data";

export const revalidate = 30;

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const entries = await getHeritageEntries(q);

  return (
    <div>
      <PageHeader
        eyebrow="RootVillage · ortak bellek"
        title="Hafıza Arşivi"
        description="Kürdistan’ın yerlerini, tarihsel olaylarını, anlatılarını ve kültürel mirasını birlikte kayda geçiriyoruz."
        actions={
          <Link href="#yeni">
            <Button>Yeni kayıt ekle</Button>
          </Link>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <form className="mb-6 animate-fade-up">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Yer, olay, kişi veya kültürel öğe ara…"
              className="w-full rounded-[14px] border border-border-soft bg-bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-text-secondary focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </form>

          {entries.length === 0 ? (
            <EmptyState
              title={q ? "Sonuç bulunamadı" : "Arşiv henüz boş"}
              description={
                q
                  ? "Başka bir ad, yer veya Türkçe karşılığını deneyin."
                  : "İlk yer, anlatı veya tarih kaydını ekleyerek ortak belleği başlatın."
              }
            />
          ) : (
            <ul className="stagger grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <HeritageEntryCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside id="yeni" className="scroll-mt-24 lg:sticky lg:top-20">
          <Surface className="heritage-entry-surface">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">Arşive katkı</p>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.03em]">Yeni bir iz bırak</h2>
            <p className="mt-2 mb-5 text-[13px] leading-relaxed text-text-secondary">
              Bölge, şehir, mezra, tarihî yapı, olay, hikâye, alıntı veya kültürel öğe ekleyin.
            </p>
            <CreateHeritageEntryForm />
          </Surface>
        </aside>
      </div>
    </div>
  );
}

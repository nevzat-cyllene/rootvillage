import Link from "next/link";
import { CreateHeritageEntryForm } from "@/components/create-heritage-entry-form";
import { HeritageEntryCard } from "@/components/heritage-entry-card";
import { Button, EmptyState, PageHeader, Surface } from "@/components/ui";
import { getHeritageEntries } from "@/lib/data";
import { heritageLabel } from "@/lib/heritage";
import { heritageEntryTypes, type HeritageEntryType } from "@/lib/types";

export const revalidate = 30;

function parseEntryType(value?: string): HeritageEntryType | undefined {
  if (!value) return undefined;
  return heritageEntryTypes.includes(value as HeritageEntryType)
    ? (value as HeritageEntryType)
    : undefined;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  const entryType = parseEntryType(type);
  const entries = await getHeritageEntries(q, entryType);
  const typeLabel = entryType ? heritageLabel(entryType) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Şop · yaşayan hafıza atlası"
        title={typeLabel ? typeLabel : "Hafıza Arşivi"}
        description={
          typeLabel
            ? `${typeLabel} kayıtlarını görüntülüyorsunuz. Tüm arşive dönmek için üst menüden Arşiv → Tüm arşiv’i seçin.`
            : "Yerleri, tarihsel olayları, anlatıları ve kültürel mirası birlikte kayda geçiriyoruz."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {entryType && (
              <Link href="/archive">
                <Button variant="secondary">Tüm arşiv</Button>
              </Link>
            )}
            <Link href="#yeni">
              <Button>Yeni kayıt ekle</Button>
            </Link>
          </div>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <form className="mb-6 animate-fade-up">
            {entryType && <input type="hidden" name="type" value={entryType} />}
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Yer, olay, kişi veya kültürel öğe ara…"
              className="w-full rounded-[14px] border border-border-soft bg-bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-text-secondary focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </form>

          {entries.length === 0 ? (
            <EmptyState
              title={q || entryType ? "Sonuç bulunamadı" : "Arşiv henüz boş"}
              description={
                q
                  ? "Başka bir ad, yer veya Türkçe karşılığını deneyin."
                  : entryType
                    ? `Bu kategoride henüz kayıt yok. İlk ${typeLabel?.toLowerCase()} kaydını ekleyebilirsiniz.`
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

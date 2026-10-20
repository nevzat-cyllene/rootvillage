import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, Surface } from "@/components/ui";
import { getHeritageEntryBySlug } from "@/lib/data";
import { heritageLabel } from "@/lib/heritage";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getHeritageEntryBySlug(slug);
  if (!entry) return { title: "Kayıt bulunamadı" };
  return {
    title: entry.title,
    description: entry.summary ?? `${entry.title} · RootVillage Hafıza Arşivi`,
  };
}

export default async function HeritageEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getHeritageEntryBySlug(slug);
  if (!entry) notFound();

  const dates =
    entry.year_start || entry.year_end
      ? `${entry.year_start ?? "?"} — ${entry.year_end ?? "?"}`
      : null;

  return (
    <div>
      <Link href="/archive" className="mb-5 inline-flex text-[13px] font-medium text-text-secondary hover:text-text">
        ← Hafıza Arşivi
      </Link>
      <PageHeader
        eyebrow={heritageLabel(entry.entry_type)}
        title={entry.title}
        description={entry.summary ?? undefined}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="accent">{heritageLabel(entry.entry_type)}</Badge>
        {entry.title_tr && <Badge>{entry.title_tr}</Badge>}
        {entry.location_text && <Badge>{entry.location_text}</Badge>}
        {dates && <Badge>{dates}</Badge>}
      </div>

      <Surface className="mb-5">
        <h2 className="text-[15px] font-semibold">Kayıt</h2>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text-secondary">
          {entry.content || entry.summary || "Bu kayıt için henüz ayrıntı eklenmedi."}
        </p>
      </Surface>

      {entry.source_note && (
        <Surface>
          <h2 className="text-[15px] font-semibold">Kaynak / aktarım</h2>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-text-secondary">
            {entry.source_note}
          </p>
        </Surface>
      )}
    </div>
  );
}

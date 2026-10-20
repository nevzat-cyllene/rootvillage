import Link from "next/link";
import { HeritageEntryCard } from "@/components/heritage-entry-card";
import { Logo } from "@/components/logo";
import { SetupBanner } from "@/components/setup-banner";
import { Button } from "@/components/ui";
import { getHeritageEntries, getVillages } from "@/lib/data";

export const revalidate = 60;

const memoryPaths = [
  { label: "Yerler", detail: "Bölge, şehir, köy, mezra ve tarihî yapılar", href: "/archive#yeni" },
  { label: "Soylar", detail: "Aileler, sülaleler, kişiler ve bağları", href: "/villages" },
  { label: "Anlatılar", detail: "Olaylar, tanıklıklar, alıntılar ve kültürel izler", href: "/archive#yeni" },
];

export default async function HomePage() {
  const [villages, entries] = await Promise.all([getVillages(), getHeritageEntries()]);
  const villagePreview = villages.slice(0, 3);
  const entryPreview = entries.slice(0, 2);

  return (
    <div>
      <SetupBanner />
      <section className="heritage-hero relative overflow-hidden rounded-[28px] px-5 py-8 sm:px-10 sm:py-12">
        <div aria-hidden className="heritage-orb heritage-orb-one" />
        <div aria-hidden className="heritage-orb heritage-orb-two" />
        <div className="relative animate-fade-up">
          <Logo size={42} className="mb-8" />
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
            Ortak bellek · canlı arşiv
          </p>
          <h1 className="max-w-4xl text-[40px] font-semibold leading-[1.02] tracking-[-0.05em] text-text sm:text-[62px]">
            Kürdistan’ın hafızasını
            <br />
            birlikte görünür kıl.
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-text-secondary sm:text-[19px]">
            RootVillage; köyleri ve sülaleleri korurken, bölgeleri, şehirleri, tarihsel olayları,
            anlatıları ve kültürel mirası birlikte kayda geçiren yaşayan bir hafıza alanı.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/archive">
              <Button className="!px-5 !py-3 text-[15px]">Hafızayı keşfet</Button>
            </Link>
            <Link href="/archive#yeni">
              <Button variant="secondary" className="!px-5 !py-3 text-[15px]">Yeni kayıt ekle</Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-10 grid gap-2 sm:grid-cols-3">
          {memoryPaths.map((path, index) => (
            <Link key={path.label} href={path.href} className="heritage-path-card pressable">
              <span className="text-[11px] font-semibold text-accent">0{index + 1}</span>
              <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.025em]">{path.label}</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary">{path.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="animate-fade-up">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent">Köy ve sülale</p>
              <h2 className="mt-1 text-[25px] font-semibold tracking-[-0.035em]">Canlı köyler</h2>
            </div>
            <Link href="/villages" className="text-[13px] font-medium text-accent">Tüm köyler →</Link>
          </div>
          {villagePreview.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-bg-surface/70 px-6 py-10 text-center">
              <p className="text-[16px] font-medium">Henüz köy kaydı yok</p>
              <p className="mt-2 text-[14px] text-text-secondary">İlk köyü ekleyerek soy ve yer hafızasını başlatın.</p>
              <Link href="/villages#yeni" className="mt-5 inline-block"><Button>İlk köyü oluştur</Button></Link>
            </div>
          ) : (
            <ul className="stagger grid gap-3 sm:grid-cols-2">
              {villagePreview.map((village) => (
                <li key={village.id}>
                  <Link href={`/v/${village.slug}`} className="pressable block rounded-[var(--radius)] titanium-surface p-5">
                    <p className="text-[17px] font-semibold tracking-[-0.02em]">{village.name}</p>
                    {village.name_tr && <p className="mt-1 text-[12px] text-text-secondary">{village.name_tr}</p>}
                    <p className="mt-3 line-clamp-2 text-[13px] text-text-secondary">
                      {village.description || "Aileler ve kişiler burada toplanıyor."}
                    </p>
                    <p className="mt-4 text-[12px] font-medium text-text-tertiary">{village.family_count ?? 0} aile</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="animate-fade-up">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent">Yeni arşiv</p>
              <h2 className="mt-1 text-[25px] font-semibold tracking-[-0.035em]">Hafızadan izler</h2>
            </div>
            <Link href="/archive" className="text-[13px] font-medium text-accent">Arşive git →</Link>
          </div>
          {entryPreview.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-bg-surface/70 px-6 py-10 text-center">
              <p className="text-[16px] font-medium">Arşiv seni bekliyor</p>
              <p className="mt-2 text-[14px] text-text-secondary">Bir bölge, hikâye veya kültürel öğe ile ilk izi bırak.</p>
              <Link href="/archive#yeni" className="mt-5 inline-block"><Button variant="secondary">Arşive kayıt ekle</Button></Link>
            </div>
          ) : (
            <ul className="stagger space-y-3">
              {entryPreview.map((entry) => (
                <li key={entry.id}><HeritageEntryCard entry={entry} /></li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-14 grid gap-5 border-t border-border-soft pt-10 sm:grid-cols-3">
        {[
          ["Yerel adı koru", "Kürtçe ya da yerel adı ana ad olarak yaz; Türkçe karşılığını hemen altında sakince göster."],
          ["Bağlamı kaydet", "Bir ismin yanına hikâyesini, kaynağını ve bildiğin dönemi ekle; tek başına bir liste olmasın."],
          ["Birlikte doğrula", "Eksik ve tartışmalı bilgileri işaretle; kayıtlar zamanla topluluğun katkısıyla sağlamlaşsın."],
        ].map(([title, text]) => (
          <div key={title}>
            <h3 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

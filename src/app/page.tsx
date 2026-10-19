import Link from "next/link";
import { Logo } from "@/components/logo";
import { SetupBanner } from "@/components/setup-banner";
import { Button } from "@/components/ui";
import { getVillages } from "@/lib/data";

export const revalidate = 60;

export default async function HomePage() {
  const villages = await getVillages();
  const preview = villages.slice(0, 4);

  return (
    <div>
      <SetupBanner />
      <section className="relative overflow-hidden pb-16 pt-6 sm:pb-20 sm:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(ellipse_at_center,rgba(91,107,124,0.12),transparent_65%)]"
        />
        <div className="relative animate-fade-up">
          <Logo size={44} className="mb-8" />
          <h1 className="max-w-3xl text-[42px] font-semibold leading-[1.05] tracking-[-0.045em] text-text sm:text-[56px]">
            Köy hafızasını
            <br />
            görünür kıl.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-text-secondary sm:text-[18px]">
            RootVillage, ataları, akrabaları ve anıları birlikte kaydetmen için.
            Kültürel mirası sonraki nesillere taşı — bilgiyi düzenle,
            ortak bir bellek kur.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/villages">
              <Button className="!px-5 !py-3 text-[15px]">Köyleri keşfet</Button>
            </Link>
            <Link href="/villages#yeni">
              <Button variant="secondary" className="!px-5 !py-3 text-[15px]">
                Yeni köy aç
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="steel-line mb-10" />

      <section className="animate-fade-up">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em]">Canlı köyler</h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              Eksik bir aile varsa paylaş; kayıt birlikte tamamlanır.
            </p>
          </div>
          <Link href="/villages" className="text-[13px] font-medium text-accent">
            Tümü
          </Link>
        </div>

        {preview.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border bg-bg-surface/70 px-6 py-10 text-center">
            <p className="text-[16px] font-medium">Henüz köy yok</p>
            <p className="mt-2 text-[14px] text-text-secondary">
              Veritabanı hazır — ilk köyü oluşturarak arşivi başlatın.
            </p>
            <Link href="/villages#yeni" className="mt-5 inline-block">
              <Button>İlk köyü oluştur</Button>
            </Link>
          </div>
        ) : (
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {preview.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/v/${v.slug}`}
                  className="pressable block rounded-[var(--radius)] titanium-surface p-5"
                >
                  <p className="text-[17px] font-semibold tracking-[-0.02em]">{v.name}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-text-secondary">
                    {v.description || "Aileler ve kişiler burada toplanıyor."}
                  </p>
                  <p className="mt-3 text-[12px] font-medium text-text-tertiary">
                    {v.family_count ?? 0} aile
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          {
            t: "Açık okuma",
            d: "Köy ve aile kayıtları linkle hemen açılır. Gezmek için hesap gerekmez.",
          },
          {
            t: "Katılınca yaz",
            d: "Kişi eklemek, düzeltmek veya yorum bırakmak istediğinde giriş yeterli.",
          },
          {
            t: "Düzenli arşiv",
            d: "Değişiklikler izlenir; belirsiz kayıtlar işaretlenir, silme talepleri gözden geçer.",
          },
        ].map((item) => (
          <div key={item.t} className="animate-fade-up">
            <h3 className="text-[15px] font-semibold tracking-[-0.02em]">{item.t}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{item.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

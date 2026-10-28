import Link from "next/link";
import { Logo } from "@/components/logo";
import { SetupBanner } from "@/components/setup-banner";
import { Button } from "@/components/ui";

const memoryPaths = [
  {
    number: "01",
    label: "Yerler ve kalıntılar",
    detail: "Köyler, eski yer adları, mezralar, yapılar ve bugün yalnızca izi kalan mekânlar.",
    href: "/archive#yeni",
  },
  {
    number: "02",
    label: "Aileler ve göç",
    detail: "Sülaleler, aşiret bağları, kuşaklar ve başka yerlere uzanan aile kolları.",
    href: "/villages",
  },
  {
    number: "03",
    label: "Söz ve edebiyat",
    detail: "Dengbêjler, klamlar, destanlar, masallar, şiirler ve yazılı eserler.",
    href: "/archive#yeni",
  },
  {
    number: "04",
    label: "Tarih ve tanıklık",
    detail: "Olaylar, göçler, fotoğraflar, belgeler ve onları yaşamış insanların anlatıları.",
    href: "/archive#yeni",
  },
];

const familyMapDetails = [
  "İki ailenin hangi kişiler üzerinden birbirine bağlandığını gösterir.",
  "Amca, yeğen, teyze, kuzen ve evlilik bağlarını hesaplar.",
  "Başka bir haneye, köye ya da bölgeye uzanan aile kollarını görünür kılar.",
  "Bir kolun aşiret, bölge ve göç anlatılarını kaynak notlarıyla birlikte tutar.",
  "Tarihi veya doğruluğu kesinleşmemiş bilgileri tartışmalı kayıt olarak ayırır.",
];

const archivePrinciples = [
  {
    title: "Kaynağını göster",
    text: "Bir bilgiye onu aktaran kişiyi, belgeyi, fotoğrafı ya da yayın kaynağını ekle.",
  },
  {
    title: "Belirsizliği saklama",
    text: "Eksik veya çelişkili bilgiyi kesin hükme dönüştürme; görünür biçimde işaretle.",
  },
  {
    title: "Bağlamıyla büyüt",
    text: "Yeni tanıklıklar geldikçe kaydı düzelt, ilişkilendir ve daha anlaşılır hâle getir.",
  },
];

export default function HomePage() {
  return (
    <div>
      <SetupBanner />

      <section className="heritage-hero relative overflow-hidden rounded-[30px] px-5 py-7 sm:px-9 sm:py-9 lg:px-11 lg:py-11">
        <div aria-hidden className="heritage-orb heritage-orb-one" />
        <div aria-hidden className="heritage-orb heritage-orb-two" />

        <div className="relative grid items-center gap-9 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)] lg:gap-12">
          <div className="animate-fade-up">
            <Logo size={44} className="mb-8" />
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.19em] text-accent sm:text-[12px]">
              Kürtlerin yaşayan hafıza atlası
            </p>
            <h1 className="max-w-3xl text-[42px] font-semibold leading-[0.99] tracking-[-0.055em] text-text sm:text-[62px] lg:text-[68px]">
              Geçmiş kaybolmadı.
              <span className="mt-1 block text-[#53685f]">Dağılan izleri birlikte toplayalım.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-[1.75] text-text-secondary sm:text-[18px]">
              Şop; bir yer adını ait olduğu coğrafyaya, bir aileyi uzandığı kollara, bir klamı
              onu taşıyan sese ve bir tarihsel olayı tanıklıklarına yeniden bağlayan ortak dijital
              hafıza alanıdır.
            </p>
            <p className="mt-3 max-w-2xl text-[14px] leading-[1.75] text-text-tertiary sm:text-[15px]">
              Köyleri, eski adları, göç yollarını, fotoğrafları, kalıntıları, gelenekleri,
              destanları ve edebî mirası keşfet; bildiğin parçayı kaynağıyla birlikte arşive ekle.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/archive">
                <Button className="!px-5 !py-3 text-[15px]">Hafıza atlasını keşfet</Button>
              </Link>
              <Link href="/archive#yeni">
                <Button variant="secondary" className="!px-5 !py-3 text-[15px]">Katkı sun</Button>
              </Link>
            </div>
            <div className="mt-7 flex max-w-2xl items-start gap-3 border-t border-[#8ca096]/25 pt-5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4f7867] shadow-[0_0_0_5px_rgba(79,120,103,0.1)]" />
              <p className="text-[12px] leading-relaxed text-text-tertiary sm:text-[13px]">
                Her kayıt bir kaynağa, her bağlantı gerçek bir kişiye, her anlatı ait olduğu yere bağlanır.
              </p>
            </div>
          </div>

          <aside className="memory-context-card animate-fade-up" aria-label="Şop ilişkisel kayıt örneği">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#587064]">
                İlişkisel kayıt
              </p>
              <span className="rounded-full border border-[#80998d]/25 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-[#587064]">
                canlı bağlam
              </span>
            </div>
            <div className="my-6 rounded-[18px] border border-[#71877c]/20 bg-[#203029] px-5 py-5 text-white shadow-[0_18px_44px_rgba(27,48,39,0.17)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Bir anlatı</p>
              <p className="mt-2 text-[19px] font-semibold tracking-[-0.035em]">Tek başına bir metin değildir.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                ["Kim?", "Anlatan kişi · aile"],
                ["Nerede?", "Köy · bölge · eski ad"],
                ["Ne zaman?", "Dönem · olay · göç"],
                ["Neye dayanıyor?", "Tanık · belge · kayıt"],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-[14px] border border-[#71877c]/15 bg-white/72 p-3.5 backdrop-blur">
                  <p className="text-[12px] font-semibold text-text">{title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-text-tertiary">
              Şop bu parçaları birbirine bağlar; kaydı aranabilir, karşılaştırılabilir ve geliştirilebilir kılar.
            </p>
          </aside>
        </div>

        <div className="relative mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {memoryPaths.map((path) => (
            <Link key={path.label} href={path.href} className="heritage-path-card pressable">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[#667d72]">{path.number}</span>
              <h2 className="mt-6 text-[16px] font-semibold tracking-[-0.025em]">{path.label}</h2>
              <p className="mt-2 text-[11px] leading-[1.65] text-text-secondary">{path.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="nasil-calisir" className="mt-16 scroll-mt-20 grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:gap-14">
        <div className="animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Şop nasıl çalışır?</p>
          <h2 className="mt-3 max-w-2xl text-[31px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[40px]">
            Geçmişi yalnızca saklamaz, ilişkileriyle birlikte gösterir.
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.8] text-text-secondary">
            Şop bir isim listesinden veya fotoğraf albümünden ibaret değildir. İnsanları aileleriyle,
            aileleri köyleriyle; köyleri de anlatılar, göçler, gelenekler, edebî eserler, kalıntılar
            ve tarihî olaylarla ilişkilendirir.
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.8] text-text-tertiary">
            Böylece dağınık bilgiler, araştırılabilir ve kuşaklar boyunca geliştirilebilir bir hafıza
            haritasına dönüşür.
          </p>
        </div>

        <div className="rounded-[22px] border border-border-soft bg-bg-surface p-5 shadow-[0_18px_55px_rgba(31,42,36,0.06)] sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Bir kaydın bağlamı</p>
          <div className="mt-5 space-y-4">
            {[
              ["İnsan", "Adı, lakabı, ailesi ve başka kişilerle bağı"],
              ["Yer", "Yerel adı, bugünkü adı, bölgesi ve haritadaki izi"],
              ["Zaman", "Yaşandığı dönem, göç veya tarihsel olay"],
              ["Kaynak", "Tanıklık, fotoğraf, ses kaydı, belge veya yayın"],
            ].map(([title, text], index) => (
              <div key={title} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf3ef] text-[10px] font-semibold text-[#4f7162]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sozlu-hafiza" className="oral-memory-panel relative mt-16 scroll-mt-20 overflow-hidden rounded-[28px] px-5 py-8 text-[#f5f1e8] sm:px-9 sm:py-10">
        <div aria-hidden className="oral-memory-glow" />
        <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-14">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c5ad78]">Sözlü hafızadan ilişkisel arşive</p>
            <h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-[1.12] tracking-[-0.04em] sm:text-[39px]">
              Sözün taşıdığı hafıza, teknolojiyle yeni bir mecra buluyor.
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.85] text-white/68">
              Kürtçe hafızanın önemli bir bölümü, onu kesintisiz taşıyacak kamusal ve kurumsal
              arşivlere yeterince erişemedi. Bu yük çoğu zaman dengbêjlere, yazarlara, aile
              büyüklerine ve yerel hafızaya kaldı. İsimler, göçler, sevdalar, çatışmalar ve yaslar;
              sesle, şiirle ve anlatıyla kuşaktan kuşağa taşındı.
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.85] text-white/68">
              Şop, dengbêjliğin yerini tutma iddiasında değildir. Onun hafızayı kişisinden,
              coğrafyasından ve zamanından koparmadan aktaran yönteminden öğrenir. Sesin yanına
              kaynak, harita, fotoğraf ve ilişki ekler; sözlü aktarımı çağdaş bir kayıt diliyle sürdürür.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["ses", "yer", "dönem", "tanık", "kaynak", "ilişki"].map((item) => (
                <span key={item} className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/65">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[22px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm sm:p-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c5ad78]">Sessiz bir not</p>
              <blockquote className="mt-5 text-[23px] font-medium leading-[1.45] tracking-[-0.035em] text-white/90">
                “Ew koka me ne û em jî şaxê vê kokê ne.”
              </blockquote>
              <p className="mt-4 text-[13px] leading-relaxed text-white/53">
                Onlar bizim kökümüzdür; biz de bu kökün dallarıyız.
              </p>
            </div>
            <a
              href="https://www.rudaw.net/kurmanci/categories/kurdistan/790339"
              target="_blank"
              rel="noreferrer"
              className="mt-8 text-[10px] font-medium text-white/42 transition hover:text-white/75"
            >
              Leyla Zana · Amed Newrozu, 2024 · Kaynağı gör ↗
            </a>
          </div>
        </div>
      </section>

      <section id="aileler" className="mt-16 scroll-mt-20">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Yaşayan toplumsal harita</p>
          <h2 className="mt-3 text-[31px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[40px]">
            Aileler yalnızca birer soy ağacı değildir.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.8] text-text-secondary">
            Şop’ta her aile, köyün içindeki bir <strong className="font-semibold text-text">ocak</strong> olarak görünür.
            Çocuklar, evlilikler ve akrabalıklar eklendikçe aile ağacı büyür; farklı aileler arasındaki
            bağlar görünür hâle gelir.
          </p>
          <p className="mt-3 text-[15px] leading-[1.8] text-text-tertiary">
            Yeni kuşaklarla birlikte ocak gelişir, başka ailelere uzanan kollar belirir ve köyün toplumsal
            yapısı zaman içinde canlı bir haritaya dönüşür.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <article className="rounded-[24px] border border-[#8da196]/25 bg-[#edf3ef] p-6 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#557064]">Somut örnek</p>
            <h3 className="mt-4 text-[23px] font-semibold tracking-[-0.035em]">H. Mehmet ailesinden Hesse Hecî ailesine</h3>
            <p className="mt-4 text-[14px] leading-[1.75] text-[#52645c]">
              H. Mehmet ailesini köy atlasına ekledin. Daha sonra Mehmet’in amcası Hesse Hecî’nin
              ailesini de kaydettin. İki aile arasındaki bağı kişiler üzerinden kurduğunda, Şop yalnızca
              iki ev arasında bir çizgi çekmez; bu kolun kimden ayrıldığını ve nereye uzandığını gösterir.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold text-[#476457]">
              <span className="rounded-full bg-white/75 px-3 py-1.5">H. Mehmet</span>
              <span aria-hidden>⟶</span>
              <span className="rounded-full bg-white/75 px-3 py-1.5">ortak kök</span>
              <span aria-hidden>⟶</span>
              <span className="rounded-full bg-white/75 px-3 py-1.5">Hesse Hecî</span>
            </div>
          </article>

          <article className="rounded-[24px] border border-border-soft bg-bg-surface p-6 shadow-[0_15px_45px_rgba(31,42,36,0.05)] sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">Haritada ne görünür?</p>
            <ul className="mt-5 space-y-4">
              {familyMapDetails.map((detail, index) => (
                <li key={detail} className="flex gap-3 text-[13px] leading-[1.65] text-text-secondary">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border-soft bg-bg-elevated text-[9px] font-semibold text-text-tertiary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {detail}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border-soft pt-5 text-[13px] font-medium leading-relaxed text-text">
              Böylece yalnızca “kim kimin akrabası?” değil; bir kolun hangi kökten, hangi tarihte ve
              hangi coğrafyaya doğru yayıldığı da araştırılabilir.
            </p>
          </article>
        </div>
      </section>

      <section id="edebiyat" className="mt-16 scroll-mt-20 rounded-[26px] border border-border-soft bg-bg-elevated/65 p-5 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Köyün ötesinde</p>
            <h2 className="mt-3 text-[29px] font-semibold leading-[1.15] tracking-[-0.04em] sm:text-[36px]">
              Bir şair, tek bir biyografi kartına sığmaz.
            </h2>
            <p className="mt-5 text-[14px] leading-[1.8] text-text-secondary">
              Cegerxwîn’i kaydetmek yalnızca doğum ve ölüm tarihlerini yazmak değildir. Doğduğu Hesarê’yi,
              ailesinin Bêkend’e uzanan kökünü, Amûdê’ye göçünü, <em>Hawar</em> çevresiyle ilişkisini,
              şiirlerini ve dil çalışmalarını aynı tarihsel bağlamda görebilmektir.
            </p>
            <p className="mt-3 text-[13px] leading-[1.75] text-text-tertiary">
              Şop’un hedeflediği hafıza budur: kişiyi yerden, eseri dilden, anlatıyı döneminden koparmayan
              bir kayıt düzeni.
            </p>
          </div>

          <div className="rounded-[22px] border border-border-soft bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-text-secondary">
              {[
                ["Hesarê", "doğum"],
                ["Bêkend", "aile kökü"],
                ["Amûdê", "göç"],
                ["Hawar", "yayın"],
                ["Şiir ve dil", "eser"],
              ].map(([title, meta], index, all) => (
                <div key={title} className="contents">
                  <div className="min-w-[96px] flex-1 rounded-[13px] border border-border-soft bg-bg-elevated/60 px-3 py-3">
                    <p className="text-[12px] font-semibold text-text">{title}</p>
                    <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-text-tertiary">{meta}</p>
                  </div>
                  {index < all.length - 1 && <span className="text-[#8aa095]" aria-hidden>→</span>}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-border-soft pt-4 text-[10px] text-text-tertiary">
              <a href="https://www.gazeteduvar.com.tr/kitap/2018/06/21/klasik-donemden-yenilikcilige-cegerxwinin-koprusu" target="_blank" rel="noreferrer" className="hover:text-text">
                Cegerxwîn üzerine kaynak ↗
              </a>
              <a href="https://bianet.org/yazi/surgunun-dili-hawar-191409" target="_blank" rel="noreferrer" className="hover:text-text">
                Hawar üzerine kaynak ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="ortak-hafiza" className="mt-16 scroll-mt-20">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Ortak kayıt kültürü</p>
          <h2 className="mt-3 text-[31px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[40px]">
            Hafıza birlikte tamamlanır.
          </h2>
          <p className="mt-5 text-[16px] leading-[1.8] text-text-secondary">
            Bir kişinin adını bilmiyor olabilirsin. Bir başkası lakabını, başka biri eski bir fotoğrafını
            veya hangi aileden geldiğini hatırlayabilir. Şop, farklı kişilerin bildiği parçaları aynı kayıt
            üzerinde bir araya getirir.
          </p>
          <p className="mt-3 text-[15px] leading-[1.8] text-text-tertiary">
            Farklı katkılar karşılaştırılır; eksik, tartışmalı veya doğrulanmayı bekleyen bilgiler açıkça
            belirtilir. Yeni kaynaklar geldikçe kayıt daha ayrıntılı ve güvenilir hâle gelir.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {archivePrinciples.map((item, index) => (
            <article key={item.title} className="rounded-[20px] border border-border-soft bg-bg-surface p-5">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[#668074]">0{index + 1}</span>
              <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.025em]">{item.title}</h3>
              <p className="mt-2 text-[12px] leading-[1.7] text-text-secondary">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}

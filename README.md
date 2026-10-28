# Şop

Kürtlerin yerlerini, ailelerini, anlatılarını ve kültürel mirasını ilişkilendiren yaşayan hafıza atlası.

- Köy → aile → kişi → akrabalık haritası
- Bölge, şehir, mezra, yapı, tarihî olay, hikâye, alıntı ve kültürel öğeler için Hafıza Arşivi
- Yerel/Kürtçe ana ad ile isteğe bağlı Türkçe karşılık
- Herkes okur; ekleme ve düzenleme için Google ile giriş
- PWA, Next.js + Supabase

## Kurulum

```bash
npm install
cp .env.example .env.local
# .env.local içine Supabase anahtarlarını yaz
```

### 1) Supabase SQL

Supabase Dashboard → SQL Editor → sırayla çalıştır:

1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_clan_atlas.sql` (eski 3D atlas konum sütunları; artık kullanılmıyor, geriye dönük uyumluluk için kalır)
3. `supabase/migrations/002_profile_name_meta.sql` (profil adı meta verisi)
4. `supabase/migrations/003_person_avatar.sql` (kişi foto + storage bucket)
5. `supabase/migrations/004_heritage_archive.sql` (hafıza arşivi + çift adlı köyler)
6. `supabase/migrations/005_relation_integrity.sql` (soy ağacı döngü ve yinelenen eş bağlantısı koruması)
7. `supabase/migrations/006_heritage_comments.sql` (arşiv kayıtlarına tanıklık ve kaynak notu yorumları)
8. `supabase/migrations/007_person_generation.sql` (kişinin düzeltilebilir nesil numarası)
9. `supabase/migrations/008_family_founder.sql` (aile kurucusu + kişi/ilişki/aile verisini sıfırlar; köyler kalır)

10. `supabase/migrations/009_private_family_trees.sql` (özel soy ağacı erişimi, yönetici sabitleme ve katkı onayı)
11. `supabase/migrations/010_contributor_tree_writes.sql` (onaylı katkıcılar soy ağacı tuvalinden doğrudan kişi/bağ/aile ekleyebilir)
12. `supabase/migrations/011_admin_only_soft_delete.sql` (aile/kişi soft-delete yalnızca admin; katkıcılar silme önerisi gönderir)
13. `supabase/migrations/012_tree_access_profile_fk.sql` (tree_access → profiles FK; admin talep listesi embed’i için)

### Soy ağacı tuvali (Atlas sekmesi)

Köy sayfasındaki **Atlas** sekmesi klasik çizgili soy ağacıdır: her aile ayrı bir kök, nesiller satır satır hizalı, eşler yan yana (evlilik çizgisi), çocuklar ortak bir "bara"dan iner. Kartlar cinsiyete göre renklenir (mavi erkek, gül kadın) ve seçilen referans kişiye göre akrabalık etiketi taşır. Yerleşim `src/lib/pedigree/layout.ts` (ev-birimi tabanlı tidy-tree, d3-hierarchy), akrabalık hesabı `src/lib/pedigree/kinship.ts`. Köyde hiç kişi yokken örnek bir ağaç önizlenir; katkıcılar tek tıkla köye yükleyebilir.

### 2) Google Auth

Detay: `docs/GOOGLE_AUTH_SETUP.md`

- Site: `https://rootvillage.vercel.app`
- **Google Cloud** redirect URI (tek):  
  `https://chfyoorjulkwyplyunco.supabase.co/auth/v1/callback`
- **Supabase** Redirect URLs:  
  `https://rootvillage.vercel.app/auth/callback`
- Providers → Google → Client ID/Secret yapıştır

### 3) Özel soy ağacı erişimi

`009_private_family_trees.sql` uygulandığında yönetici yalnızca `nevzatkyak5@gmail.com` hesabıdır. Köy sayfaları herkese görünür; soy ağacı açılmak istendiğinde kullanıcı giriş yapar ve erişim talebi gönderir. Yönetim ekranından talebi görüntüleme veya katkı önerisi yetkisiyle onaylayabilirsin.

### 4) Geliştirme

```bash
npm run dev
```

### 5) Vercel

GitHub’a push → Vercel import. Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (sadece server; client’a koyma)

## Güvenlik

`SUPABASE_SECRET_KEY` asla `NEXT_PUBLIC_` ile expose edilmez. Chat’te paylaşıldıysa Supabase’te rotate et.

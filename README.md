# Dîwan

Yerlerin, soyların, anlatıların ve kültürel mirasın birlikte kayda geçtiği ortak hafıza platformu.

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
2. `supabase/migrations/002_clan_atlas.sql` (atlas ada konumları)
3. `supabase/migrations/002_profile_name_meta.sql` (profil adı meta verisi)
4. `supabase/migrations/003_person_avatar.sql` (kişi foto + storage bucket)
5. `supabase/migrations/004_heritage_archive.sql` (hafıza arşivi + çift adlı köyler)
6. `supabase/migrations/005_relation_integrity.sql` (soy ağacı döngü ve yinelenen eş bağlantısı koruması)
7. `supabase/migrations/006_heritage_comments.sql` (arşiv kayıtlarına tanıklık ve kaynak notu yorumları)

### 2) Google Auth

Detay: `docs/GOOGLE_AUTH_SETUP.md`

- Site: `https://rootvillage.vercel.app`
- **Google Cloud** redirect URI (tek):  
  `https://chfyoorjulkwyplyunco.supabase.co/auth/v1/callback`
- **Supabase** Redirect URLs:  
  `https://rootvillage.vercel.app/auth/callback`
- Providers → Google → Client ID/Secret yapıştır

### 3) İlk admin

Google ile bir kez giriş yap, sonra SQL:

```sql
update public.profiles set role = 'admin' where id = 'SENIN_USER_UUID';
```

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

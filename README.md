# RootVillage

Köy hafızasını görünür kıl — aileler, atalar ve anılar için kültürel miras uygulaması.

- Herkes okur
- Ekleme / düzenleme / yorum → Google ile giriş
- Çoklu köy, aile, kişi, yorum, silme önerileri
- PWA (Ana ekrana ekle)
- Titanyum-beyaz, hızlı Next.js + Supabase

## Kurulum

```bash
npm install
cp .env.example .env.local
# .env.local içine Supabase anahtarlarını yaz
```

### 1) Supabase SQL

Supabase Dashboard → SQL Editor → `supabase/migrations/001_init.sql` dosyasının tamamını çalıştır.

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

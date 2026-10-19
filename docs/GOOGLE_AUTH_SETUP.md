# Google ile giriş — RootVillage

Site: **https://rootvillage.vercel.app**  
Supabase: `chfyoorjulkwyplyunco`

> **Kayıt ayrı değil.** Google ile devam = ilk seferde otomatik hesap + profil oluşur.

## 1) Google Cloud — OAuth client
https://console.cloud.google.com/apis/credentials

**Authorized JavaScript origins**
```
https://rootvillage.vercel.app
```

**Authorized redirect URIs**
```
https://chfyoorjulkwyplyunco.supabase.co/auth/v1/callback
```

## 2) Google Cloud — Marka (profesyonel consent ekranı)
https://console.cloud.google.com/auth/branding

Burayı doldurmazsan Google “Sign in to chfyoorjulkwyplyunco.supabase.co” gösterir — amatör durur.

| Alan | Değer |
|------|--------|
| App name | `RootVillage` |
| User support email | senin mailin |
| App logo | RootVillage ikonu (kare, net) |
| Application home page | `https://rootvillage.vercel.app` |
| Privacy / Terms | varsa ekle; yoksa şimdilik home page |
| Authorized domains | `rootvillage.vercel.app` + `supabase.co` |

**Publish** / brand verification gönder (birkaç gün sürebilir). Doğrulanınca isim + logo öne çıkar.

## 3) Supabase
https://supabase.com/dashboard/project/chfyoorjulkwyplyunco/auth/providers

- Providers → Google → Enable → Client ID/Secret
- Site URL: `https://rootvillage.vercel.app`
- Redirect URLs:
```
https://rootvillage.vercel.app/auth/callback
https://rootvillage.vercel.app/**
```

## 4) `supabase.co` yazısını tamamen kaldırmak (SaaS seviyesi)

Google güvenlik gereği **redirect domain**’ini gösterir. Sahte proje ID’si (`chfyoorjulkwyplyunco…`) oradan geliyor; kodla silinmez.

**Kalıcı çözüm:** Supabase **Custom Domain** (ücretli plan + domain gerekir), örn. `auth.rootvillage.com`

1. Kendi domainini al (örn. `rootvillage.com`)
2. Supabase Dashboard → Settings → Custom Domains → `auth.rootvillage.com` (veya `api.…`)
3. DNS CNAME + doğrulama
4. Google Redirect URI’ye ekle:
   `https://auth.rootvillage.com/auth/v1/callback`
5. (İsteğe bağlı) `NEXT_PUBLIC_SUPABASE_URL`’yi custom domain yap

Ücretsiz ara basamak: **Vanity subdomain** (`rootvillage.supabase.co`) — yine `supabase.co` yazar ama rastgele ID gitmiş olur. Pro plan ister.

## 5) İlk admin

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users order by created_at desc limit 1);
```

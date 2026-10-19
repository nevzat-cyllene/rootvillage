# Google ile giriş — RootVillage

Site: **https://rootvillage.vercel.app**  
Supabase: `chfyoorjulkwyplyunco`

## Google Cloud Console
https://console.cloud.google.com/apis/credentials

**Authorized JavaScript origins**
```
https://rootvillage.vercel.app
```

**Authorized redirect URIs** (sadece bu)
```
https://chfyoorjulkwyplyunco.supabase.co/auth/v1/callback
```

Client ID + Secret kopyala.

## Supabase
https://supabase.com/dashboard/project/chfyoorjulkwyplyunco/auth/providers

**Providers → Google → Enable** → ID/Secret yapıştır.

**URL Configuration**
- Site URL:
```
https://rootvillage.vercel.app
```
- Redirect URLs:
```
https://rootvillage.vercel.app/auth/callback
https://rootvillage.vercel.app/**
```

## İlk admin (bir kez Giriş yaptıktan sonra)

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users order by created_at desc limit 1);
```

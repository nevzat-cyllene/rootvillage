# Google ile giriş — RootVillage

Stack: **Supabase Auth → Google OAuth**. Client ID/Secret sadece Supabase’e gider; uygulamada Google key tutulmaz.

## Senin yapman gerekenler (3 site)

### 1) Google Cloud Console
https://console.cloud.google.com/

1. Proje oluştur (veya seç) → **APIs & Services → Credentials**
2. **Configure OAuth consent screen** → External → App name: `RootVillage`
3. **Create Credentials → OAuth client ID → Web application**
4. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - (Vercel URL gelince) `https://SENIN-PROJE.vercel.app`
5. **Authorized redirect URIs:** (Supabase’ten kopyala — adım 2)
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
6. **Client ID** + **Client Secret**’i kopyala

### 2) Supabase Dashboard
https://supabase.com/dashboard

1. Project seç → **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (prod’da Vercel URL)
   - Redirect URLs: `http://localhost:3000/**` ve `https://SENIN-PROJE.vercel.app/**`
2. **Authentication → Providers → Google → Enable**
   - Client ID + Client Secret yapıştır → Save
3. Callback URL’yi Google’a yapıştırdığından emin ol (yukarıdaki `/auth/v1/callback`)

### 3) Vercel (deploy sonrası)
https://vercel.com/ → proje → **Settings → Environment Variables**

`.env.example`’daki `NEXT_PUBLIC_*` ve `SUPABASE_SERVICE_ROLE_KEY` değerlerini ekle.  
Google Client Secret’ı Vercel’e koyma — sadece Supabase Providers’ta.

## Diğer agent / kod

- `signInWithOAuth({ provider: 'google' })`
- Callback route: `/auth/callback` (code exchange)
- Yazma aksiyonlarında session zorunlu; okuma anon açık

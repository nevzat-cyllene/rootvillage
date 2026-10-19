"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "tr" | "en";

const STORAGE_KEY = "rv_locale";

const messages = {
  tr: {
    "nav.villages": "Köyler",
    "nav.signIn": "Giriş",
    "menu.account": "Hesabım",
    "menu.language": "Dil",
    "menu.admin": "Yönetim",
    "menu.signOut": "Çıkış yap",
    "lang.tr": "Türkçe",
    "lang.en": "English",
    "auth.loginTab": "Giriş yap",
    "auth.registerTab": "Kayıt ol",
    "auth.loginTitle": "Hesabına giriş yap",
    "auth.registerTitle": "Hesap oluştur",
    "auth.firstName": "Ad",
    "auth.lastName": "Soyad",
    "auth.email": "E-posta",
    "auth.password": "Şifre",
    "auth.confirm": "Şifre tekrar",
    "auth.submitLogin": "Giriş yap",
    "auth.submitRegister": "Kayıt ol",
    "auth.or": "veya",
    "auth.google": "Google ile devam et",
    "auth.browse": "Köylere göz at",
    "account.title": "Hesap",
    "account.subtitle": "Profil bilgilerini güncelle.",
    "account.displayName": "Görünen ad",
    "account.email": "E-posta",
    "account.save": "Kaydet",
    "account.saved": "Kaydedildi",
    "account.signInRequired": "Bu sayfa için giriş yapmalısın.",
  },
  en: {
    "nav.villages": "Villages",
    "nav.signIn": "Sign in",
    "menu.account": "Account",
    "menu.language": "Language",
    "menu.admin": "Admin",
    "menu.signOut": "Sign out",
    "lang.tr": "Türkçe",
    "lang.en": "English",
    "auth.loginTab": "Sign in",
    "auth.registerTab": "Sign up",
    "auth.loginTitle": "Sign in to your account",
    "auth.registerTitle": "Create an account",
    "auth.firstName": "First name",
    "auth.lastName": "Last name",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirm": "Confirm password",
    "auth.submitLogin": "Sign in",
    "auth.submitRegister": "Sign up",
    "auth.or": "or",
    "auth.google": "Continue with Google",
    "auth.browse": "Browse villages",
    "account.title": "Account",
    "account.subtitle": "Update your profile details.",
    "account.displayName": "Display name",
    "account.email": "Email",
    "account.save": "Save",
    "account.saved": "Saved",
    "account.signInRequired": "Sign in to view this page.",
  },
} as const;

export type MessageKey = keyof typeof messages.tr;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "tr" || stored === "en") setLocaleState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: MessageKey) => messages[locale][key] ?? messages.tr[key] ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

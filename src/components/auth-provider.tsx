"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  requireAuth: (redirectTo?: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialUser);

  const refreshProfile = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);
      if (data.user) void refreshProfile(data.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void refreshProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const supabase = createClient();
    // Google OAuth = giriş + ilk kez ise otomatik kayıt (ayrı signup yok).
    // next her zaman aynı origin içinde kalsın (başka Vercel app'e kaçmasın).
    let nextPath = "/villages";
    if (redirectTo) {
      try {
        const u = redirectTo.startsWith("http")
          ? new URL(redirectTo)
          : new URL(redirectTo, window.location.origin);
        if (u.origin === window.location.origin) {
          nextPath = `${u.pathname}${u.search}${u.hash}` || "/villages";
        }
      } catch {
        /* keep default */
      }
    } else {
      nextPath = `${window.location.pathname}${window.location.search}` || "/villages";
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      const hint =
        error.message.toLowerCase().includes("provider") ||
        error.message.toLowerCase().includes("not enabled")
          ? "Supabase’te Google girişi henüz açık değil. Dashboard → Authentication → Providers → Google."
          : error.message;
      window.alert(hint);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const requireAuth = useCallback(
    async (redirectTo?: string) => {
      if (user) return true;
      let nextPath = "/villages";
      if (redirectTo) {
        try {
          const u = redirectTo.startsWith("http")
            ? new URL(redirectTo)
            : new URL(redirectTo, window.location.origin);
          if (u.origin === window.location.origin) {
            nextPath = `${u.pathname}${u.search}${u.hash}` || "/villages";
          }
        } catch {
          /* default */
        }
      } else {
        nextPath = `${window.location.pathname}${window.location.search}` || "/villages";
      }
      window.location.assign(`/giris?next=${encodeURIComponent(nextPath)}`);
      return false;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, profile, loading, signInWithGoogle, signOut, requireAuth }),
    [user, profile, loading, signInWithGoogle, signOut, requireAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

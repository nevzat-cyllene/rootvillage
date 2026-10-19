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
  signInWithGoogle: (redirectTo?: string) => Promise<{ error?: string }>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>;
  signUpWithPassword: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  requireAuth: (redirectTo?: string) => Promise<boolean>;
  displayName: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveNextPath(redirectTo?: string): string {
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
  } else if (typeof window !== "undefined") {
    nextPath = `${window.location.pathname}${window.location.search}` || "/villages";
  }
  return nextPath;
}

function nameFromUser(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const full =
    meta.full_name ||
    meta.name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() ||
    meta.given_name;
  if (typeof full === "string" && full.trim()) return full.trim();
  if (user.email) return user.email.split("@")[0] ?? user.email;
  return "Üye";
}

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

    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      const sessionUser = data.session?.user ?? null;
      // #region agent log
      const cookieNames =
        typeof document !== "undefined"
          ? document.cookie
              .split(";")
              .map((c) => c.trim().split("=")[0])
              .filter((n) => n.includes("sb-") || n.includes("auth"))
          : [];
      const params =
        typeof window !== "undefined"
          ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
          : {};
      fetch("http://127.0.0.1:7762/ingest/a3a263e2-4994-425b-8858-1c3468f5f9c3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "337fe7",
        },
        body: JSON.stringify({
          sessionId: "337fe7",
          hypothesisId: "C,D",
          location: "auth-provider.tsx:getSession",
          message: "client getSession after mount",
          data: {
            hasUser: !!sessionUser,
            hasSession: !!data.session,
            sessionErr: error?.message?.slice(0, 100) ?? null,
            cookieNames,
            rv_dbg: params.rv_dbg ?? null,
            rv_ck: params.rv_ck ?? null,
            rv_err: params.rv_err ?? null,
            path: typeof window !== "undefined" ? window.location.pathname : null,
            initialUserWas: !!initialUser,
          },
          timestamp: Date.now(),
          runId: "pre-fix",
        }),
      }).catch(() => {});
      // #endregion
      setUser(sessionUser);
      setLoading(false);
      if (sessionUser) void refreshProfile(sessionUser.id);
      else setProfile(null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // #region agent log
      fetch("http://127.0.0.1:7762/ingest/a3a263e2-4994-425b-8858-1c3468f5f9c3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "337fe7",
        },
        body: JSON.stringify({
          sessionId: "337fe7",
          hypothesisId: "D",
          location: "auth-provider.tsx:onAuthStateChange",
          message: "auth state change",
          data: { event, hasUser: !!session?.user },
          timestamp: Date.now(),
          runId: "pre-fix",
        }),
      }).catch(() => {});
      // #endregion
      setUser(session?.user ?? null);
      if (session?.user) void refreshProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile, initialUser]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const supabase = createClient();
    const nextPath = resolveNextPath(redirectTo);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      setUser(data.user);
      void refreshProfile(data.user.id);
    }
    return {};
  }, [refreshProfile]);

  const signUpWithPassword = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      const supabase = createClient();
      const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: fullName,
            first_name: input.firstName.trim(),
            last_name: input.lastName.trim(),
            name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/villages`,
        },
      });
      if (error) return { error: error.message };
      if (data.session?.user) {
        setUser(data.session.user);
        void refreshProfile(data.session.user.id);
        return {};
      }
      // Email confirmation açık olabilir
      return { needsConfirm: true };
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const requireAuth = useCallback(
    async (redirectTo?: string) => {
      if (user) return true;
      const nextPath = resolveNextPath(redirectTo);
      window.location.assign(`/giris?next=${encodeURIComponent(nextPath)}`);
      return false;
    },
    [user],
  );

  const displayName =
    profile?.display_name?.trim() || nameFromUser(user);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      requireAuth,
      displayName,
    }),
    [
      user,
      profile,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      requireAuth,
      displayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

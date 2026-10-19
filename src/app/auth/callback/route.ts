import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

function safeInternalPath(next: string | null, origin: string): string {
  if (!next) return "/villages";

  if (next.startsWith("http://") || next.startsWith("https://")) {
    try {
      const url = new URL(next);
      if (url.origin !== origin) return "/villages";
      return `${url.pathname}${url.search}${url.hash}` || "/villages";
    } catch {
      return "/villages";
    }
  }

  if (!next.startsWith("/") || next.startsWith("//")) return "/villages";
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), origin);

  if (!code) {
    return NextResponse.redirect(`${origin}/giris?error=auth`);
  }

  let forward = NextResponse.redirect(`${origin}${next}`);
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        forward = NextResponse.redirect(`${origin}${next}`);
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          forward.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/giris?error=auth`);
  }

  return forward;
}

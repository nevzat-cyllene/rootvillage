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

function redirectWithDbg(
  origin: string,
  path: string,
  dbg: string,
  extra: Record<string, string> = {},
) {
  const url = new URL(path.startsWith("http") ? path : `${origin}${path}`);
  url.searchParams.set("rv_dbg", dbg);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), origin);
  let cookieSetCount = 0;
  const cookieNames: string[] = [];

  if (!code) {
    // #region agent log
    console.log(
      JSON.stringify({
        sessionId: "337fe7",
        hypothesisId: "A",
        location: "callback/route.ts:no-code",
        message: "oauth callback missing code",
        data: {},
        timestamp: Date.now(),
      }),
    );
    // #endregion
    return redirectWithDbg(origin, "/giris", "no_code", { error: "auth" });
  }

  const successUrl = new URL(`${origin}${next}`);
  successUrl.searchParams.set("rv_dbg", "exchange_ok");
  let forward = NextResponse.redirect(successUrl.toString());

  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookieSetCount = cookiesToSet.length;
        cookieNames.push(...cookiesToSet.map((c) => c.name));
        forward = NextResponse.redirect(successUrl.toString());
        successUrl.searchParams.set("rv_ck", String(cookiesToSet.length));
        forward = NextResponse.redirect(successUrl.toString());
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          forward.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  // #region agent log
  console.log(
    JSON.stringify({
      sessionId: "337fe7",
      hypothesisId: "A,B",
      location: "callback/route.ts:exchange",
      message: "oauth exchange result",
      data: {
        ok: !error,
        err: error?.message?.slice(0, 120) ?? null,
        cookieSetCount,
        cookieNames,
      },
      timestamp: Date.now(),
    }),
  );
  // #endregion

  if (error) {
    return redirectWithDbg(origin, "/giris", "exchange_fail", {
      error: "auth",
      rv_err: error.message.slice(0, 80),
      rv_ck: String(cookieSetCount),
    });
  }

  successUrl.searchParams.set("rv_ck", String(cookieSetCount));
  // Ensure final Location carries dbg even if setAll never ran
  if (cookieSetCount === 0) {
    forward = NextResponse.redirect(successUrl.toString());
  }

  return forward;
}

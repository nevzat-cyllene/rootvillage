import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeInternalPath(next: string | null, origin: string): string {
  if (!next) return "/villages";

  // Absolute URL → only allow same origin; strip to path+search+hash
  if (next.startsWith("http://") || next.startsWith("https://")) {
    try {
      const url = new URL(next);
      if (url.origin !== origin) return "/villages";
      return `${url.pathname}${url.search}${url.hash}` || "/villages";
    } catch {
      return "/villages";
    }
  }

  // Relative path only (block protocol-relative //evil.com)
  if (!next.startsWith("/") || next.startsWith("//")) return "/villages";
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/villages?auth=error`);
}

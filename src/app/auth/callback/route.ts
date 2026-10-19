import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/villages";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = next.startsWith("/") || next.startsWith(origin) ? next : "/villages";
      return NextResponse.redirect(
        safeNext.startsWith("http") ? safeNext : `${origin}${safeNext}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/villages?auth=error`);
}

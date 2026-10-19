import { unstable_noStore as noStore } from "next/cache";
import { Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export async function SetupBanner() {
  // Never bake a stale "DB missing" into the static/ISR page.
  noStore();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("villages").select("id").limit(1);
    if (!error) return null;

    const msg = (error.message ?? "").toLowerCase();
    const missing =
      error.code === "PGRST205" ||
      msg.includes("schema cache") ||
      msg.includes("could not find the table") ||
      (msg.includes("relation") && msg.includes("does not exist"));

    if (!missing) return null;

    return (
      <Surface className="mb-8 border-dashed !border-[#e5d7b8] !bg-[#fffbf2]">
        <p className="text-[14px] font-semibold tracking-[-0.02em]">Veritabanı henüz kurulmadı</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Supabase SQL Editor’da{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[12px]">
            supabase/migrations/001_init.sql
          </code>{" "}
          dosyasını çalıştır. Vercel’de{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[12px]">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          + publishable key’in doğru projeye ait olduğundan emin ol, sonra Redeploy et.
        </p>
      </Surface>
    );
  } catch {
    return null;
  }
}
